import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http'
import { InjectionToken, PLATFORM_ID, REQUEST_CONTEXT, inject } from '@angular/core'
import { isPlatformServer } from '@angular/common'
import { Observable, defer, map, of, throwError } from 'rxjs'
import { AUTH_CONFIG } from './auth.config'
import { AuthUser } from '../claims'

export interface AuthCredentials {
  username: string
  password: string
}
export interface AuthTokens {
  token: string
  refreshToken: string
  refreshTokenExpiryTime: string
}
export interface AuthBackend {
  login(credentials: AuthCredentials): Observable<AuthTokens | AuthSession>
  refresh(tokens: AuthTokens | null): Observable<AuthTokens | AuthSession>
  logout(token: string): Observable<unknown>
  restore?(): Observable<AuthSession | null>
}

/** Public metadata only. Credentials must never be included in this contract. */
export interface AuthSession {
  user: AuthUser
  expiresAt: number
}

/** Supplied by the trusted SSR host per request, never serialized to browser state. */
export interface AuthRequestContext {
  authSession?: AuthSession | null
  authApiOrigin?: string
}

export function validateAuthSession(value: unknown): AuthSession {
  const session = value as AuthSession | null
  const user = session?.user
  if (
    !session ||
    !user ||
    typeof user.id !== 'string' ||
    !user.id.trim() ||
    !Number.isFinite(session.expiresAt) ||
    session.expiresAt <= Date.now() ||
    typeof user.firstName !== 'string' ||
    typeof user.lastName !== 'string' ||
    !Array.isArray(user.roles) ||
    !user.roles.every(role => typeof role === 'string') ||
    ![user.businessEntityId, user.companyId].every(
      id => id === null || (Number.isSafeInteger(id) && (id as number) > 0),
    )
  )
    throw new Error('The authentication server returned an invalid session.')
  return {
    expiresAt: session.expiresAt,
    user: {
      id: user.id,
      businessEntityId: user.businessEntityId,
      companyId: user.companyId,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: [...user.roles],
    },
  }
}

export const AUTH_BYPASS = new HttpContextToken<boolean>(() => false)

function tokensFromEnvelope(value: unknown): AuthTokens {
  const envelope = value as {
    code?: unknown
    result?: Partial<AuthTokens>
  } | null
  const result = envelope?.result
  if (
    envelope?.code !== '2000' ||
    !result ||
    typeof result.token !== 'string' ||
    !result.token ||
    typeof result.refreshToken !== 'string' ||
    !result.refreshToken ||
    typeof result.refreshTokenExpiryTime !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(result.refreshTokenExpiryTime) ||
    !Number.isFinite(Date.parse(result.refreshTokenExpiryTime)) ||
    Date.parse(result.refreshTokenExpiryTime) <= Date.now()
  ) {
    throw new Error('The authentication server returned an invalid session.')
  }
  return {
    token: result.token,
    refreshToken: result.refreshToken,
    refreshTokenExpiryTime: result.refreshTokenExpiryTime,
  }
}

export const AuthBackend = new InjectionToken<AuthBackend>('AuthBackend', {
  providedIn: 'root',
  factory: createDefaultAuthBackend,
})

export function createDefaultAuthBackend(): AuthBackend {
  const http = inject(HttpClient)
  const config = inject(AUTH_CONFIG)
  const server = isPlatformServer(inject(PLATFORM_ID))
  const requestContext = inject(REQUEST_CONTEXT, { optional: true }) as AuthRequestContext | null
  const options = () => ({
    context: new HttpContext().set(AUTH_BYPASS, true),
    headers: { tenant: config.tenant },
    withCredentials: config.withCredentials,
    credentials: config.withCredentials ? ('include' as const) : ('omit' as const),
    transferCache: false as const,
    redirect: 'error' as const,
  })
  const request = <T>(operation: () => Observable<T>): Observable<T> =>
    defer(() =>
      config.configured
        ? operation()
        : throwError(
            () => new Error(config.configurationError ?? 'Authentication is unavailable.'),
          ),
    )
  const base = config.apiUrl.replace(/\/$/, '')
  if (config.mode === 'cookie') {
    const cookieOptions = () => ({
      ...options(),
      withCredentials: true,
      credentials: 'same-origin' as const,
      headers: { 'X-Auth-Request': '1' },
    })
    return {
      login: credentials =>
        request(() =>
          http
            .post<unknown>(`${base}/auth/login`, credentials, cookieOptions())
            .pipe(map(validateAuthSession)),
        ),
      refresh: () =>
        request(() =>
          server
            ? throwError(() => new Error('Server session restoration is unavailable.'))
            : http
                .post<unknown>(`${base}/auth/refresh`, {}, cookieOptions())
                .pipe(map(validateAuthSession)),
        ),
      restore: () =>
        request(() =>
          server
            ? of(
                requestContext?.authSession
                  ? validateAuthSession(requestContext.authSession)
                  : null,
              )
            : http
                .get<unknown>(`${base}/auth/session`, cookieOptions())
                .pipe(map(validateAuthSession)),
        ),
      logout: () => request(() => http.post(`${base}/auth/logout`, {}, cookieOptions())),
    }
  }
  return {
    login: ({ username, password }) =>
      request(() =>
        http
          .post<unknown>(`${base}/tokens/get-by-email`, { email: username, password }, options())
          .pipe(map(tokensFromEnvelope)),
      ),
    refresh: tokens =>
      request(() =>
        http
          .post<unknown>(
            `${base}/tokens/refresh`,
            { token: tokens?.token, refreshToken: tokens?.refreshToken },
            options(),
          )
          .pipe(map(tokensFromEnvelope)),
      ),
    logout: token =>
      request(() =>
        http.get<unknown>(`${base}/personal/logout`, {
          ...options(),
          headers: { ...options().headers, Authorization: `Bearer ${token}` },
        }),
      ),
  }
}
