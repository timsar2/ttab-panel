import express, { type Request, type Response, type Router } from 'express'
import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { decodeUser } from '../claims'

export interface AuthBffConfig {
  apiUrl: string
  publicOrigin: string
  apiPublicOrigin: string
  secret: string
  production: boolean
  tenant: string
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
}

export interface AuthStoredSession {
  id: string
  token: string
  refreshToken: string
  refreshExpiresAt: number
  username: string
}

class Failure extends Error {
  constructor(readonly status: number) {
    super('Authentication request failed.')
  }
}

function loopback(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

export function readAuthBffConfig(env: NodeJS.ProcessEnv = process.env): AuthBffConfig {
  try {
    const api = new URL(env['AUTH_API_URL'] ?? '')
    const origin = new URL(env['AUTH_PUBLIC_ORIGIN'] ?? '')
    const secret = env['AUTH_SESSION_SECRET'] ?? ''
    const mode = env['NODE_ENV']
    const tenant = env['AUTH_TENANT'] ?? 'root'
    if (
      !['production', 'development', 'test'].includes(mode ?? '') ||
      Buffer.byteLength(secret) < 32 ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(tenant) ||
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
    return {
      apiUrl: api.href.replace(/\/$/, ''),
      publicOrigin: origin.origin,
      apiPublicOrigin: `${origin.origin}/api`,
      secret,
      production: mode === 'production',
      tenant,
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
  const config = readAuthBffConfig({
    AUTH_API_URL: options.config.apiUrl,
    AUTH_PUBLIC_ORIGIN: options.config.publicOrigin,
    AUTH_SESSION_SECRET: options.config.secret,
    NODE_ENV: options.config.production ? 'production' : 'development',
    AUTH_TENANT: options.config.tenant,
  })
  const fetcher = options.fetch ?? globalThis.fetch
  const storage = options.storage ?? createMemorySessionStorage()
  const secure = new URL(config.publicOrigin).protocol === 'https:'
  const cookieName = secure ? '__Host-auth-session' : 'auth-session-dev'
  const flights = new Map<string, { promise: Promise<AuthStoredSession>; expiresAt: number }>()
  const router = express.Router() as Router & {
    resolveSession(req: Request, res: Response): Promise<AuthBffSession | null>
  }
  const allowedConnection = (req: Request) =>
    secure || ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')

  const clear = (res: Response) =>
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    })
  function sign(id: string): string {
    return createHmac('sha256', config.secret)
      .update(`${config.publicOrigin}:${config.apiUrl}:${config.tenant}:${cookieName}:${id}`)
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
      if (matches.length !== 1) throw new Error()
      const value = matches[0].slice(cookieName.length + 1)
      if (!/^[a-f0-9]{64}\.[A-Za-z0-9_-]{43}$/.test(value)) throw new Error()
      const [handle, mac] = value.split('.')
      if (!timingSafeEqual(Buffer.from(mac), Buffer.from(sign(handle)))) throw new Error()
      id = handle
    } catch (error) {
      if (error instanceof Failure) throw error
      throw new Failure(401)
    }
    const session = await storage.get(id)
    if (!session || session.refreshExpiresAt <= Date.now()) throw new Failure(401)
    return session
  }
  async function upstream(
    path: string,
    method = 'GET',
    token?: string,
    body?: BodyInit,
    contentType?: string,
  ): Promise<{ status: number; body: unknown }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
      const headers: Record<string, string> = { Accept: 'application/json', tenant: config.tenant }
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
      throw new Failure(502)
    } finally {
      clearTimeout(timeout)
    }
  }
  async function validate(session: AuthStoredSession): Promise<AuthBffSession> {
    const response = await upstream('/personal/permissions', 'GET', session.token)
    if (response.status === 401 || response.status === 403) throw new Failure(401)
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
          email: session.username,
          name: [decoded.user.firstName, decoded.user.lastName].filter(Boolean).join(' '),
        },
      }
    } catch {
      throw new Failure(401)
    }
  }
  function tokens(
    body: unknown,
    username: string,
    id = randomBytes(32).toString('hex'),
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
      throw new Failure(401)
    return {
      id,
      token: result['token'],
      refreshToken: result['refreshToken'],
      refreshExpiresAt: Math.min(expiry, Date.now() + 12 * 60 * 60 * 1000),
      username,
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
        if (!(await storage.get(session.id))) throw new Failure(401)
        const response = await upstream(
          '/tokens/refresh',
          'POST',
          undefined,
          JSON.stringify({ token: session.token, refreshToken: session.refreshToken }),
          'application/json',
        )
        if (response.status !== 200) throw new Failure(response.status === 401 ? 401 : 502)
        const next = tokens(response.body, session.username, session.id)
        // Refresh cannot extend the absolute login lifetime.
        next.refreshExpiresAt = Math.min(next.refreshExpiresAt, session.refreshExpiresAt)
        await validate(next)
        // Atomic replace must never recreate a session deleted by a concurrent logout.
        if (!(await storage.replace(next))) throw new Failure(401)
        return next
      })()
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
    if (forceRefresh || expired) {
      session = await refresh(session)
    }
    const metadata = await validate(session)
    if (!(await storage.get(session.id))) throw new Failure(401)
    if (forceRefresh || expired) write(res, session)
    return { session, metadata }
  }
  router.resolveSession = async (req, res) => {
    if (!allowedConnection(req)) return null
    if (!(req.headers.cookie ?? '').includes(`${cookieName}=`)) return null
    try {
      return (await current(req, res)).metadata
    } catch {
      clear(res)
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
      (req.headers.origin !== config.publicOrigin || req.headers['x-auth-request'] !== '1')
    ) {
      res.status(403).json({ messages: ['Request denied.'] })
      return
    }
    next()
  })
  router.use(express.raw({ type: () => true, limit: '1mb' }))
  router.use((req, res) => {
    void (async () => {
      const rawPath = req.url.split('?')[0]
      // Reject encoded paths altogether: no normalization, traversal or endpoint aliases.
      if (
        !/^\/(?:[A-Za-z0-9_-]+\/?)*$/.test(rawPath) ||
        /^\/(?:tokens(?:\/|$)|personal\/logout(?:\/|$))/i.test(rawPath)
      )
        throw new Failure(404)
      if (req.method === 'POST' && rawPath === '/auth/login') {
        if (!req.is('application/json')) throw new Failure(415)
        let body: { username?: unknown; password?: unknown }
        try {
          body = JSON.parse(req.body.toString('utf8'))
        } catch {
          throw new Failure(400)
        }
        if (
          typeof body?.username !== 'string' ||
          !body.username.trim() ||
          body.username.length > 320 ||
          typeof body.password !== 'string' ||
          !body.password ||
          body.password.length > 4096
        ) {
          throw new Failure(400)
        }
        const response = await upstream(
          '/tokens/get-by-email',
          'POST',
          undefined,
          JSON.stringify({ email: body.username, password: body.password }),
          'application/json',
        )
        if (response.status !== 200) throw new Failure(response.status === 401 ? 401 : 502)
        const session = tokens(response.body, body.username)
        const metadata = await validate(session)
        // Reauthentication replaces this browser's previous session, not just its cookie.
        try {
          const previous = await read(req)
          await storage.remove(previous.id)
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
        try {
          await upstream('/personal/logout', 'GET', session.token)
        } catch {
          /* Local logout wins. */
        }
        res.sendStatus(204)
      } else if (req.method === 'GET' && rawPath === '/auth/session') {
        res.json((await current(req, res)).metadata)
      } else if (req.method === 'POST' && rawPath === '/auth/refresh') {
        res.json((await current(req, res, true)).metadata)
      } else if (/^\/auth(?:\/|$)/i.test(rawPath)) {
        throw new Failure(404)
      } else {
        if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method))
          throw new Failure(405)
        const { session } = await current(req, res)
        const body =
          Buffer.isBuffer(req.body) && req.body.length ? new Uint8Array(req.body) : undefined
        const response = await upstream(
          req.url,
          req.method,
          session.token,
          body,
          body ? req.get('content-type') : undefined,
        )
        const code = (response.body as { code?: unknown } | null)?.code
        if (response.status >= 400 || (typeof code === 'string' && code !== '2000')) {
          throw new Failure(response.status >= 400 ? response.status : 502)
        }
        res.status(response.status)
        if (req.method === 'HEAD' || response.status === 204) res.end()
        else res.json(response.body)
      }
    })().catch(error => {
      const status = error instanceof Failure ? error.status : 502
      if (status === 401) clear(res)
      res
        .status(status)
        .json({ messages: [status === 401 ? 'Authentication required.' : 'Request failed.'] })
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
