import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http'
import { InjectionToken, inject } from '@angular/core'
import { Observable, defer, map, throwError } from 'rxjs'
import { AUTH_CONFIG } from './auth.config'

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
  login(credentials: AuthCredentials): Observable<AuthTokens>
  refresh(tokens: AuthTokens): Observable<AuthTokens>
  logout(token: string): Observable<unknown>
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
  return {
    login: ({ username, password }) =>
      request(() =>
        http
          .post<unknown>(`${base}/tokens/get-by-email`, { email: username, password }, options())
          .pipe(map(tokensFromEnvelope)),
      ),
    refresh: ({ token, refreshToken }) =>
      request(() =>
        http
          .post<unknown>(`${base}/tokens/refresh`, { token, refreshToken }, options())
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
