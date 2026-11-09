import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http'
import { PLATFORM_ID, REQUEST, REQUEST_CONTEXT, inject } from '@angular/core'
import { isPlatformServer } from '@angular/common'
import { catchError, switchMap, throwError } from 'rxjs'
import { AUTH_CONFIG, apiRequestPath, isAuthPath } from './auth.config'
import { AUTH_BYPASS, AuthRequestContext } from './auth.backend'
import { SessionStore } from './session.store'

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(AUTH_CONFIG)
  if (!config.configured) return next(request)
  const path = apiRequestPath(request.url, config)
  if (path === null) return next(request)
  if (config.mode === 'cookie' && isPlatformServer(inject(PLATFORM_ID))) {
    const context = inject(REQUEST_CONTEXT, { optional: true }) as AuthRequestContext | null
    const incoming = inject(REQUEST, { optional: true })
    const origin = context?.authApiOrigin
    // Only the SSR host supplies this fixed origin. Never derive it from Host or forwarded headers.
    let trustedOrigin = false
    try {
      trustedOrigin = !!origin && /^https?:\/\//.test(origin) && new URL(origin).origin === origin
    } catch {
      /* Invalid host configuration must not fall back to the incoming request URL. */
    }
    if (!trustedOrigin || !origin || !['GET', 'HEAD'].includes(request.method))
      return throwError(() => new Error('Authenticated SSR API transport is unavailable.'))
    const cookie = (incoming?.headers.get('cookie') ?? '')
      .split(';')
      .map(value => value.trim())
      .filter(value => /^(?:__Host-auth-session|auth-session-dev)=/.test(value))
      .join('; ')
    let headers = request.headers
      .delete('Authorization')
      .delete('tenant')
      .delete('Cookie')
      .set('X-Auth-Request', '1')
    if (cookie) headers = headers.set('Cookie', cookie)
    return next(
      request.clone({
        url: new URL(request.url, origin).href,
        headers,
        transferCache: false,
        redirect: 'error',
        withCredentials: false,
        credentials: 'omit',
      }),
    )
  }
  if (request.context.get(AUTH_BYPASS) || isAuthPath(path))
    return next(request.clone({ transferCache: false }))
  const session = inject(SessionStore)
  if (config.mode === 'cookie') {
    const version = session.version()
    const send = () =>
      next(
        request.clone({
          headers: request.headers
            .delete('Authorization')
            .delete('tenant')
            .set('X-Auth-Request', '1'),
          withCredentials: true,
          credentials: 'same-origin',
          transferCache: false,
          redirect: 'error',
        }),
      ).pipe(session.untilChanged<HttpEvent<unknown>>(version))
    return send().pipe(
      catchError(error => {
        if (
          !(error instanceof HttpErrorResponse) ||
          error.status !== 401 ||
          version !== session.version()
        )
          return throwError(() => error)
        return session.refresh().pipe(
          switchMap(send),
          catchError(failure => {
            if (session.version() === version) session.clear()
            return throwError(() => failure)
          }),
        )
      }),
    )
  }
  if (!session.accessToken()) {
    return next(request.clone({ withCredentials: false, credentials: 'omit' }))
  }
  const version = session.version()
  const authenticated = (token: string) =>
    next(
      request.clone({
        setHeaders: { Authorization: `Bearer ${token}`, tenant: config.tenant },
        withCredentials: config.withCredentials,
        credentials: config.withCredentials ? 'include' : 'omit',
        transferCache: false,
        redirect: 'error',
      }),
    ).pipe(session.untilChanged<HttpEvent<unknown>>(version))
  if (!session.isAuthenticated()) return session.refresh().pipe(switchMap(authenticated))
  const token = session.accessToken() as string
  return authenticated(token).pipe(
    catchError(error => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        version !== session.version()
      )
        return throwError(() => error)
      // A sibling may already have rotated this token before its 401 arrived.
      if (session.accessToken() !== token && session.isAuthenticated())
        return authenticated(session.accessToken() as string)
      // The retry is outside this catchError, so a second 401 is never refreshed again.
      return session.refresh().pipe(switchMap(authenticated))
    }),
  )
}
