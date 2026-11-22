import express, { type Request, type Response, type Router } from 'express'
import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { decodeUser, tenantFromEmail } from '../claims'

export interface AuthBffConfig {
  apiUrl: string
  publicOrigin: string
  apiPublicOrigin: string
  secret: string
  production: boolean
  cookieNamespace?: string
  mobileTenant?: string
}

export interface AuthBffHostDefaults {
  apiUrl: string
  production: boolean
  developmentOrigin: string
  cookieNamespace?: string
}

export interface AuthBffSession {
  user: ReturnType<typeof decodeUser>['user'] & {
    username: string
    email: string
    name: string
  }
  expiresAt: number
}

/** Shared adapters must enforce expiry and atomically replace only existing live sessions. */
export interface AuthSessionStorage {
  create(session: AuthStoredSession): Promise<void>
  get(id: string): Promise<AuthStoredSession | null>
  replace(session: AuthStoredSession): Promise<boolean>
  remove(id: string): Promise<void>
}

export interface AuthBffOptions {
  config: AuthBffConfig
  fetch?: typeof globalThis.fetch
  storage?: AuthSessionStorage
  onDiagnostic?: (diagnostic: AuthDiagnostic) => void
  createTrackingConnection?: (
    hubUrl: string,
    accessTokenFactory: () => Promise<string>,
  ) => AuthBffTrackingConnection
}

export interface AuthBffTrackingConnection {
  state?: string
  on(eventName: string, handler: (...args: unknown[]) => void): void
  onreconnecting?(handler: () => void): void
  onreconnected?(handler: () => void): void
  onclose(handler: () => void): void
  start(): Promise<void>
  stop(): Promise<void>
  invoke?(methodName: string, ...args: unknown[]): Promise<unknown>
}

export interface AuthDiagnostic {
  operation: 'login' | 'session' | 'refresh' | 'logout' | 'proxy' | 'ssr' | 'tracking'
  reason:
    | 'request-failed'
    | 'cookie-missing'
    | 'cookie-invalid'
    | 'session-missing'
    | 'session-expired'
    | 'session-invalid'
    | 'session-changed'
    | 'access-rejected'
    | 'access-forbidden'
    | 'refresh-rejected'
    | 'invalid-token-response'
    | 'upstream-unavailable'
    | 'refresh-started'
    | 'refresh-succeeded'
  status?: number
}

export interface AuthStoredSession {
  id: string
  token: string
  refreshToken: string
  refreshExpiresAt: number
  username: string
  tenant: string
}

class Failure extends Error {
  constructor(
    readonly status: number,
    readonly reason: AuthDiagnostic['reason'] = 'request-failed',
    readonly messages?: string[],
    readonly responseBody?: { code: string; message: string; result: unknown },
  ) {
    super(responseBody?.message ?? messages?.[0] ?? 'Authentication request failed.')
  }
}

function loopback(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

function validateTenant(tenant: string): string {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(tenant)) throw new Error()
  return tenant
}

function sessionTenantMatches(session: AuthStoredSession, mobileTenant?: string): boolean {
  if (session.username.includes('@')) {
    try {
      return session.tenant === tenantFromEmail(session.username)
    } catch {
      return false
    }
  }
  return !!mobileTenant && session.tenant === mobileTenant
}

export function readAuthBffConfig(
  env: NodeJS.ProcessEnv = process.env,
  defaults?: AuthBffHostDefaults,
): AuthBffConfig {
  try {
    // A production bundle must never inherit development defaults from its runtime.
    const mode =
      defaults?.production || env['NODE_ENV'] === 'production'
        ? 'production'
        : (env['NODE_ENV'] ?? (defaults ? 'development' : undefined))
    const development = !!defaults && mode === 'development'
    const api = new URL(env['AUTH_API_URL'] ?? defaults?.apiUrl ?? '')
    const origin = new URL(
      env['AUTH_PUBLIC_ORIGIN'] ?? (development ? defaults.developmentOrigin : ''),
    )
    const secret =
      env['AUTH_SESSION_SECRET'] ?? (development ? randomBytes(32).toString('base64url') : '')
    if (
      !['production', 'development', 'test'].includes(mode ?? '') ||
      Buffer.byteLength(secret) < 32 ||
      api.username ||
      api.password ||
      api.search ||
      api.hash ||
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== '/' ||
      !['http:', 'https:'].includes(api.protocol) ||
      !['http:', 'https:'].includes(origin.protocol) ||
      (api.protocol === 'http:' && !loopback(api.hostname)) ||
      (origin.protocol === 'http:' && (mode === 'production' || !loopback(origin.hostname)))
    )
      throw new Error()
    if (
      defaults?.cookieNamespace !== undefined &&
      !/^[a-z0-9][a-z0-9-]{0,31}$/.test(defaults.cookieNamespace)
    )
      throw new Error()
    const mobileTenant = env['AUTH_MOBILE_TENANT'] ?? (development ? 'root' : undefined)
    return {
      apiUrl: api.href.replace(/\/$/, ''),
      publicOrigin: origin.origin,
      apiPublicOrigin: `${origin.origin}/api`,
      secret,
      production: mode === 'production',
      ...(defaults?.cookieNamespace ? { cookieNamespace: defaults.cookieNamespace } : {}),
      ...(mobileTenant ? { mobileTenant: validateTenant(mobileTenant) } : {}),
    }
  } catch {
    throw new Error('Authentication BFF configuration is missing or invalid.')
  }
}

/** Single-process default: restart signs users out. Replicas need shared storage/refresh coordination. */
export function createMemorySessionStorage(limit = 10_000): AuthSessionStorage {
  const entries = new Map<string, AuthStoredSession>()
  const prune = () => {
    for (const [id, session] of entries)
      if (session.refreshExpiresAt <= Date.now()) entries.delete(id)
  }
  return {
    async create(session) {
      prune()
      if (entries.size >= limit || entries.has(session.id)) throw new Failure(503)
      entries.set(session.id, { ...session })
    },
    async get(id) {
      prune()
      const session = entries.get(id)
      return session ? { ...session } : null
    },
    async replace(session) {
      prune()
      if (!entries.has(session.id) || session.refreshExpiresAt <= Date.now()) return false
      entries.set(session.id, { ...session })
      return true
    },
    async remove(id) {
      entries.delete(id)
    },
  }
}

export function createAuthBff(options: AuthBffOptions): Router & {
  resolveSession(req: Request, res: Response): Promise<AuthBffSession | null>
} {
  // Validate programmatic configuration as strictly as environment configuration.
  const config = readAuthBffConfig(
    {
      AUTH_API_URL: options.config.apiUrl,
      AUTH_PUBLIC_ORIGIN: options.config.publicOrigin,
      AUTH_SESSION_SECRET: options.config.secret,
      ...(options.config.mobileTenant ? { AUTH_MOBILE_TENANT: options.config.mobileTenant } : {}),
      NODE_ENV: options.config.production ? 'production' : 'development',
    },
    {
      apiUrl: options.config.apiUrl,
      production: options.config.production,
      developmentOrigin: options.config.publicOrigin,
      cookieNamespace: options.config.cookieNamespace,
    },
  )
  const fetcher = options.fetch ?? globalThis.fetch
  const storage = options.storage ?? createMemorySessionStorage()
  const maxSessionLifetime = config.production ? 90 * 86_400_000 : 24 * 60 * 60 * 1000
  const trackingConnections = new Map<string, Set<AuthBffTrackingConnection>>()
  const trackingClients = new Map<string, Map<string, AuthBffTrackingConnection>>()
  const trackingSelections = new Map<
    string,
    Map<string, { companyId: number; driverId: number; tripId: number | null }>
  >()
  const report = (diagnostic: AuthDiagnostic) => {
    try {
      options.onDiagnostic?.(diagnostic)
    } catch {
      /* Diagnostics must not affect authentication. */
    }
  }
  const diagnose = (operation: AuthDiagnostic['operation'], error: unknown) =>
    report(
      error instanceof Failure
        ? { operation, reason: error.reason, status: error.status }
        : { operation, reason: 'upstream-unavailable', status: 502 },
    )
  const secure = new URL(config.publicOrigin).protocol === 'https:'
  const cookieSuffix = config.cookieNamespace ? `-${config.cookieNamespace}` : ''
  const cookieName = secure
    ? `__Host-auth-session${cookieSuffix}`
    : `auth-session-dev${cookieSuffix}`
  const flights = new Map<string, { promise: Promise<AuthStoredSession>; expiresAt: number }>()
  const router = express.Router() as Router & {
    resolveSession(req: Request, res: Response): Promise<AuthBffSession | null>
  }
  const allowedConnection = (req: Request) =>
    secure || ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')
  const allowedOrigins = new Set([config.publicOrigin])
  if (!config.production) {
    const publicUrl = new URL(config.publicOrigin)
    if (publicUrl.hostname === 'localhost' && ['4200', '4400'].includes(publicUrl.port)) {
      for (const port of ['4200', '4400']) {
        publicUrl.port = port
        allowedOrigins.add(publicUrl.origin)
      }
    }
  }

  const trackingHubUrl = () => {
    const api = new URL(config.apiUrl)
    api.pathname = `${api.pathname.replace(/\/api\/?$/i, '').replace(/\/$/, '')}/notifications`
    api.search = ''
    api.hash = ''
    return api.href
  }

  const createTrackingConnection = async (session: AuthStoredSession) => {
    const accessTokenFactory = async () => {
      const latest = await storage.get(session.id)
      if (!latest) throw new Failure(401, 'session-missing')
      const expiresAt = decodeUser(latest.token).expiresAt
      const current = expiresAt <= Date.now() + 30_000 ? await refresh(latest) : latest
      return current.token
    }
    if (options.createTrackingConnection)
      return options.createTrackingConnection(trackingHubUrl(), accessTokenFactory)

    const signalR = await import('@microsoft/signalr')
    return new signalR.HubConnectionBuilder()
      .withUrl(trackingHubUrl(), { accessTokenFactory, withCredentials: false })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(config.production ? signalR.LogLevel.Warning : signalR.LogLevel.Information)
      .build()
  }

  const stopTrackingConnections = async (sessionId: string) => {
    const connections = trackingConnections.get(sessionId)
    trackingSelections.delete(sessionId)
    trackingClients.delete(sessionId)
    if (!connections) return
    trackingConnections.delete(sessionId)
    await Promise.all([...connections].map(connection => connection.stop().catch(() => undefined)))
  }

  const clear = (res: Response) =>
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    })
  function sign(id: string): string {
    return createHmac('sha256', config.secret)
      .update(`${config.publicOrigin}:${config.apiUrl}:${cookieName}:${id}`)
      .digest('base64url')
  }
  function write(res: Response, session: AuthStoredSession) {
    res.cookie(cookieName, `${session.id}.${sign(session.id)}`, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.max(0, session.refreshExpiresAt - Date.now()),
    })
  }
  async function read(req: Request): Promise<AuthStoredSession> {
    let id: string
    try {
      const matches = (req.headers.cookie ?? '')
        .split(';')
        .map(x => x.trim())
        .filter(x => x.startsWith(`${cookieName}=`))
      if (matches.length === 0) throw new Failure(401, 'cookie-missing')
      if (matches.length !== 1) throw new Error()
      const value = matches[0].slice(cookieName.length + 1)
      if (!/^[a-f0-9]{64}\.[A-Za-z0-9_-]{43}$/.test(value)) throw new Error()
      const [handle, mac] = value.split('.')
      if (!timingSafeEqual(Buffer.from(mac), Buffer.from(sign(handle)))) throw new Error()
      id = handle
    } catch (error) {
      if (error instanceof Failure) throw error
      throw new Failure(401, 'cookie-invalid')
    }
    const session = await storage.get(id)
    if (!session) throw new Failure(401, 'session-missing')
    if (session.refreshExpiresAt <= Date.now()) throw new Failure(401, 'session-expired')
    if (!sessionTenantMatches(session, config.mobileTenant))
      throw new Failure(401, 'session-invalid')
    return session
  }
  async function upstream(
    path: string,
    tenant: string,
    method = 'GET',
    token?: string,
    body?: BodyInit,
    contentType?: string,
  ): Promise<{ status: number; body: unknown }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
      const headers: Record<string, string> = { Accept: 'application/json', tenant }
      if (token) headers['Authorization'] = `Bearer ${token}`
      if (contentType) headers['Content-Type'] = contentType
      const response = await fetcher(`${config.apiUrl}${path}`, {
        method,
        headers,
        body,
        redirect: 'error',
        signal: controller.signal,
      })
      if (response.status >= 300 && response.status < 400) throw new Failure(502)
      let size = 0
      const chunks: Uint8Array[] = []
      if (response.body) {
        for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
          size += chunk.byteLength
          if (size > 2 * 1024 * 1024) {
            controller.abort()
            throw new Failure(502)
          }
          chunks.push(chunk)
        }
      }
      const text = Buffer.concat(chunks).toString('utf8')
      return { status: response.status, body: text ? JSON.parse(text) : null }
    } catch (error) {
      if (error instanceof Failure) throw error
      throw new Failure(502, 'upstream-unavailable')
    } finally {
      clearTimeout(timeout)
    }
  }
  async function validate(session: AuthStoredSession): Promise<AuthBffSession> {
    const response = await upstream('/personal/permissions', session.tenant, 'GET', session.token)
    if (response.status === 401) throw new Failure(401, 'access-rejected')
    if (response.status === 403) throw new Failure(403, 'access-forbidden')
    const envelope = response.body as { code?: unknown; result?: unknown } | null
    const permissions = Array.isArray(response.body)
      ? response.body
      : envelope?.code === '2000'
        ? envelope.result
        : undefined
    if (
      response.status !== 200 ||
      !Array.isArray(permissions) ||
      !permissions.every(permission => typeof permission === 'string')
    ) {
      throw new Failure(502)
    }
    try {
      const decoded = decodeUser(session.token)
      return {
        expiresAt: Math.min(decoded.expiresAt, session.refreshExpiresAt),
        user: {
          ...decoded.user,
          username: session.username,
          email: session.username.includes('@') ? session.username : '',
          name: [decoded.user.firstName, decoded.user.lastName].filter(Boolean).join(' '),
        },
      }
    } catch {
      throw new Failure(401, 'invalid-token-response')
    }
  }
  function tokens(
    body: unknown,
    username: string,
    id = randomBytes(32).toString('hex'),
    tenant = tenantFromEmail(username),
  ): AuthStoredSession {
    const envelope = body as { code?: unknown; result?: Record<string, unknown> }
    const result = envelope?.result
    const expiry =
      typeof result?.['refreshTokenExpiryTime'] === 'string'
        ? Date.parse(result['refreshTokenExpiryTime'])
        : NaN
    if (
      envelope?.code !== '2000' ||
      typeof result?.['token'] !== 'string' ||
      !result['token'] ||
      result['token'].length > 32_768 ||
      typeof result['refreshToken'] !== 'string' ||
      !result['refreshToken'] ||
      result['refreshToken'].length > 4096 ||
      !Number.isFinite(expiry) ||
      expiry <= Date.now()
    )
      throw new Failure(401, 'invalid-token-response')
    return {
      id,
      token: result['token'],
      refreshToken: result['refreshToken'],
      refreshExpiresAt: Math.min(expiry, Date.now() + maxSessionLifetime),
      username,
      tenant,
    }
  }
  async function refresh(session: AuthStoredSession): Promise<AuthStoredSession> {
    const hash = createHash('sha256').update(session.id).digest('hex')
    let entry = flights.get(hash)
    if (entry && entry.expiresAt <= Date.now()) {
      flights.delete(hash)
      entry = undefined
    }
    if (!entry) {
      for (const [id, item] of flights) if (item.expiresAt <= Date.now()) flights.delete(id)
      if (flights.size >= 256) throw new Failure(503)
      const promise = (async () => {
        const latest = await storage.get(session.id)
        if (!latest) throw new Failure(401, 'session-missing')
        // A late 401 must not rotate an already-replaced refresh token a second time.
        if (latest.token !== session.token || latest.refreshToken !== session.refreshToken)
          return latest
        report({ operation: 'refresh', reason: 'refresh-started' })
        const response = await upstream(
          '/tokens/refresh',
          session.tenant,
          'POST',
          undefined,
          JSON.stringify({ token: session.token, refreshToken: session.refreshToken }),
          'application/json',
        )
        if (response.status !== 200)
          throw new Failure(
            [400, 401, 403].includes(response.status) ? 401 : 502,
            'refresh-rejected',
          )
        const next = tokens(response.body, session.username, session.id, session.tenant)
        // Refresh cannot extend the absolute login lifetime.
        next.refreshExpiresAt = Math.min(next.refreshExpiresAt, session.refreshExpiresAt)
        await validate(next)
        // Atomic replace must never recreate a session deleted by a concurrent logout.
        if (!(await storage.replace(next))) throw new Failure(401, 'session-changed')
        report({ operation: 'refresh', reason: 'refresh-succeeded' })
        return next
      })().catch(async error => {
        diagnose('refresh', error)
        if (error instanceof Failure && error.status === 401) {
          await storage.remove(session.id)
          await stopTrackingConnections(session.id)
        }
        throw error
      })
      entry = { promise, expiresAt: Infinity }
      flights.set(hash, entry)
      const retained = entry
      void promise.then(
        () => {
          // Late concurrent requests can carry the pre-rotation cookie. Retain only briefly.
          retained.expiresAt = Date.now() + 5000
          const timer = setTimeout(() => {
            if (flights.get(hash) === retained) flights.delete(hash)
          }, 5000)
          timer.unref()
        },
        () => flights.delete(hash),
      )
    }
    return entry.promise
  }
  async function current(req: Request, res: Response, forceRefresh = false) {
    let session = await read(req)
    let expired = false
    try {
      decodeUser(session.token)
    } catch {
      expired = true
    }
    let refreshed = forceRefresh || expired
    if (refreshed) {
      session = await refresh(session)
    }
    let metadata: AuthBffSession
    try {
      metadata = await validate(session)
    } catch (error) {
      if (!(error instanceof Failure) || error.reason !== 'access-rejected' || refreshed)
        throw error
      session = await refresh(session)
      refreshed = true
      metadata = await validate(session)
    }
    if (!(await storage.get(session.id))) throw new Failure(401, 'session-changed')
    if (refreshed) write(res, session)
    return { session, metadata, refreshed }
  }
  router.resolveSession = async (req, res) => {
    if (!allowedConnection(req)) return null
    if (!(req.headers.cookie ?? '').includes(`${cookieName}=`)) return null
    try {
      return (await current(req, res)).metadata
    } catch (error) {
      diagnose('ssr', error)
      if (error instanceof Failure && error.status === 401) clear(res)
      return null
    }
  }

  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    // The explicit loopback public origin is the only insecure development mode.
    if (!allowedConnection(req)) {
      res.status(403).json({ messages: ['Request denied.'] })
      return
    }
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (!allowedOrigins.has(req.headers.origin ?? '') || req.headers['x-auth-request'] !== '1')
    ) {
      res.status(403).json({ messages: ['Request denied.'] })
      return
    }
    next()
  })
  router.use(express.raw({ type: () => true, limit: '6mb' }))
  router.use((req, res) => {
    const rawPath = req.url.split('?')[0]
    const operation: AuthDiagnostic['operation'] =
      rawPath === '/auth/login'
        ? 'login'
        : rawPath === '/auth/mobile-login' || rawPath === '/auth/mobile-register'
          ? 'login'
          : rawPath === '/auth/tracking-stream' || rawPath === '/auth/tracking-group'
            ? 'tracking'
            : rawPath === '/auth/mobile-logout'
              ? 'logout'
              : rawPath === '/auth/session'
                ? 'session'
                : rawPath === '/auth/refresh'
                  ? 'refresh'
                  : rawPath === '/auth/logout'
                    ? 'logout'
                    : 'proxy'
    void (async () => {
      if (
        /^\/auth(?:\/|$)/i.test(rawPath) &&
        Buffer.isBuffer(req.body) &&
        req.body.length > 1024 * 1024
      )
        throw new Failure(413)
      // Reject encoded paths altogether: no normalization, traversal or endpoint aliases.
      if (
        !/^\/(?:[A-Za-z0-9_-]+\/?)*$/.test(rawPath) ||
        /^\/(?:tokens(?:\/|$)|personal\/logout(?:\/|$))/i.test(rawPath)
      )
        throw new Failure(404)
      if (req.method === 'POST' && rawPath === '/auth/login') {
        if (!req.is('application/json')) throw new Failure(415)
        let body: { username?: unknown; email?: unknown; password?: unknown }
        try {
          body = JSON.parse(req.body.toString('utf8'))
        } catch {
          throw new Failure(400)
        }
        const loginIdentifier = body?.email ?? body?.username
        if (
          typeof loginIdentifier !== 'string' ||
          (typeof body.email === 'string' && typeof body.username === 'string') ||
          !loginIdentifier.trim() ||
          loginIdentifier.length > 320 ||
          typeof body.password !== 'string' ||
          !body.password ||
          body.password.length > 4096
        ) {
          throw new Failure(400)
        }
        const email = loginIdentifier.trim()
        let tenant: string
        try {
          tenant = tenantFromEmail(email)
        } catch {
          throw new Failure(400)
        }
        const response = await upstream(
          '/tokens/get-by-email/',
          tenant,
          'POST',
          undefined,
          JSON.stringify({ email, password: body.password }),
          'application/json',
        )
        if (response.status !== 200) throw new Failure(response.status === 401 ? 401 : 502)
        const session = tokens(response.body, email)
        const metadata = await validate(session)
        // Reauthentication replaces this browser's previous session, not just its cookie.
        try {
          const previous = await read(req)
          await storage.remove(previous.id)
          await stopTrackingConnections(previous.id)
        } catch (error) {
          if (!(error instanceof Failure && error.status === 401)) throw error
        }
        await storage.create(session)
        write(res, session)
        res.json(metadata)
      } else if (req.method === 'POST' && rawPath === '/auth/mobile-register') {
        if (!config.mobileTenant) throw new Failure(503)
        if (!req.is('application/json')) throw new Failure(415)
        let body: { mobile?: unknown }
        try {
          body = JSON.parse(req.body.toString('utf8'))
        } catch {
          throw new Failure(400)
        }
        if (typeof body?.mobile !== 'string' || !/^\+?\d{11,15}$/.test(body.mobile))
          throw new Failure(400)
        const response = await upstream(
          `/users/mobile-register/${encodeURIComponent(body.mobile)}`,
          config.mobileTenant,
          'POST',
        )
        const envelope = response.body as {
          code?: unknown
          messages?: unknown
          result?: unknown
        } | null
        if (response.status !== 200 || envelope?.code !== '2000') {
          const messages =
            Array.isArray(envelope?.messages) && envelope.messages.every(m => typeof m === 'string')
              ? (envelope.messages as string[])
              : undefined
          throw new Failure(response.status === 429 ? 429 : 502, 'request-failed', messages)
        }
        if (!config.production) {
          res.status(200).json(envelope ?? { code: '2000' })
          return
        }
        res.sendStatus(204)
      } else if (req.method === 'POST' && rawPath === '/auth/mobile-login') {
        if (!config.mobileTenant) throw new Failure(503)
        if (!req.is('application/json')) throw new Failure(415)
        let body: { mobile?: unknown; otp?: unknown }
        try {
          body = JSON.parse(req.body.toString('utf8'))
        } catch {
          throw new Failure(400)
        }
        if (
          typeof body?.mobile !== 'string' ||
          !/^\+?\d{11,15}$/.test(body.mobile) ||
          typeof body.otp !== 'string' ||
          !/^\d{4,8}$/.test(body.otp)
        )
          throw new Failure(400)
        const response = await upstream(
          '/tokens',
          config.mobileTenant,
          'POST',
          undefined,
          JSON.stringify({ mobile: body.mobile, otp: body.otp }),
          'application/json',
        )
        if (response.status !== 200) throw new Failure(response.status === 401 ? 401 : 502)
        const session = tokens(
          response.body,
          body.mobile,
          randomBytes(32).toString('hex'),
          config.mobileTenant,
        )
        const metadata = await validate(session)
        try {
          const previous = await read(req)
          await storage.remove(previous.id)
          await stopTrackingConnections(previous.id)
        } catch (error) {
          if (!(error instanceof Failure && error.status === 401)) throw error
        }
        await storage.create(session)
        write(res, session)
        res.json(metadata)
      } else if (req.method === 'POST' && rawPath === '/auth/logout') {
        clear(res)
        let session: AuthStoredSession
        try {
          session = await read(req)
        } catch (error) {
          if (error instanceof Failure && error.status === 401) {
            res.sendStatus(204)
            return
          }
          throw error
        }
        await storage.remove(session.id)
        await stopTrackingConnections(session.id)
        try {
          await upstream('/personal/logout', session.tenant, 'GET', session.token)
        } catch {
          /* Local logout wins. */
        }
        res.sendStatus(204)
      } else if (req.method === 'POST' && rawPath === '/auth/tracking-group') {
        if (!req.is('application/json')) throw new Failure(415)
        let body: { clientId?: unknown; companyId?: unknown; driverId?: unknown; tripId?: unknown }
        try {
          body = JSON.parse(req.body.toString('utf8'))
        } catch {
          throw new Failure(400)
        }
        if (
          typeof body?.clientId !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.clientId) ||
          !Number.isSafeInteger(body?.companyId) ||
          (body.companyId as number) <= 0 ||
          !Number.isSafeInteger(body?.driverId) ||
          (body.driverId as number) <= 0 ||
          !(
            body.tripId === null ||
            (Number.isSafeInteger(body.tripId) && (body.tripId as number) > 0)
          )
        )
          throw new Failure(400)
        const { session } = await current(req, res)
        const selection = {
          companyId: body.companyId as number,
          driverId: body.driverId as number,
          tripId: body.tripId as number | null,
        }
        const selections = trackingSelections.get(session.id) ?? new Map()
        const previous = selections.get(body.clientId)
        selections.set(body.clientId, selection)
        trackingSelections.set(session.id, selections)
        const connection = trackingClients.get(session.id)?.get(body.clientId)
        try {
          if (connection?.state === 'Connected' && connection.invoke) {
            await connection.invoke(
              'SelectActiveTrip',
              selection.companyId,
              selection.driverId,
              selection.tripId,
            )
          }
        } catch {
          if (previous) selections.set(body.clientId, previous)
          else selections.delete(body.clientId)
          if (!selections.size) trackingSelections.delete(session.id)
          throw new Failure(403, 'access-forbidden')
        }
        res.sendStatus(204)
      } else if (req.method === 'POST' && rawPath === '/auth/mobile-logout') {
        clear(res)
        let session: AuthStoredSession
        try {
          session = await read(req)
        } catch (error) {
          if (error instanceof Failure && error.status === 401) {
            res.sendStatus(204)
            return
          }
          throw error
        }
        await storage.remove(session.id)
        await stopTrackingConnections(session.id)
        try {
          await upstream('/personal/logout', session.tenant, 'GET', session.token)
        } catch {
          /* Local logout wins. */
        }
        res.sendStatus(204)
      } else if (req.method === 'GET' && rawPath === '/auth/tracking-stream') {
        const fetchSite = req.get('sec-fetch-site')
        if (
          (req.get('origin') && req.get('origin') !== config.publicOrigin) ||
          fetchSite === 'cross-site'
        )
          throw new Failure(403, 'access-forbidden')

        const { session } = await current(req, res)
        const requestedClientId = req.query['clientId']
        if (
          requestedClientId !== undefined &&
          (typeof requestedClientId !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              requestedClientId,
            ))
        )
          throw new Failure(400)
        const clientId = typeof requestedClientId === 'string' ? requestedClientId : 'default'
        const connection = await createTrackingConnection(session)
        const sessionConnections =
          trackingConnections.get(session.id) ?? new Set<AuthBffTrackingConnection>()
        sessionConnections.add(connection)
        trackingConnections.set(session.id, sessionConnections)
        const sessionClients =
          trackingClients.get(session.id) ?? new Map<string, AuthBffTrackingConnection>()
        sessionClients.set(clientId, connection)
        trackingClients.set(session.id, sessionClients)
        let connected = false
        let closed = false
        const pending: string[] = []
        const heartbeat = setInterval(() => {
          if (connected && !closed) res.write(': keep-alive\n\n')
        }, 15_000)
        heartbeat.unref?.()
        const send = (typeName: unknown, payload: unknown) => {
          const chunk = `data: ${JSON.stringify({ typeName, payload })}\n\n`
          if (closed) return
          if (!config.production)
            console.info('[SSE] NotificationFromServer received', { typeName, payload })
          if (connected) {
            res.write(chunk)
            if (!config.production)
              console.info('[SSE] Event written to browser response', { typeName })
          } else pending.push(chunk)
        }
        connection.on('NotificationFromServer', (...args: unknown[]) => send(args[0], args[1]))
        connection.onreconnecting?.(() => {
          if (!config.production) console.info('[SSE] Upstream SignalR reconnecting')
        })
        connection.onreconnected?.(() => {
          if (!config.production) console.info('[SSE] Upstream SignalR reconnected')
          const selection = trackingSelections.get(session.id)?.get(clientId)
          if (selection) {
            void connection
              .invoke?.(
                'SelectActiveTrip',
                selection.companyId,
                selection.driverId,
                selection.tripId,
              )
              .catch(() => undefined)
          }
        })
        connection.onclose(() => {
          if (!config.production) console.info('[SSE] Upstream SignalR connection closed')
          if (!res.writableEnded && !res.destroyed) res.end()
        })
        res.on('close', () => {
          closed = true
          if (!config.production) console.info('[SSE] Browser connection closed or aborted')
          clearInterval(heartbeat)
          sessionConnections.delete(connection)
          if (!sessionConnections.size) trackingConnections.delete(session.id)
          if (sessionClients.get(clientId) === connection) sessionClients.delete(clientId)
          if (!sessionClients.size) trackingClients.delete(session.id)
          void connection.stop().catch(() => undefined)
        })
        await connection.start()
        if (closed) return
        const selection = trackingSelections.get(session.id)?.get(clientId)
        if (selection) {
          await connection.invoke?.(
            'SelectActiveTrip',
            selection.companyId,
            selection.driverId,
            selection.tripId,
          )
        }
        if (!config.production) console.info('[SSE] Upstream SignalR connection established')

        res.status(200)
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()
        if (!config.production) console.info('[SSE] Browser stream established')
        res.write('retry: 3000\n\n')
        connected = true
        for (const chunk of pending) {
          res.write(chunk)
          if (!config.production) console.info('[SSE] Buffered event written to browser response')
        }
      } else if (req.method === 'GET' && rawPath === '/auth/session') {
        res.json((await current(req, res)).metadata)
      } else if (req.method === 'POST' && rawPath === '/auth/refresh') {
        res.json((await current(req, res, true)).metadata)
      } else if (/^\/auth(?:\/|$)/i.test(rawPath)) {
        throw new Failure(404)
      } else {
        if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method))
          throw new Failure(405)
        const authenticated = await current(req, res)
        let { session } = authenticated
        const body =
          Buffer.isBuffer(req.body) && req.body.length ? new Uint8Array(req.body) : undefined
        let response = await upstream(
          req.url,
          session.tenant,
          req.method,
          session.token,
          body,
          body ? req.get('content-type') : undefined,
        )
        if (response.status === 401 && !authenticated.refreshed) {
          session = await refresh(session)
          if (!(await storage.get(session.id))) throw new Failure(401, 'session-changed')
          write(res, session)
          response = await upstream(
            req.url,
            session.tenant,
            req.method,
            session.token,
            body,
            body ? req.get('content-type') : undefined,
          )
        }
        if (response.status === 401) {
          await storage.remove(session.id)
          await stopTrackingConnections(session.id)
          throw new Failure(401, 'access-rejected')
        }
        const code = (response.body as { code?: unknown } | null)?.code
        if (response.status >= 400 || (typeof code === 'string' && code !== '2000')) {
          const envelope = response.body as {
            code?: unknown
            massage?: unknown
            result?: unknown
          } | null
          let safeResultData: { code: string; message: string; result: unknown } | undefined
          if (
            response.status >= 400 &&
            response.status < 500 &&
            envelope &&
            typeof envelope.code === 'string' &&
            envelope.code.length > 0 &&
            envelope.code.length <= 32 &&
            Object.prototype.hasOwnProperty.call(envelope, 'result') &&
            typeof envelope.massage === 'string' &&
            envelope.massage.trim().length > 0 &&
            envelope.massage.length <= 512
          ) {
            const codeFirst = /^\d{3,4}$/.test(envelope.code)
            const messageIsCode = /^\d{3,4}$/.test(envelope.massage)
            safeResultData = {
              code: codeFirst ? envelope.code : messageIsCode ? envelope.massage : envelope.code,
              message: codeFirst
                ? envelope.massage
                : messageIsCode
                  ? envelope.code
                  : envelope.massage,
              result: envelope.result,
            }
          }
          throw new Failure(
            response.status >= 400 ? response.status : 502,
            'request-failed',
            safeResultData ? [safeResultData.message] : undefined,
            safeResultData,
          )
        }
        res.status(response.status)
        if (req.method === 'HEAD' || response.status === 204) res.end()
        else res.json(response.body)
      }
    })().catch(error => {
      diagnose(operation, error)
      const status = error instanceof Failure ? error.status : 502
      if (status === 401) clear(res)
      if (error instanceof Failure && error.responseBody) {
        res.status(status).json(error.responseBody)
        return
      }
      const messages =
        error instanceof Failure && status >= 400 && status < 500 && error.messages?.length
          ? error.messages
          : [status === 401 ? 'Authentication required.' : 'Request failed.']
      res.status(status).json({ messages })
    })
  })
  router.use((error: unknown, _req: Request, res: Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(error)
      return
    }
    const status = (error as { status?: number })?.status === 413 ? 413 : 400
    res.status(status).json({ messages: ['Request failed.'] })
  })
  return router
}
