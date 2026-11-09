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
function fixture(storage?: AuthSessionStorage) {
  let token = jwt()
  const fetcher = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>(
    async input => {
      const url = String(input)
      if (url.endsWith('/tokens/get-by-email') || url.endsWith('/tokens/refresh')) {
        return json({
          code: '2000',
          result: {
            token,
            refreshToken: 'upstream-refresh-secret',
            refreshTokenExpiryTime: new Date(Date.now() + 86_400_000).toISOString(),
          },
        })
      }
      if (url.endsWith('/personal/permissions')) return json(['Permissions.Read'])
      return json({ code: '2000', result: ['business-data'] })
    },
  )
  const bff = createAuthBff({ config: config(), fetch: fetcher as typeof fetch, storage })
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
    setToken: (next: string) => {
      token = next
    },
  }
}
const cookie = (response: { headers: Record<string, unknown> }): string =>
  (response.headers['set-cookie'] as string[])[0].split(';')[0]
afterEach(() => vi.restoreAllMocks())

describe('Node cookie authentication BFF', () => {
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
      tenant: 'root',
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
    fetcher.mockResolvedValueOnce(json({ messages: ['sensitive'] }, 401))
    const rejected = await request(app).get('/api/auth/session').set('Cookie', value).expect(401)
    expect(rejected.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970/)
    expect(JSON.stringify(rejected.body)).not.toContain('sensitive')
  })

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

  it('caps cookie and metadata lifetime at 12 hours even with very long upstream token lifetimes', async () => {
    const f = fixture()
    const now = Date.now()
    f.setToken(jwt(now + 90 * 86_400_000))
    const logged = await f.login().expect(200)
    expect(logged.body.expiresAt).toBeLessThanOrEqual(Date.now() + 12 * 60 * 60 * 1000)
    const maxAge = Number(/Max-Age=(\d+)/.exec(logged.headers['set-cookie'][0])?.[1])
    expect(maxAge).toBeGreaterThanOrEqual(43_198)
    expect(maxAge).toBeLessThanOrEqual(43_200)
    vi.spyOn(Date, 'now').mockReturnValue(now + 13 * 60 * 60 * 1000)
    await request(f.app).get('/api/auth/session').set('Cookie', cookie(logged)).expect(401)
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

  it('preserves server-owned tenant on every upstream request', async () => {
    const f = fixture()
    const app = express().use(
      '/api',
      createAuthBff({
        config: { ...config(), tenant: 'another-tenant' },
        fetch: f.fetcher as typeof fetch,
      }),
    )
    const logged = await request(app)
      .post('/api/auth/login')
      .set('Origin', origin)
      .set('X-Auth-Request', '1')
      .set('tenant', 'untrusted')
      .send({ username: 'test@example.com', password: 'secret' })
      .expect(200)
    await request(app)
      .get('/api/companies')
      .set('Cookie', cookie(logged))
      .set('tenant', 'untrusted')
      .expect(200)
    expect(
      f.fetcher.mock.calls.every(
        ([, init]) => (init?.headers as Record<string, string>)['tenant'] === 'another-tenant',
      ),
    ).toBe(true)
  })

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
    f.fetcher.mockResolvedValueOnce(json({}, 401))
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
