import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { catchError, switchMap, throwError } from 'rxjs'
import { AUTH_CONFIG, apiRequestPath, isAuthPath } from './auth.config'
import { AUTH_BYPASS } from './auth.backend'
import { SessionStore } from './session.store'

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(AUTH_CONFIG)
  if (!config.configured) return next(request)
  const path = apiRequestPath(request.url, config)
  if (path === null) return next(request)
  if (request.context.get(AUTH_BYPASS) || isAuthPath(path))
    return next(request.clone({ transferCache: false }))
  const session = inject(SessionStore)
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
