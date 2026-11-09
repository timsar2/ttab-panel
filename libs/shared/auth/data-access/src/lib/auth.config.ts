import { DOCUMENT, isPlatformBrowser } from '@angular/common'
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import {
  EnvironmentProviders,
  InjectionToken,
  PLATFORM_ID,
  inject,
  makeEnvironmentProviders,
} from '@angular/core'
import { SessionStore } from './session.store'
import { authInterceptor } from './auth.interceptor'

export interface AuthConfig {
  apiUrl: string
  tenant?: string
  loginUrl?: string
  afterLoginUrl?: string
  withCredentials?: boolean
  mode?: 'bearer' | 'cookie'
}

export interface NormalizedAuthConfig extends Required<AuthConfig> {
  readonly configured: boolean
  readonly configurationError: string | null
  readonly origin: string | null
  readonly path: string
  readonly baseUri: string | null
}

function unsafeCharacters(value: string): boolean {
  return [...value].some(
    char => char === '\\' || char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127,
  )
}

function localUrl(candidate: unknown): candidate is string {
  if (typeof candidate !== 'string' || !candidate || candidate.trim() !== candidate) return false
  let decoded = candidate
  for (let i = 0; i < 8; i++) {
    if (!decoded.startsWith('/') || decoded.startsWith('//') || unsafeCharacters(decoded))
      return false
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) return true
      decoded = next
    } catch {
      return false
    }
  }
  return false
}

/** Only local router URLs are accepted; login destinations cannot become return loops. */
export function safeReturnUrl(value: unknown, fallback: string, loginUrl = '/login'): string {
  const routePath = (url: string) =>
    url
      .split(/[?#]/, 1)[0]
      .split('/')
      .map(segment => segment.split(';', 1)[0])
      .join('/')
      .replace(/\/+$/, '')
      .toLowerCase()
  const loginPath = routePath(localUrl(loginUrl) ? loginUrl : '/login')
  const safe = (candidate: unknown): candidate is string => {
    if (!localUrl(candidate)) return false
    let decoded = candidate
    for (let i = 0; i < 8; i++) {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    }
    return routePath(decoded) !== loginPath
  }
  return safe(value) ? value : safe(fallback) ? fallback : '/'
}

function normalize(config?: AuthConfig): NormalizedAuthConfig {
  const document = inject(DOCUMENT)
  const browser = isPlatformBrowser(inject(PLATFORM_ID))
  const baseUri = browser ? document.baseURI : null
  const raw = typeof config?.apiUrl === 'string' ? config.apiUrl.trim() : ''
  let apiUrl = ''
  let origin: string | null = null
  let path = ''
  let configurationError: string | null = null
  try {
    if (
      !raw ||
      unsafeCharacters(raw) ||
      /[%?#]/.test(raw) ||
      raw.split('/').some(segment => segment === '.' || segment === '..')
    )
      throw new Error()
    const relative = raw.startsWith('/') && !raw.startsWith('//')
    if (config?.mode === 'cookie' && !relative) throw new Error()
    if (!relative && !/^https?:\/\//i.test(raw)) throw new Error()
    if (relative) {
      path = raw.replace(/\/+$/, '')
      apiUrl = path || '/'
      if (baseUri) origin = new URL(baseUri).origin
    } else {
      const url = new URL(raw)
      if (url.username || url.password || !url.hostname) throw new Error()
      origin = url.origin
      path = url.pathname.replace(/\/+$/, '')
      apiUrl = `${origin}${path}`
    }
    if (path.split('/').some(segment => segment === '.' || segment === '..')) throw new Error()
  } catch {
    apiUrl = ''
    configurationError =
      'Authentication is unavailable: configure a valid HTTP(S) apiUrl or root-relative API path.'
  }
  return Object.freeze({
    apiUrl,
    origin,
    path,
    baseUri,
    configured: !configurationError,
    configurationError,
    tenant: typeof config?.tenant === 'string' ? config.tenant.trim() || 'root' : 'root',
    loginUrl: localUrl(config?.loginUrl) ? config.loginUrl : '/login',
    afterLoginUrl: safeReturnUrl(config?.afterLoginUrl, '/', config?.loginUrl),
    withCredentials: config?.withCredentials === true,
    mode: config?.mode === 'cookie' ? 'cookie' : 'bearer',
  })
}

export const AUTH_CONFIG = new InjectionToken<NormalizedAuthConfig>('AUTH_CONFIG', {
  providedIn: 'root',
  factory: () => normalize(),
})

export function provideAuth(config: AuthConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AUTH_CONFIG, useFactory: () => normalize(config) },
    // Config, session, and the HTTP chain must share a scope; never delegate to a parent session.
    SessionStore,
    provideHttpClient(withInterceptors([authInterceptor])),
  ])
}

export function apiRequestPath(url: string, config: NormalizedAuthConfig): string | null {
  if (!config.configured || unsafeCharacters(url) || url.startsWith('//')) return null
  try {
    let path: string
    if (url.startsWith('/') && !config.baseUri) {
      // SSR must never infer a trusted origin from the incoming Host header.
      if (!config.apiUrl.startsWith('/')) return null
      path = url.split(/[?#]/, 1)[0]
    } else {
      const target = config.baseUri ? new URL(url, config.baseUri) : new URL(url)
      if (target.origin !== config.origin || target.username || target.password) return null
      path = target.pathname
    }
    for (let depth = 0; depth < 8; depth++) {
      if (
        unsafeCharacters(path) ||
        /%(?:2f|5c|2e)/i.test(path) ||
        path.split('/').some(segment => segment === '.' || segment === '..')
      )
        return null
      const decoded = decodeURIComponent(path)
      if (decoded === path) break
      if (depth === 7) return null
      path = decoded
    }
    if (path !== config.path && !path.startsWith(`${config.path}/`)) return null
    return path.slice(config.path.length).replace(/\/+$/, '') || '/'
  } catch {
    return null
  }
}

export function isAuthPath(path: string): boolean {
  return /^\/(?:tokens|auth)(?:\/|$)/i.test(path) || path.toLowerCase() === '/personal/logout'
}
