import express from 'express'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAuthBff,
  createMemorySessionStorage,
  readAuthBffConfig,
  type AuthSessionStorage,
} from './index'

const identity = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/'
const role = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
const origin = 'http://localhost:4000'
const secret = 'test-only-session-secret-at-least-32-bytes'
const config = () =>
  readAuthBffConfig({
    AUTH_API_URL: 'http://127.0.0.1:5000/api',
    AUTH_PUBLIC_ORIGIN: origin,
    AUTH_SESSION_SECRET: secret,
    NODE_ENV: 'test',
  })
const jwt = (expires = Date.now() + 60_000) =>
  [
    { alg: 'HS256' },
    {
      [`${identity}nameidentifier`]: 'user-1',
      [`${identity}name`]: 'Test',
      [`${identity}surname`]: 'User',
      [role]: ['Admin'],
      sid: '42',
      companyId: '7',
      exp: Math.floor(expires / 1000),
    },
  ]
    .map(value => Buffer.from(JSON.stringify(value)).toString('base64url'))
    .join('.') + '.signature'
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'upstream=leak' },
  })
function fixture(storage?: AuthSessionStorage, refreshLifetime = 86_400_000) {
  let token = jwt()
  const diagnostics = vi.fn()
  const fetcher = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>(
    async input => {
      const url = String(input)
      if (url.endsWith('/tokens/get-by-email/') || url.endsWith('/tokens/refresh')) {
        return json({
          code: '2000',
          result: {
            token,
            refreshToken: 'upstream-refresh-secret',
            refreshTokenExpiryTime: new Date(Date.now() + refreshLifetime).toISOString(),
          },
        })
      }
      if (url.endsWith('/personal/permissions')) return json(['Permissions.Read'])
      return json({ code: '2000', result: ['business-data'] })
    },
  )
  const bff = createAuthBff({
    config: config(),
    fetch: fetcher as typeof fetch,
    storage,
    onDiagnostic: diagnostics,
  })
  const app = express().use('/api', bff)
  const login = () =>
    request(app)
      .post('/api/auth/login')
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .send({ username: 'test@example.com', password: 'password-secret' })
  return {
    app,
    fetcher,
    login,
    bff,
    diagnostics,
    setToken: (next: string) => {
      token = next
    },
  }
}
const cookie = (response: { headers: Record<string, unknown> }): string =>
  (response.headers['set-cookie'] as string[])[0].split(';')[0]
afterEach(() => vi.restoreAllMocks())

describe('Node cookie authentication BFF', () => {
  const hostDefaults = {
    apiUrl: 'https://api.example.test/api',
    production: false,
    developmentOrigin: 'http://localhost:4200',
  }

  it('uses the app API URL and ephemeral server-only defaults for local development', () => {
    const first = readAuthBffConfig({}, hostDefaults)
    const second = readAuthBffConfig({ NODE_ENV: 'development' }, hostDefaults)
    expect(first.apiUrl).toBe(hostDefaults.apiUrl)
    expect(first.publicOrigin).toBe('http://localhost:4200')
    expect(first.production).toBe(false)
    expect(Buffer.byteLength(first.secret)).toBeGreaterThanOrEqual(32)
    expect(second.secret).not.toBe(first.secret)
  })

  it('allows explicit server environment overrides of app configuration', () => {
    const resolved = readAuthBffConfig(
      {
        AUTH_API_URL: 'https://staging.example.test/api',
        AUTH_PUBLIC_ORIGIN: 'http://localhost:4400',
        AUTH_SESSION_SECRET: secret,
        NODE_ENV: 'development',
      },
      hostDefaults,
    )
    expect(resolved.apiUrl).toBe('https://staging.example.test/api')
    expect(resolved.publicOrigin).toBe('http://localhost:4400')
    expect(resolved.secret).toBe(secret)
  })

  it('never supplies development origin or secret to production builds or runtimes', () => {
    expect(() => readAuthBffConfig({ NODE_ENV: 'production' }, hostDefaults)).toThrow(
      'configuration',
    )
    expect(() =>
      readAuthBffConfig(
        { NODE_ENV: 'development' },
        {
          ...hostDefaults,
          production: true,
        },
      ),
    ).toThrow('configuration')
    const resolved = readAuthBffConfig(
      {
        NODE_ENV: 'development',
        AUTH_PUBLIC_ORIGIN: 'https://panel.example.test',
        AUTH_SESSION_SECRET: secret,
      },
      { ...hostDefaults, production: true },
    )
    expect(resolved.production).toBe(true)
    expect(resolved.apiUrl).toBe(hostDefaults.apiUrl)
    expect(() => readAuthBffConfig({ AUTH_API_URL: '' }, hostDefaults)).toThrow('configuration')
  })

  it('enables local API validation without contacting the upstream or requiring manual secrets', async () => {
    const fetcher = vi.fn()
    const app = express().use(
      '/api',
      createAuthBff({
        config: readAuthBffConfig({}, hostDefaults),
        fetch: fetcher,
      }),
    )
    await request(app).get('/api/auth/session').expect(401)
    await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:4200')
      .set('X-Auth-Request', '1')
      .send({})
      .expect(400)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('fails closed for missing/insecure config and exposes a fixed public API origin', () => {
    expect(() => readAuthBffConfig({})).toThrow('configuration')
    const good = config()
    expect(good.apiPublicOrigin).toBe(`${origin}/api`)
    for (const env of [
      { AUTH_API_URL: 'http://example.com/api' },
      { AUTH_PUBLIC_ORIGIN: 'http://example.com' },
      { AUTH_PUBLIC_ORIGIN: 'https://example.com/path' },
      { AUTH_SESSION_SECRET: 'short' },
      { NODE_ENV: 'production' },
    ])
      expect(() =>
        readAuthBffConfig({
          AUTH_API_URL: good.apiUrl,
          AUTH_PUBLIC_ORIGIN: good.publicOrigin,
          AUTH_SESSION_SECRET: good.secret,
          NODE_ENV: 'test',
          ...env,
        }),
      ).toThrow('configuration')
  })

  it('returns mapped metadata only and an authenticated opaque HttpOnly persistent cookie', async () => {
    const { login, fetcher, app } = fixture()
    const response = await login().expect(200)
    expect(response.body).toMatchObject({
      user: {
        id: 'user-1',
        username: 'test@example.com',
        email: 'test@example.com',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        companyId: 7,
        businessEntityId: 42,
        roles: ['Admin'],
      },
    })
    expect(response.body.expiresAt).toBeGreaterThan(Date.now())
    expect(JSON.stringify(response.body)).not.toMatch(/refreshToken|signature|password-secret/)
    expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/)
    expect(response.headers['set-cookie'][0]).toMatch(/SameSite=Lax/)
    expect(response.headers['set-cookie'][0]).toMatch(/Path=\//)
    expect(response.headers['set-cookie'][0]).toMatch(/Max-Age=/)
    expect(response.headers['set-cookie'][0]).not.toMatch(/upstream|signature|Domain=/)
    expect(cookie(response)).toMatch(/^auth-session-dev=[a-f0-9]{64}\.[A-Za-z0-9_-]{43}$/)
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      redirect: 'error',
      body: JSON.stringify({ email: 'test@example.com', password: 'password-secret' }),
    })
    expect(fetcher.mock.calls[0][0]).toBe('http://127.0.0.1:5000/api/tokens/get-by-email/')
    const session = await request(app)
      .get('/api/auth/session')
      .set('Cookie', cookie(response))
      .expect(200)
    expect(session.body).toEqual(response.body)
    expect(session.headers['cache-control']).toBe('no-store')
  })

  it('uses __Host secure cookies for production HTTPS', async () => {
    const f = fixture()
    const app = express().use(
      '/api',
      createAuthBff({
        config: { ...config(), production: true, publicOrigin: 'https://panel.example' },
        fetch: f.fetcher as typeof fetch,
      }),
    )
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://panel.example')
      .set('X-Auth-Request', '1')
      .send({ username: 'test@example.com', password: 'secret' })
      .expect(200)
    expect(response.headers['set-cookie'][0]).toMatch(/^__Host-auth-session=/)
    expect(response.headers['set-cookie'][0]).toMatch(/; Secure;/)
  })

  it('invalidates the previous browser session when reauthenticating', async () => {
    const { app, login } = fixture()
    const first = await login().expect(200)
    const second = await login().set('Cookie', cookie(first)).expect(200)
    expect(cookie(second)).not.toBe(cookie(first))
    await request(app).get('/api/auth/session').set('Cookie', cookie(first)).expect(401)
    await request(app).get('/api/auth/session').set('Cookie', cookie(second)).expect(200)
  })

  it('rejects all unsafe requests without exact configured Origin and custom header', async () => {
    const { app, fetcher } = fixture()
    for (const path of ['auth/login', 'auth/logout', 'auth/refresh', 'companies']) {
      await request(app).post(`/api/${path}`).send({}).expect(403)
      await request(app)
        .post(`/api/${path}`)
        .set('Host', 'evil.test')
        .set('Origin', 'https://evil.test')
        .set('X-Auth-Request', '1')
        .send({})
        .expect(403)
      await request(app).post(`/api/${path}`).set('Origin', origin).send({}).expect(403)
    }
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('blocks token/logout bypasses, encoded paths and unsupported methods', async () => {
    const { app, fetcher } = fixture()
    for (const path of [
      '/tokens/get-by-email',
      '/TOKENS/refresh',
      '/personal/logout',
      '/personal/logout/',
      '/%74okens/refresh',
      '/companies/%2e%2e/tokens/refresh',
      '//tokens/refresh',
    ]) {
      await request(app).get(`/api${path}`).expect(404)
    }
    await request(app).options('/api/companies').expect(405)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('proxies only cookie bearer and safe selected headers, never upstream Set-Cookie', async () => {
    const { app, fetcher, login } = fixture()
    const logged = await login()
    const response = await request(app)
      .get('/api/companies?page=2')
      .set('Cookie', cookie(logged))
      .set('Authorization', 'Bearer attacker')
      .set('tenant', 'attacker-tenant')
      .set('X-Forwarded-Host', 'evil.test')
      .expect(200)
    expect(response.body.result).toEqual(['business-data'])
    const call = fetcher.mock.calls.find(([url]) => String(url).includes('/companies?'))
    expect(call?.[0]).toBe('http://127.0.0.1:5000/api/companies?page=2')
    expect(call?.[1]?.headers).toEqual({
      Accept: 'application/json',
      tenant: 'example',
      Authorization: expect.stringContaining('.signature'),
    })
    expect(response.headers['set-cookie']).toBeUndefined()
    await request(app).get('/api/companies').set('Authorization', 'Bearer attacker').expect(401)
  })

  it('validates restore upstream and rejects tampered/duplicate cookies', async () => {
    const { app, login, fetcher } = fixture()
    const logged = await login()
    const value = cookie(logged)
    await request(app).get('/api/auth/session').set('Cookie', `${value}x`).expect(401)
    await request(app).get('/api/auth/session').set('Cookie', `${value}; ${value}`).expect(401)
    const original = fetcher.getMockImplementation()
    if (!original) throw new Error('Missing fetch test implementation.')
    fetcher.mockImplementation((url, init) =>
      String(url).endsWith('/personal/permissions')
        ? Promise.resolve(json({ messages: ['sensitive'] }, 401))
        : original(url, init),
    )
    const rejected = await request(app).get('/api/auth/session').set('Cookie', value).expect(401)
    expect(rejected.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970/)
    expect(JSON.stringify(rejected.body)).not.toContain('sensitive')
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith('/tokens/refresh')),
    ).toHaveLength(1)
  })

  it('refreshes a backend-rejected access token even before its local expiry', async () => {
    const { app, login, fetcher, setToken, diagnostics } = fixture()
    const logged = await login()
    setToken(jwt(Date.now() + 180_000))
    fetcher.mockResolvedValueOnce(json({ messages: ['expired-upstream'] }, 401))
    const restored = await request(app)
      .get('/api/auth/session')
      .set('Cookie', cookie(logged))
      .expect(200)
    expect(restored.body.user.id).toBe('user-1')
    expect(restored.headers['set-cookie'][0]).not.toMatch(/Expires=Thu, 01 Jan 1970/)
    const refreshCalls = fetcher.mock.calls.filter(([url]) =>
      String(url).endsWith('/tokens/refresh'),
    )
    expect(refreshCalls).toHaveLength(1)
    expect(refreshCalls[0][1]?.headers).toMatchObject({ tenant: 'example' })
    expect(JSON.parse(refreshCalls[0][1]?.body as string)).toMatchObject({
      refreshToken: 'upstream-refresh-secret',
    })
    expect(diagnostics).toHaveBeenCalledWith({ operation: 'refresh', reason: 'refresh-succeeded' })
    expect(JSON.stringify(diagnostics.mock.calls)).not.toMatch(
      /password-secret|upstream-refresh-secret|signature|test@example/,
    )
  })

  it('coalesces simultaneous session validation failures into one refresh', async () => {
    const { app, login, fetcher, setToken } = fixture()
    const logged = await login()
    const oldAuthorization = (fetcher.mock.calls[1][1]?.headers as Record<string, string>)[
      'Authorization'
    ]
    setToken(jwt(Date.now() + 180_000))
    const original = fetcher.getMockImplementation()
    if (!original) throw new Error('Missing fetch test implementation.')
    fetcher.mockImplementation((url, init) =>
      String(url).endsWith('/personal/permissions') &&
      (init?.headers as Record<string, string>)['Authorization'] === oldAuthorization
        ? Promise.resolve(json({}, 401))
        : original(url, init),
    )
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        request(app).get('/api/auth/session').set('Cookie', cookie(logged)),
      ),
    )
    expect(responses.map(response => response.status)).toEqual([200, 200, 200, 200])
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith('/tokens/refresh')),
    ).toHaveLength(1)
  })

  it('does not refresh forbidden session validation or clear its cookie', async () => {
    const { app, login, fetcher } = fixture()
    const logged = await login()
    fetcher.mockResolvedValueOnce(json({}, 403))
    const denied = await request(app)
      .get('/api/auth/session')
      .set('Cookie', cookie(logged))
      .expect(403)
    expect(denied.headers['set-cookie']).toBeUndefined()
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('/tokens/refresh'))).toBe(false)
  })

  it('retains a recoverable session when refresh encounters a transient upstream failure', async () => {
    const { app, login, fetcher, diagnostics } = fixture()
    const logged = await login()
    fetcher
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ secret: 'do-not-log' }, 503))
    const failed = await request(app)
      .get('/api/auth/session')
      .set('Cookie', cookie(logged))
      .expect(502)
    expect(failed.headers['set-cookie']).toBeUndefined()
    await request(app).get('/api/auth/session').set('Cookie', cookie(logged)).expect(200)
    expect(diagnostics).toHaveBeenCalledWith({
      operation: 'refresh',
      reason: 'refresh-rejected',
      status: 502,
    })
    expect(JSON.stringify(diagnostics.mock.calls)).not.toContain('do-not-log')
  })

  it('removes the server session when its refresh token is rejected without retry loops', async () => {
    const { app, login, fetcher, diagnostics } = fixture()
    const logged = await login()
    fetcher.mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({}, 400))
    const rejected = await request(app)
      .get('/api/auth/session')
      .set('Cookie', cookie(logged))
      .expect(401)
    expect(rejected.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970/)
    await request(app).get('/api/auth/session').set('Cookie', cookie(logged)).expect(401)
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith('/tokens/refresh')),
    ).toHaveLength(1)
    expect(diagnostics).toHaveBeenCalledWith({
      operation: 'session',
      reason: 'session-missing',
      status: 401,
    })
  })

  it('distinguishes missing cookies, tampered cookies and lost server sessions without logging secrets', async () => {
    const { app, login, fetcher, diagnostics } = fixture()
    const logged = await login()
    await request(app).get('/api/auth/session').expect(401)
    await request(app)
      .get('/api/auth/session')
      .set('Cookie', `${cookie(logged)}x`)
      .expect(401)
    const restartedDiagnostics = vi.fn()
    const restarted = express().use(
      '/api',
      createAuthBff({
        config: config(),
        fetch: fetcher as typeof fetch,
        onDiagnostic: restartedDiagnostics,
      }),
    )
    await request(restarted).get('/api/auth/session').set('Cookie', cookie(logged)).expect(401)
    expect(diagnostics).toHaveBeenCalledWith({
      operation: 'session',
      reason: 'cookie-missing',
      status: 401,
    })
    expect(diagnostics).toHaveBeenCalledWith({
      operation: 'session',
      reason: 'cookie-invalid',
      status: 401,
    })
    expect(restartedDiagnostics).toHaveBeenCalledWith({
      operation: 'session',
      reason: 'session-missing',
      status: 401,
    })
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('/tokens/refresh'))).toBe(false)
    expect(
      JSON.stringify([...diagnostics.mock.calls, ...restartedDiagnostics.mock.calls]),
    ).not.toMatch(
      /test@example|signature|password-secret|upstream-refresh-secret|auth-session-dev=/,
    )
  })

  it('recovers SSR session validation and preserves its cookie during a temporary outage', async () => {
    const { login, bff, fetcher, diagnostics } = fixture()
    const logged = await login()
    const ssr = express().use((req, res, next) => {
      void bff
        .resolveSession(req, res)
        .then(metadata => res.json(metadata))
        .catch(next)
    })
    fetcher.mockResolvedValueOnce(json({}, 401))
    const restored = await request(ssr).get('/workspace').set('Cookie', cookie(logged)).expect(200)
    expect(restored.body.user.id).toBe('user-1')
    fetcher.mockRejectedValueOnce(new Error('credentials-must-not-leak'))
    const unavailable = await request(ssr)
      .get('/workspace')
      .set('Cookie', cookie(logged))
      .expect(200)
    expect(unavailable.body).toBeNull()
    expect(unavailable.headers['set-cookie']).toBeUndefined()
    expect(diagnostics).toHaveBeenCalledWith({
      operation: 'ssr',
      reason: 'upstream-unavailable',
      status: 502,
    })
    expect(JSON.stringify(diagnostics.mock.calls)).not.toContain('credentials-must-not-leak')
  })

  it.each([false, true])(
    'retries a proxied backend 401 at most once (persistent rejection=%s)',
    async persistent => {
      const { app, login, fetcher } = fixture()
      const logged = await login()
      const original = fetcher.getMockImplementation()
      if (!original) throw new Error('Missing fetch test implementation.')
      let calls = 0
      fetcher.mockImplementation((url, init) => {
        if (String(url).endsWith('/companies')) {
          calls++
          if (persistent || calls === 1) return Promise.resolve(json({}, 401))
        }
        return original(url, init)
      })
      await request(app)
        .get('/api/companies')
        .set('Cookie', cookie(logged))
        .expect(persistent ? 401 : 200)
      expect(calls).toBe(2)
      expect(
        fetcher.mock.calls.filter(([url]) => String(url).endsWith('/tokens/refresh')),
      ).toHaveLength(1)
      if (persistent)
        await request(app).get('/api/auth/session').set('Cookie', cookie(logged)).expect(401)
    },
  )

  it('refreshes expired access tokens and rejects expired persistent sessions', async () => {
    const { app, login, fetcher, setToken } = fixture()
    const before = Date.now()
    const logged = await login()
    vi.spyOn(Date, 'now').mockReturnValue(before + 120_000)
    setToken(jwt(before + 180_000))
    const restored = await request(app)
      .get('/api/auth/session')
      .set('Cookie', cookie(logged))
      .expect(200)
    expect(restored.body.expiresAt).toBeGreaterThan(before + 120_000)
    expect(restored.headers['set-cookie']).toBeDefined()
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('/tokens/refresh'))).toBe(true)
    vi.spyOn(Date, 'now').mockReturnValue(before + 2 * 86_400_000)
    await request(app).get('/api/auth/session').set('Cookie', cookie(logged)).expect(401)
  })

  it('shares one refresh budget between permissions validation and the proxied request', async () => {
    const { app, login, fetcher } = fixture()
    const logged = await login()
    const original = fetcher.getMockImplementation()
    if (!original) throw new Error('Missing fetch test implementation.')
    fetcher.mockImplementation((url, init) =>
      String(url).endsWith('/companies') ? Promise.resolve(json({}, 401)) : original(url, init),
    )
    fetcher.mockResolvedValueOnce(json({}, 401))
    await request(app).get('/api/companies').set('Cookie', cookie(logged)).expect(401)
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith('/tokens/refresh')),
    ).toHaveLength(1)
    expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith('/companies'))).toHaveLength(1)
  })

  it('uses the current stored credentials for a delayed 401 after another request rotated them', async () => {
    const { app, login, fetcher, setToken } = fixture()
    const logged = await login()
    const oldAuthorization = (fetcher.mock.calls[1][1]?.headers as Record<string, string>)[
      'Authorization'
    ]
    const original = fetcher.getMockImplementation()
    if (!original) throw new Error('Missing fetch test implementation.')
    let started!: () => void
    let release!: () => void
    const start = new Promise<void>(resolve => {
      started = resolve
    })
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    fetcher.mockImplementation(async (url, init) => {
      if (
        String(url).endsWith('/personal/permissions') &&
        (init?.headers as Record<string, string>)['Authorization'] === oldAuthorization
      ) {
        started()
        await gate
        return json({}, 401)
      }
      return original(url, init)
    })
    const delayed = request(app)
      .get('/api/auth/session')
      .set('Cookie', cookie(logged))
      .then(response => response)
    await start
    setToken(jwt(Date.now() + 180_000))
    await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie(logged))
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .expect(200)
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now + 6000)
    release()
    expect((await delayed).status).toBe(200)
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith('/tokens/refresh')),
    ).toHaveLength(1)
  })

  it('isolates failures in the diagnostic observer from successful refresh recovery', async () => {
    const { fetcher } = fixture()
    const observer = vi.fn(() => {
      throw new Error('logger unavailable')
    })
    const app = express().use(
      '/api',
      createAuthBff({ config: config(), fetch: fetcher as typeof fetch, onDiagnostic: observer }),
    )
    const logged = await request(app)
      .post('/api/auth/login')
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .send({ username: 'test@example.com', password: 'secret' })
      .expect(200)
    fetcher.mockResolvedValueOnce(json({}, 401))
    await request(app).get('/api/auth/session').set('Cookie', cookie(logged)).expect(200)
    expect(observer).toHaveBeenCalledWith({ operation: 'refresh', reason: 'refresh-succeeded' })
  })

  it('single-flights concurrent refresh requests and does not expose refreshed tokens', async () => {
    const { app, login, fetcher } = fixture()
    const logged = await login()
    const original = fetcher.getMockImplementation()
    if (!original) throw new Error('Missing fetch test implementation.')
    let release!: () => void
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    let started!: () => void
    const start = new Promise<void>(resolve => {
      started = resolve
    })
    fetcher.mockImplementation(async (url, init) => {
      if (String(url).endsWith('/tokens/refresh')) {
        started()
        await gate
      }
      return original(url, init)
    })
    const send = () =>
      request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookie(logged))
        .set('Origin', origin)
        .set('X-Auth-Request', '1')
        .then(response => response)
    const first = send()
    await start
    const second = send()
    release()
    const responses = await Promise.all([first, second])
    expect(responses.map(response => response.status)).toEqual([200, 200])
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith('/tokens/refresh')),
    ).toHaveLength(1)
    expect(JSON.stringify(responses[0].body)).not.toContain('refreshToken')
    await send()
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith('/tokens/refresh')),
    ).toHaveLength(1)
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now + 6000)
    await send()
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith('/tokens/refresh')),
    ).toHaveLength(2)
  })

  it('logs out locally even on upstream failure, revokes replayed cookies and is idempotent', async () => {
    const { app, login, fetcher } = fixture()
    const logged = await login()
    fetcher.mockRejectedValueOnce(new Error('upstream-secret'))
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie(logged))
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .expect(204)
    expect(response.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970/)
    await request(app).get('/api/auth/session').set('Cookie', cookie(logged)).expect(401)
    await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie(logged))
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .expect(401)
    await request(app)
      .post('/api/auth/logout')
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .expect(204)
  })

  it('fails closed at storage capacity without evicting live sessions or recreating deleted ones', async () => {
    const store = createMemorySessionStorage(1)
    const first = {
      id: 'first',
      token: 'token',
      refreshToken: 'refresh',
      username: 'user',
      tenant: 'root',
      refreshExpiresAt: Date.now() + 60_000,
    }
    await store.create(first)
    await expect(store.create({ ...first, id: 'second' })).rejects.toThrow()
    expect(await store.get('first')).toEqual(first)
    await store.remove('first')
    expect(await store.replace(first)).toBe(false)
    expect(await store.get('first')).toBeNull()
  })

  it('limits request bodies and sanitizes upstream errors', async () => {
    const { app, login, fetcher } = fixture()
    await request(app)
      .post('/api/auth/login')
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .send({ username: 'a', password: 'x'.repeat(1024 * 1024) })
      .expect(413)
    fetcher.mockRejectedValueOnce(new Error(`sensitive ${secret}`))
    const response = await login().expect(502)
    expect(JSON.stringify(response.body)).not.toMatch(/sensitive|test-only|password/)
  })

  it('keeps cookies small even with a large upstream access token', async () => {
    const { login, setToken } = fixture()
    const parts = jwt().split('.')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    payload.padding = 'x'.repeat(4000)
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url')
    setToken(parts.join('.'))
    const response = await login().expect(200)
    expect(cookie(response).length).toBeLessThan(200)
    expect(response.headers['set-cookie'][0]).not.toContain('padding')
  })

  it('allows a one-day development session with a long upstream token lifetime', async () => {
    const f = fixture(undefined, 90 * 86_400_000)
    const now = Date.now()
    f.setToken(jwt(now + 90 * 86_400_000))
    const logged = await f.login().expect(200)
    expect(logged.body.expiresAt).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000)
    const maxAge = Number(/Max-Age=(\d+)/.exec(logged.headers['set-cookie'][0])?.[1])
    expect(maxAge).toBeGreaterThanOrEqual(86_398)
    expect(maxAge).toBeLessThanOrEqual(86_400)
    vi.spyOn(Date, 'now').mockReturnValue(now + 25 * 60 * 60 * 1000)
    await request(f.app).get('/api/auth/session').set('Cookie', cookie(logged)).expect(401)
  })

  it('keeps production sessions capped at 12 hours', async () => {
    const productionOrigin = 'https://panel.example.test'
    const productionConfig = readAuthBffConfig({
      AUTH_API_URL: 'https://api.example.test',
      AUTH_PUBLIC_ORIGIN: productionOrigin,
      AUTH_SESSION_SECRET: secret,
      NODE_ENV: 'production',
    })
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('/personal/permissions')) return json(['Permissions.Read'])
      return json({
        code: '2000',
        result: {
          token: jwt(Date.now() + 90 * 86_400_000),
          refreshToken: 'upstream-refresh-secret',
          refreshTokenExpiryTime: new Date(Date.now() + 90 * 86_400_000).toISOString(),
        },
      })
    })
    const app = express().use(
      '/api',
      createAuthBff({ config: productionConfig, fetch: fetcher as typeof fetch }),
    )
    const logged = await request(app)
      .post('/api/auth/login')
      .set('Origin', productionOrigin)
      .set('X-Auth-Request', '1')
      .send({ username: 'test@example.com', password: 'password-secret' })
      .expect(200)
    const maxAge = Number(/Max-Age=(\d+)/.exec(logged.headers['set-cookie'][0])?.[1])
    expect(maxAge).toBeGreaterThanOrEqual(43_198)
    expect(maxAge).toBeLessThanOrEqual(43_200)
  })

  it('sanitizes HTTP and application-envelope proxy errors', async () => {
    const { app, login, fetcher } = fixture()
    const logged = await login()
    const original = fetcher.getMockImplementation()
    if (!original) throw new Error('Missing fetch test implementation.')
    for (const status of [400, 403, 500]) {
      fetcher.mockImplementation(async (url, init) =>
        String(url).endsWith('/companies')
          ? json({ exception: 'database-password', messages: ['private-stack'] }, status)
          : original(url, init),
      )
      const response = await request(app)
        .get('/api/companies')
        .set('Cookie', cookie(logged))
        .expect(status)
      expect(JSON.stringify(response.body)).not.toMatch(/database-password|private-stack/)
    }
    fetcher.mockImplementation(async (url, init) =>
      String(url).endsWith('/companies')
        ? json({ code: '5000', messages: ['private-stack'] })
        : original(url, init),
    )
    await request(app).get('/api/companies').set('Cookie', cookie(logged)).expect(502)
  })

  it('binds email-derived tenant to the session and ignores browser tenant overrides', async () => {
    const f = fixture()
    const app = express().use(
      '/api',
      createAuthBff({
        config: config(),
        fetch: f.fetcher as typeof fetch,
      }),
    )
    const logged = await request(app)
      .post('/api/auth/login')
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .set('tenant', 'untrusted')
      .send({ username: 'admin@Root.com', password: 'secret' })
      .expect(200)
    await request(app)
      .get('/api/companies')
      .set('Cookie', cookie(logged))
      .set('tenant', 'untrusted')
      .expect(200)
    await request(app)
      .post('/api/auth/refresh')
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .set('Cookie', cookie(logged))
      .set('tenant', 'untrusted')
      .expect(200)
    await request(app)
      .post('/api/auth/logout')
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .set('Cookie', cookie(logged))
      .set('tenant', 'untrusted')
      .expect(204)
    expect(
      f.fetcher.mock.calls.every(
        ([, init]) => (init?.headers as Record<string, string>)['tenant'] === 'root',
      ),
    ).toBe(true)
  })

  it('isolates tenants across simultaneous server sessions', async () => {
    const { app, fetcher } = fixture()
    const loginAs = (username: string) =>
      request(app)
        .post('/api/auth/login')
        .set('Origin', origin)
        .set('X-Auth-Request', '1')
        .send({ username, password: 'secret' })
    const [root, finance] = await Promise.all([
      loginAs('admin@root.com'),
      loginAs('user@finance.com'),
    ])
    expect(root.status).toBe(200)
    expect(finance.status).toBe(200)
    await request(app).get('/api/companies?owner=root').set('Cookie', cookie(root)).expect(200)
    await request(app)
      .get('/api/companies?owner=finance')
      .set('Cookie', cookie(finance))
      .expect(200)
    for (const tenant of ['root', 'finance']) {
      const call = fetcher.mock.calls.find(([url]) => String(url).endsWith(`?owner=${tenant}`))
      expect((call?.[1]?.headers as Record<string, string>)['tenant']).toBe(tenant)
    }
  })

  it.each(['admin', 'a@@root.com', 'admin@root', 'a@root.com\r\ntenant: victim'])(
    'rejects malformed login email %s without contacting upstream',
    async username => {
      const { app, fetcher } = fixture()
      await request(app)
        .post('/api/auth/login')
        .set('Origin', origin)
        .set('X-Auth-Request', '1')
        .send({ username, password: 'secret' })
        .expect(400)
      expect(fetcher).not.toHaveBeenCalled()
    },
  )

  it('fails closed after default store restart and shares/logout-revokes with an injected store', async () => {
    const store = createMemorySessionStorage()
    const f = fixture(store)
    const logged = await f.login()
    const replica = express().use(
      '/api',
      createAuthBff({ config: config(), fetch: f.fetcher as typeof fetch, storage: store }),
    )
    await request(replica).get('/api/auth/session').set('Cookie', cookie(logged)).expect(200)
    const restarted = express().use(
      '/api',
      createAuthBff({ config: config(), fetch: f.fetcher as typeof fetch }),
    )
    await request(restarted).get('/api/auth/session').set('Cookie', cookie(logged)).expect(401)
    await request(replica)
      .post('/api/auth/logout')
      .set('Cookie', cookie(logged))
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .expect(204)
    await request(f.app).get('/api/auth/session').set('Cookie', cookie(logged)).expect(401)
  })

  it('does not resurrect a session when logout completes during refresh', async () => {
    const { app, login, fetcher } = fixture()
    const logged = await login()
    const original = fetcher.getMockImplementation()
    if (!original) throw new Error('Missing fetch test implementation.')
    let release!: () => void
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    let started!: () => void
    const start = new Promise<void>(resolve => {
      started = resolve
    })
    fetcher.mockImplementation(async (url, init) => {
      if (String(url).endsWith('/tokens/refresh')) {
        started()
        await gate
      }
      return original(url, init)
    })
    const refreshing = request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie(logged))
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .then(response => response)
    await start
    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie(logged))
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .expect(204)
    release()
    expect((await refreshing).status).toBe(401)
    await request(app).get('/api/auth/session').set('Cookie', cookie(logged)).expect(401)
  })

  it('provides only upstream-validated metadata to the SSR resolver', async () => {
    const f = fixture()
    const logged = await f.login()
    f.app.get('/render', (req, res, next) => {
      void f.bff
        .resolveSession(req, res)
        .then(authSession => res.json({ authSession }))
        .catch(next)
    })
    const response = await request(f.app).get('/render').set('Cookie', cookie(logged)).expect(200)
    expect(response.body.authSession.user.id).toBe('user-1')
    expect(JSON.stringify(response.body)).not.toMatch(/refreshToken|signature/)
    f.fetcher.mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({}, 401))
    const rejected = await request(f.app).get('/render').set('Cookie', cookie(logged)).expect(200)
    expect(rejected.body).toEqual({ authSession: null })
    expect(rejected.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970/)
  })

  it('forbids redirects, limits upstream response bodies and uses a fetch timeout signal', async () => {
    const f = fixture()
    const logged = await f.login()
    const original = f.fetcher.getMockImplementation()
    if (!original) throw new Error('Missing fetch test implementation.')
    f.fetcher.mockImplementation(async (url, init) =>
      String(url).endsWith('/companies')
        ? new Response(null, { status: 302, headers: { Location: 'https://evil.test' } })
        : original(url, init),
    )
    await request(f.app).get('/api/companies').set('Cookie', cookie(logged)).expect(502)
    f.fetcher.mockImplementation(async (url, init) =>
      String(url).endsWith('/companies')
        ? json({ data: 'x'.repeat(2 * 1024 * 1024) })
        : original(url, init),
    )
    await request(f.app).get('/api/companies').set('Cookie', cookie(logged)).expect(502)
    expect(
      f.fetcher.mock.calls.every(
        ([, init]) => init?.redirect === 'error' && init.signal instanceof AbortSignal,
      ),
    ).toBe(true)
  })

  it('denies insecure non-loopback connections for both API and SSR restoration', async () => {
    const f = fixture()
    const app = express().use((req, _res, next) => {
      Object.defineProperty(req.socket, 'remoteAddress', {
        value: '203.0.113.1',
        configurable: true,
      })
      next()
    })
    app.use('/api', f.bff)
    app.get('/render', (req, res, next) => {
      void f.bff
        .resolveSession(req, res)
        .then(authSession => res.json({ authSession }))
        .catch(next)
    })
    await request(app).get('/api/auth/session').expect(403)
    const rendered = await request(app).get('/render').expect(200)
    expect(rendered.body).toEqual({ authSession: null })
    expect(f.fetcher).not.toHaveBeenCalled()
  })
})
