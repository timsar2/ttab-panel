import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  HttpHeaders,
  HttpRequest,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import {
  EnvironmentInjector,
  PLATFORM_ID,
  createEnvironmentInjector,
  provideZonelessChangeDetection,
} from '@angular/core'
import { TestBed } from '@angular/core/testing'
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router'
import { Observable, Subject, firstValueFrom, of } from 'rxjs'
import {
  AUTH_BYPASS,
  AUTH_CONFIG,
  AuthBackend,
  AuthConfig,
  AuthTokens,
  SessionStore,
  authGuard,
  authInterceptor,
  guestGuard,
  provideAuth,
  requireRoles,
  safeReturnUrl,
} from '../index'

const api = 'https://auth.example.test/api'
const identity = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/'
const role = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
const credentials = { username: 'person@example.test', password: 'secret' }

function jwt(claims: Record<string, unknown> = {}): string {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    [`${identity}nameidentifier`]: 'identity-123',
    sid: '17',
    companyId: '29',
    [`${identity}name`]: 'First',
    [`${identity}surname`]: 'Last',
    [role]: ['Client', 'Admin'],
    exp: Math.floor(Date.now() / 1000) + 300,
    ...claims,
  })}.c2lnbmF0dXJl`
}

function tokens(claims: Record<string, unknown> = {}): AuthTokens {
  return {
    token: jwt(claims),
    refreshToken: 'rotating-refresh-secret',
    refreshTokenExpiryTime: new Date(Date.now() + 3600000).toISOString(),
  }
}
function envelope(value = tokens()) {
  return { code: '2000', massage: 'Success', result: value }
}

function setup(config: AuthConfig | null = { apiUrl: api }, server = false) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      ...(config
        ? [provideAuth(config)]
        : [provideHttpClient(withInterceptors([authInterceptor]))]),
      provideHttpClientTesting(),
      ...(server ? [{ provide: PLATFORM_ID, useValue: 'server' }] : []),
    ],
  })
  return {
    session: TestBed.inject(SessionStore),
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
  }
}

async function signIn(
  session: SessionStore,
  controller: HttpTestingController,
  value = tokens(),
  base = api,
) {
  const result = session.login(credentials)
  controller.expectOne(`${base}/tokens/get-by-email`).flush(envelope(value))
  expect(await result).toBe(true)
}
function route(returnUrl?: string): ActivatedRouteSnapshot {
  return {
    queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}),
  } as ActivatedRouteSnapshot
}
function state(url = '/protected?tab=one'): RouterStateSnapshot {
  return { url } as RouterStateSnapshot
}

describe('auth data access', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify()
    vi.restoreAllMocks()
  })

  it('normalizes configuration and maps the confirmed envelope and identity claims', async () => {
    const { session, controller } = setup({ apiUrl: `${api}/` })
    expect(TestBed.inject(AUTH_CONFIG)).toMatchObject({
      apiUrl: api,
      tenant: 'root',
      withCredentials: false,
      loginUrl: '/login',
      afterLoginUrl: '/',
      configured: true,
    })
    const login = session.login(credentials)
    expect(session.status()).toBe('authenticating')
    const request = controller.expectOne(`${api}/tokens/get-by-email`)
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      email: credentials.username,
      password: credentials.password,
    })
    expect(request.request.headers.get('tenant')).toBe('root')
    expect(request.request.headers.has('Authorization')).toBe(false)
    expect(request.request.withCredentials).toBe(false)
    expect(request.request.transferCache).toBe(false)
    expect(request.request.context.get(AUTH_BYPASS)).toBe(true)
    request.flush(envelope())
    expect(await login).toBe(true)
    expect(session.user()).toEqual({
      id: 'identity-123',
      businessEntityId: 17,
      companyId: 29,
      firstName: 'First',
      lastName: 'Last',
      roles: ['Client', 'Admin'],
    })
    expect(session.isAuthenticated()).toBe(true)
    expect(session.status()).toBe('authenticated')
    expect(session.error()).toBeNull()
    expect(session.errorCode()).toBeNull()
  })

  it.each([
    ['Client', ['Client']],
    [
      ['Client', 'Admin', 'Client', null, '  Operator ', 42, ''],
      ['Client', 'Admin', 'Operator'],
    ],
    [null, []],
  ])('normalizes scalar/array role claim %j', async (claim, expected) => {
    const { session, controller } = setup()
    await signIn(
      session,
      controller,
      tokens({
        [role]: claim,
        sid: '0',
        companyId: '-2',
        [`${identity}name`]: null,
        [`${identity}surname`]: null,
      }),
    )
    expect(session.user()).toMatchObject({
      businessEntityId: null,
      companyId: null,
      firstName: '',
      lastName: '',
      roles: expected,
    })
  })

  it.each([
    { code: '9999', massage: 'bad', result: null },
    { messages: ['bad'], statusCode: 401 },
    { code: '2000', result: {} },
    envelope({ ...tokens(), token: 'not-a-jwt' }),
    envelope(tokens({ exp: 1 })),
    envelope(tokens({ exp: undefined })),
    envelope(tokens({ [`${identity}nameidentifier`]: null })),
    envelope({ ...tokens(), refreshTokenExpiryTime: 'not-a-date' }),
    envelope({ ...tokens(), refreshTokenExpiryTime: '2000-01-01T00:00:00Z' }),
    null,
  ])('rejects malformed, failed, or expired session envelopes', async value => {
    const { session, controller } = setup()
    const result = session.login(credentials)
    controller.expectOne(`${api}/tokens/get-by-email`).flush(value)
    expect(await result).toBe(false)
    expect(session.isAuthenticated()).toBe(false)
    expect(session.user()).toBeNull()
    expect(session.status()).toBe('anonymous')
    expect(session.error()).toBeTruthy()
    expect(session.errorCode()).toBe('invalid-response')
    expect(session.error()).not.toContain('rotating-refresh-secret')
  })

  it.each([
    { messages: ['sensitive server details'], statusCode: 401 },
    { massage: 'sensitive server details', code: '9999', result: null },
    'sensitive server details',
  ])('uses safe login errors for both backend error formats', async body => {
    const { session, controller } = setup()
    const result = session.login(credentials)
    controller
      .expectOne(`${api}/tokens/get-by-email`)
      .flush(body, { status: 401, statusText: 'Unauthorized' })
    expect(await result).toBe(false)
    expect(session.error()).toBe('Sign-in failed. Check your username and password.')
    expect(session.errorCode()).toBe('invalid-credentials')
  })

  it.each([
    null,
    { apiUrl: '' },
    { apiUrl: 'localhost:123/api' },
    { apiUrl: '//evil.test/api' },
    { apiUrl: 'https://u:p@api.test/api' },
    { apiUrl: '/api?key=value' },
    { apiUrl: '/api\\evil' },
  ])('fails closed without HTTP for missing/invalid config %j', async config => {
    const { session, http, controller } = setup(config)
    expect(session.configured()).toBe(false)
    expect(await session.login(credentials)).toBe(false)
    expect(session.error()).toContain('apiUrl')
    expect(session.errorCode()).toBe('configuration')
    await expect(firstValueFrom(session.refresh())).rejects.toThrow('apiUrl')
    expect(session.errorCode()).toBe('configuration')
    const backend = TestBed.inject(AuthBackend)
    await expect(firstValueFrom(backend.login(credentials))).rejects.toThrow('apiUrl')
    await expect(firstValueFrom(backend.refresh(tokens()))).rejects.toThrow('apiUrl')
    await expect(firstValueFrom(backend.logout('unused'))).rejects.toThrow('apiUrl')
    controller.expectNone(() => true)
    for (const url of ['/anything', '/assets/logo.svg', 'https://other.example.test/public']) {
      const result = firstValueFrom(http.get(url))
      const request = controller.expectOne(url)
      expect(request.request.headers.has('Authorization')).toBe(false)
      expect(request.request.headers.has('tenant')).toBe(false)
      expect(request.request.credentials).toBeUndefined()
      request.flush({ public: true })
      expect(await result).toEqual({ public: true })
    }
    await session.logout()
    expect(session.errorCode()).toBeNull()
  })

  it('passes the original request object through when auth is unconfigured', () => {
    setup(null)
    const request = new HttpRequest('GET', '/assets/logo.svg', {
      withCredentials: true,
      headers: new HttpHeaders({ 'X-Custom': 'preserved' }),
    })
    const next = vi.fn((forwarded: HttpRequest<unknown>) => {
      expect(forwarded).toBe(request)
      return of()
    })
    TestBed.runInInjectionContext(() => authInterceptor(request, next)).subscribe()
    expect(next).toHaveBeenCalledExactlyOnceWith(request)
  })

  it.each([
    [400, 'invalid-credentials'],
    [401, 'invalid-credentials'],
    [422, 'invalid-credentials'],
    [403, 'unavailable'],
    [500, 'unavailable'],
    [503, 'unavailable'],
  ] as const)('maps login HTTP %i to the typed error code %s', async (status, code) => {
    const { session, controller } = setup()
    expect(session.errorCode()).toBeNull()
    const login = session.login(credentials)
    controller
      .expectOne(`${api}/tokens/get-by-email`)
      .flush({ messages: ['private server details'] }, { status, statusText: 'Failure' })
    expect(await login).toBe(false)
    expect(session.errorCode()).toBe(code)
    expect(session.error()).not.toContain('private server details')
    session.clear()
    expect(session.errorCode()).toBeNull()
    expect(session.error()).toBeNull()
  })

  it('maps login network failure to unavailable and resets error state on a new login', async () => {
    const { session, controller } = setup()
    const login = session.login(credentials)
    controller.expectOne(`${api}/tokens/get-by-email`).error(new ProgressEvent('error'))
    expect(await login).toBe(false)
    expect(session.errorCode()).toBe('unavailable')
    const retry = session.login(credentials)
    expect(session.errorCode()).toBeNull()
    expect(session.error()).toBeNull()
    controller.expectOne(`${api}/tokens/get-by-email`).flush(envelope())
    expect(await retry).toBe(true)
    expect(session.errorCode()).toBeNull()
  })

  it('attaches credentials only to the configured origin/path', async () => {
    const { session, http, controller } = setup({
      apiUrl: api,
      withCredentials: true,
      tenant: 'alternate',
    })
    await signIn(session, controller)
    http.get(`${api}/users?x=1`).subscribe()
    const request = controller.expectOne(`${api}/users?x=1`)
    expect(request.request.headers.get('Authorization')).toMatch(/^Bearer /)
    expect(request.request.headers.get('tenant')).toBe('alternate')
    expect(request.request.withCredentials).toBe(true)
    expect(request.request.transferCache).toBe(false)
    request.flush({})
    for (const url of [
      'https://other.example.test/api/users',
      'https://auth.example.test/api-evil/users',
      'https://auth.example.test/apiculture',
      'http://auth.example.test/api/users',
      'https://auth.example.test:444/api/users',
      `${api}/tokens/get-by-email`,
      `${api}/tokens/refresh`,
      `${api}/personal/logout/`,
      `${api}/%2fsecret`,
      `${api}/%252fsecret`,
      `${api}/%74okens/refresh`,
      '//auth.example.test/api/users',
    ]) {
      http.get(url).subscribe()
      const isolated = controller.expectOne(url)
      expect(isolated.request.headers.has('Authorization')).toBe(false)
      expect(isolated.request.withCredentials).toBe(false)
      isolated.flush({})
    }
    http
      .get(`${api}/bypassed`, {
        context: new HttpContext().set(AUTH_BYPASS, true),
      })
      .subscribe()
    const bypassed = controller.expectOne(`${api}/bypassed`)
    expect(bypassed.request.headers.has('Authorization')).toBe(false)
    bypassed.flush({})
  })

  it('does not add credentials or refresh anonymous API requests', () => {
    const { http, controller } = setup({ apiUrl: api, withCredentials: true })
    const error = vi.fn()
    http.get(`${api}/public`).subscribe({ error })
    const request = controller.expectOne(`${api}/public`)
    expect(request.request.headers.has('Authorization')).toBe(false)
    expect(request.request.withCredentials).toBe(false)
    expect(request.request.credentials).toBe('omit')
    request.flush({}, { status: 401, statusText: 'Unauthorized' })
    expect(error).toHaveBeenCalledOnce()
  })

  it('supports root-relative APIs with exact browser origin matching', async () => {
    const { session, http, controller } = setup({ apiUrl: '/api' })
    await signIn(session, controller, tokens(), '/api')
    for (const url of ['/api/users', `${new URL(document.baseURI).origin}/api/users`]) {
      http.get(url).subscribe()
      const request = controller.expectOne(url)
      expect(request.request.headers.has('Authorization')).toBe(true)
      request.flush({})
    }
    for (const url of ['/api-evil/users', 'https://evil.test/api/users']) {
      http.get(url).subscribe()
      const request = controller.expectOne(url)
      expect(request.request.headers.has('Authorization')).toBe(false)
      request.flush({})
    }
  })

  it('never trusts an SSR document origin for a relative API', async () => {
    const { session, http, controller } = setup({ apiUrl: '/api' }, true)
    await signIn(session, controller, tokens(), '/api')
    expect(TestBed.inject(AUTH_CONFIG).origin).toBeNull()
    http.get(`${new URL(document.baseURI).origin}/api/private`).subscribe()
    const external = controller.expectOne(`${new URL(document.baseURI).origin}/api/private`)
    expect(external.request.headers.has('Authorization')).toBe(false)
    external.flush({})
    http.get('/api/private').subscribe()
    const internal = controller.expectOne('/api/private')
    expect(internal.request.headers.has('Authorization')).toBe(true)
    internal.flush({})
  })
})

describe('session concurrency and guards', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify()
    vi.restoreAllMocks()
  })

  it('single-flights concurrent 401s and retries both with rotated tokens', async () => {
    const { session, http, controller } = setup()
    await signIn(session, controller)
    const resultA = firstValueFrom(http.get(`${api}/a`))
    const resultB = firstValueFrom(http.get(`${api}/b`))
    controller.expectOne(`${api}/a`).flush({}, { status: 401, statusText: 'Unauthorized' })
    controller.expectOne(`${api}/b`).flush({}, { status: 401, statusText: 'Unauthorized' })
    const refresh = controller.expectOne(`${api}/tokens/refresh`)
    expect(refresh.request.body).toMatchObject({
      refreshToken: 'rotating-refresh-secret',
    })
    expect(refresh.request.headers.has('Authorization')).toBe(false)
    expect(session.status()).toBe('refreshing')
    const rotated = tokens({ jti: 'rotated' })
    refresh.flush(envelope(rotated))
    const retryA = controller.expectOne(`${api}/a`)
    const retryB = controller.expectOne(`${api}/b`)
    expect(retryA.request.headers.get('Authorization')).toBe(`Bearer ${rotated.token}`)
    expect(retryB.request.headers.get('Authorization')).toBe(`Bearer ${rotated.token}`)
    retryA.flush({ ok: 'a' })
    retryB.flush({ ok: 'b' })
    expect(await resultA).toEqual({ ok: 'a' })
    expect(await resultB).toEqual({ ok: 'b' })
  })

  it('does not rotate again on a delayed sibling 401 after refresh', async () => {
    const { session, http, controller } = setup()
    await signIn(session, controller)
    const a = firstValueFrom(http.get(`${api}/a`))
    const b = firstValueFrom(http.get(`${api}/b`))
    const oldB = controller.expectOne(`${api}/b`)
    controller.expectOne(`${api}/a`).flush({}, { status: 401, statusText: 'Unauthorized' })
    controller.expectOne(`${api}/tokens/refresh`).flush(envelope(tokens({ jti: 'new' })))
    controller.expectOne(`${api}/a`).flush({})
    oldB.flush({}, { status: 401, statusText: 'Unauthorized' })
    controller.expectOne(`${api}/b`).flush({})
    await Promise.all([a, b])
  })

  it('never retries an authenticated request more than once', async () => {
    const { session, http, controller } = setup()
    await signIn(session, controller)
    const result = firstValueFrom(http.get(`${api}/private`))
    const rejected = expect(result).rejects.toBeInstanceOf(HttpErrorResponse)
    controller.expectOne(`${api}/private`).flush({}, { status: 401, statusText: 'Unauthorized' })
    controller.expectOne(`${api}/tokens/refresh`).flush(envelope())
    controller.expectOne(`${api}/private`).flush({}, { status: 401, statusText: 'Unauthorized' })
    await rejected
  })

  it.each([422, 403, 500])('preserves session on API HTTP %i', async status => {
    const { session, http, controller } = setup()
    await signIn(session, controller)
    const version = session.version()
    const result = firstValueFrom(http.get(`${api}/private`))
    const rejected = expect(result).rejects.toBeInstanceOf(HttpErrorResponse)
    controller
      .expectOne(`${api}/private`)
      .flush({ messages: ['validation'], statusCode: status }, { status, statusText: 'Failure' })
    await rejected
    expect(session.isAuthenticated()).toBe(true)
    expect(session.version()).toBe(version)
  })

  it('does not refresh a non-API 401', async () => {
    const { session, http, controller } = setup()
    await signIn(session, controller)
    const result = firstValueFrom(http.get('https://other.example.test/api/private'))
    const rejected = expect(result).rejects.toBeInstanceOf(HttpErrorResponse)
    controller
      .expectOne('https://other.example.test/api/private')
      .flush({}, { status: 401, statusText: 'Unauthorized' })
    await rejected
    expect(session.isAuthenticated()).toBe(true)
  })

  it.each([401, 500])(
    'clears exactly once on terminal refresh HTTP %i and rethrows',
    async status => {
      const { session, http, controller } = setup()
      await signIn(session, controller)
      const changes: number[] = []
      session.changes$.subscribe(value => changes.push(value))
      const resultA = firstValueFrom(http.get(`${api}/a`))
      const resultB = firstValueFrom(http.get(`${api}/b`))
      const rejectedA = expect(resultA).rejects.toBeInstanceOf(HttpErrorResponse)
      const rejectedB = expect(resultB).rejects.toBeInstanceOf(HttpErrorResponse)
      controller.expectOne(`${api}/a`).flush({}, { status: 401, statusText: 'Unauthorized' })
      controller.expectOne(`${api}/b`).flush({}, { status: 401, statusText: 'Unauthorized' })
      controller
        .expectOne(`${api}/tokens/refresh`)
        .flush(
          { massage: 'failure', code: '9999', result: null },
          { status, statusText: 'Failure' },
        )
      await Promise.all([rejectedA, rejectedB])
      expect(session.user()).toBeNull()
      expect(session.status()).toBe('anonymous')
      expect(changes).toHaveLength(1)
      expect(session.error()).toContain('expired')
      expect(session.errorCode()).toBe('session-expired')
    },
  )

  it('clears on malformed successful refresh', async () => {
    const { session, controller } = setup()
    await signIn(session, controller)
    const result = firstValueFrom(session.refresh())
    const rejected = expect(result).rejects.toThrow()
    controller.expectOne(`${api}/tokens/refresh`).flush({ code: '2000', result: null })
    await rejected
    expect(session.user()).toBeNull()
    expect(session.errorCode()).toBe('session-expired')
  })

  it('checks access expiry at request time and refreshes with expired access', async () => {
    const { session, http, controller } = setup()
    const original = tokens()
    await signIn(session, controller, original)
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 600000)
    expect(session.isAuthenticated()).toBe(false)
    const result = firstValueFrom(http.get(`${api}/private`))
    controller.expectNone(`${api}/private`)
    const refresh = controller.expectOne(`${api}/tokens/refresh`)
    expect(refresh.request.body.token).toBe(original.token)
    refresh.flush(envelope(tokens()))
    controller.expectOne(`${api}/private`).flush({})
    await result
    expect(session.isAuthenticated()).toBe(true)
  })

  it('does not send expired refresh credentials and clears locally', async () => {
    const { session, controller } = setup()
    await signIn(session, controller)
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 7200000)
    await expect(firstValueFrom(session.refresh())).rejects.toThrow('expired')
    expect(session.user()).toBeNull()
    expect(session.errorCode()).toBe('session-expired')
  })

  it('clears immediately on logout and ignores best-effort bearer logout failure', async () => {
    const { session, controller } = setup()
    const value = tokens()
    await signIn(session, controller, value)
    const logout = session.logout()
    expect(session.user()).toBeNull()
    expect(session.status()).toBe('anonymous')
    const request = controller.expectOne(`${api}/personal/logout`)
    expect(request.request.method).toBe('GET')
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${value.token}`)
    expect(request.request.transferCache).toBe(false)
    request.flush({}, { status: 401, statusText: 'Unauthorized' })
    await expect(logout).resolves.toBeUndefined()
  })

  it('cancels pending login on logout without resurrection', async () => {
    const { session, controller } = setup()
    const login = session.login(credentials)
    const pending = controller.expectOne(`${api}/tokens/get-by-email`)
    await session.logout()
    expect(pending.cancelled).toBe(true)
    expect(await login).toBe(false)
    expect(session.user()).toBeNull()
  })

  it('cancels in-flight refresh and all subscribers on logout', async () => {
    const { session, controller } = setup()
    await signIn(session, controller)
    const refreshA = firstValueFrom(session.refresh())
    const refreshB = firstValueFrom(session.refresh())
    const rejectedA = expect(refreshA).rejects.toThrow('session changed')
    const rejectedB = expect(refreshB).rejects.toThrow('session changed')
    const pending = controller.expectOne(`${api}/tokens/refresh`)
    const logout = session.logout()
    expect(pending.cancelled).toBe(true)
    controller.expectOne(`${api}/personal/logout`).flush({})
    await Promise.all([rejectedA, rejectedB, logout])
    expect(session.user()).toBeNull()
    expect(session.error()).toBeNull()
    expect(session.errorCode()).toBeNull()
  })

  it('cancels in-flight authenticated feature requests on clear', async () => {
    const { session, http, controller } = setup()
    await signIn(session, controller)
    const result = firstValueFrom(http.get(`${api}/private`))
    const rejected = expect(result).rejects.toThrow('session changed')
    const request = controller.expectOne(`${api}/private`)
    session.clear()
    expect(request.cancelled).toBe(true)
    await rejected
  })

  it('does not replay completed refresh tokens after the session epoch changes', async () => {
    const { session, controller } = setup()
    await signIn(session, controller)
    const retained = session.refresh()
    const first = firstValueFrom(retained)
    controller.expectOne(`${api}/tokens/refresh`).flush(envelope(tokens({ jti: 'new' })))
    await first
    session.clear()
    await expect(firstValueFrom(retained)).rejects.toThrow('session changed')
  })

  it('ignores an old login failure after a newer successful login', async () => {
    const { session, controller } = setup()
    const old = session.login(credentials)
    const cancelled = controller.expectOne(`${api}/tokens/get-by-email`)
    const newer = session.login({
      username: 'new@example.test',
      password: 'new',
    })
    expect(cancelled.cancelled).toBe(true)
    controller
      .expectOne(`${api}/tokens/get-by-email`)
      .flush(envelope(tokens({ [`${identity}nameidentifier`]: 'new-identity' })))
    expect(await newer).toBe(true)
    expect(await old).toBe(false)
    expect(session.user()?.id).toBe('new-identity')
    expect(session.error()).toBeNull()
    expect(session.errorCode()).toBeNull()
  })

  it('does not let late backend adapter emissions restore a cleared session', async () => {
    const lateLogin = new Subject<AuthTokens>()
    const lateRefresh = new Subject<AuthTokens>()
    const adapter: AuthBackend = {
      login: () => lateLogin,
      refresh: () => lateRefresh,
      logout: () => of(null),
    }
    TestBed.configureTestingModule({
      providers: [
        provideAuth({ apiUrl: api }),
        { provide: AuthBackend, useValue: adapter },
        provideHttpClientTesting(),
      ],
    })
    const session = TestBed.inject(SessionStore)
    const login = session.login(credentials)
    session.clear()
    lateLogin.next(tokens())
    expect(await login).toBe(false)
    expect(session.user()).toBeNull()
    const secondLogin = session.login(credentials)
    lateLogin.next(tokens())
    expect(await secondLogin).toBe(true)
    const refresh = firstValueFrom(session.refresh())
    const rejected = expect(refresh).rejects.toThrow('session changed')
    await session.logout()
    lateRefresh.next(tokens())
    await rejected
    expect(session.isAuthenticated()).toBe(false)
  })

  it('isolates configurations and sessions across environment injectors', async () => {
    setup()
    const parent = TestBed.inject(EnvironmentInjector)
    const a = createEnvironmentInjector(
      [provideAuth({ apiUrl: '/first', tenant: 'one' }), provideHttpClientTesting()],
      parent,
    )
    const b = createEnvironmentInjector(
      [provideAuth({ apiUrl: '/second', tenant: 'two' }), provideHttpClientTesting()],
      parent,
    )
    try {
      expect(a.get(SessionStore)).not.toBe(b.get(SessionStore))
      expect(a.get(AUTH_CONFIG).apiUrl).toBe('/first')
      expect(b.get(AUTH_CONFIG).tenant).toBe('two')
      const login = a.get(SessionStore).login(credentials)
      const request = a.get(HttpTestingController).expectOne('/first/tokens/get-by-email')
      expect(request.request.headers.get('tenant')).toBe('one')
      request.flush(envelope())
      expect(await login).toBe(true)
      expect(b.get(SessionStore).isAuthenticated()).toBe(false)
      a.get(HttpTestingController).verify()
      b.get(HttpTestingController).verify()
    } finally {
      a.destroy()
      b.destroy()
    }
  })

  it.each([api, 'https://auth.example.test/child-api'])(
    'isolates parent and child authenticated HTTP chains with child prefix %s',
    async childApi => {
      const parent = setup({ apiUrl: api, tenant: 'parent' })
      const parentTokens = tokens({ jti: 'parent-session' })
      await signIn(parent.session, parent.controller, parentTokens)
      const child = createEnvironmentInjector(
        [provideAuth({ apiUrl: childApi, tenant: 'child' }), provideHttpClientTesting()],
        TestBed.inject(EnvironmentInjector),
      )
      const childController = child.get(HttpTestingController)
      try {
        const childHttp = child.get(HttpClient)
        const childSession = child.get(SessionStore)
        const childTokens = tokens({ jti: 'child-session' })
        expect(childHttp).not.toBe(parent.http)
        await signIn(childSession, childController, childTokens, childApi)

        const childResult = firstValueFrom(childHttp.get(`${childApi}/private`))
        const childRequest = childController.expectOne(`${childApi}/private`)
        expect(childRequest.request.headers.get('Authorization')).toBe(
          `Bearer ${childTokens.token}`,
        )
        expect(childRequest.request.headers.get('tenant')).toBe('child')
        expect(childRequest.request.transferCache).toBe(false)
        parent.controller.expectNone(`${childApi}/private`)
        childRequest.flush({ scope: 'child' })
        expect(await childResult).toEqual({ scope: 'child' })

        const parentResult = firstValueFrom(parent.http.get(`${api}/private`))
        const parentRequest = parent.controller.expectOne(`${api}/private`)
        expect(parentRequest.request.headers.get('Authorization')).toBe(
          `Bearer ${parentTokens.token}`,
        )
        expect(parentRequest.request.headers.get('tenant')).toBe('parent')
        childController.expectNone(`${api}/private`)
        parentRequest.flush({ scope: 'parent' })
        expect(await parentResult).toEqual({ scope: 'parent' })

        if (childApi !== api) {
          const outsideChildScope = firstValueFrom(childHttp.get(`${api}/private`))
          const outside = childController.expectOne(`${api}/private`)
          expect(outside.request.headers.has('Authorization')).toBe(false)
          expect(outside.request.headers.has('tenant')).toBe(false)
          parent.controller.expectNone(`${api}/private`)
          outside.flush({})
          await outsideChildScope
        }
        childSession.clear()
        expect(parent.session.isAuthenticated()).toBe(true)
      } finally {
        childController.verify()
        child.destroy()
      }
    },
  )

  it('uses alternate guard paths and safe return query values', () => {
    setup({
      apiUrl: api,
      loginUrl: '/account/sign-in?source=guard',
      afterLoginUrl: '/workspace',
    })
    const result = TestBed.runInInjectionContext(() =>
      authGuard(route(), state('/reports?filter=open')),
    ) as UrlTree
    expect(TestBed.inject(Router).serializeUrl(result)).toBe(
      '/account/sign-in?source=guard&returnUrl=%2Freports%3Ffilter%3Dopen',
    )
    const unsafe = TestBed.runInInjectionContext(() =>
      authGuard(route(), state('//evil.test')),
    ) as UrlTree
    expect(unsafe.queryParams['returnUrl']).toBe('/workspace')
  })

  it('redirects authenticated guests safely and enforces normalized roles', async () => {
    const { session, controller } = setup({
      apiUrl: api,
      afterLoginUrl: '/workspace',
    })
    expect(TestBed.runInInjectionContext(() => guestGuard(route(), state()))).toBe(true)
    await signIn(session, controller)
    const result = TestBed.runInInjectionContext(() =>
      guestGuard(route('/reports'), state()),
    ) as UrlTree
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/reports')
    const fallback = TestBed.runInInjectionContext(() =>
      guestGuard(route('/%2fexternal'), state()),
    ) as UrlTree
    expect(TestBed.inject(Router).serializeUrl(fallback)).toBe('/workspace')
    expect(
      TestBed.runInInjectionContext(() => requireRoles(['Client', 'Admin'])(route(), state())),
    ).toBe(true)
    const denied = TestBed.runInInjectionContext(() => requireRoles(['Owner'])(route(), state()))
    expect(denied).toBe(false)
  })

  it('cancels role denial even when afterLoginUrl is the same protected route', async () => {
    const { session, controller } = setup({ apiUrl: api, afterLoginUrl: '/workspace' })
    await signIn(session, controller)
    const guard = requireRoles(['Client', 'Owner'])
    for (let attempt = 0; attempt < 2; attempt++) {
      expect(TestBed.runInInjectionContext(() => guard(route(), state('/workspace')))).toBe(false)
    }
    expect(
      TestBed.runInInjectionContext(() =>
        requireRoles(['Client', 'Admin'])(route(), state('/workspace')),
      ),
    ).toBe(true)
    expect(
      TestBed.runInInjectionContext(() => requireRoles([])(route(), state('/workspace'))),
    ).toBe(true)
  })

  it('retains the configured login redirect for anonymous role-protected navigation', () => {
    setup({ apiUrl: api, loginUrl: '/sign-in', afterLoginUrl: '/workspace' })
    const result = TestBed.runInInjectionContext(() =>
      requireRoles(['Owner'])(route(), state('/workspace')),
    ) as UrlTree
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/sign-in?returnUrl=%2Fworkspace')
  })

  it('cancels role denial after refreshing an expired access token', async () => {
    const { session, controller } = setup({ apiUrl: api, afterLoginUrl: '/workspace' })
    await signIn(session, controller)
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 600000)
    const guardResult = TestBed.runInInjectionContext(() =>
      requireRoles(['Owner'])(route(), state('/workspace')),
    ) as Observable<boolean | UrlTree>
    const result = firstValueFrom(guardResult)
    controller.expectOne(`${api}/tokens/refresh`).flush(envelope(tokens()))
    expect(await result).toBe(false)
    expect(session.isAuthenticated()).toBe(true)
  })

  it('checks expiry during navigation instead of retaining cached authentication', async () => {
    const { session, controller } = setup({
      apiUrl: api,
      loginUrl: '/sign-in',
      afterLoginUrl: '/home',
    })
    await signIn(session, controller)
    expect(TestBed.runInInjectionContext(() => authGuard(route(), state()))).toBe(true)
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 600000)
    const guard = TestBed.runInInjectionContext(() =>
      authGuard(route(), state('/reports')),
    ) as Observable<boolean | UrlTree>
    const result = firstValueFrom(guard)
    controller.expectOne(`${api}/tokens/refresh`).flush({}, { status: 500, statusText: 'Failure' })
    const tree = (await result) as UrlTree
    expect(TestBed.inject(Router).serializeUrl(tree)).toBe('/sign-in?returnUrl=%2Freports')
  })
})

describe('safeReturnUrl', () => {
  it.each([
    '//evil.test',
    'https://evil.test',
    'javascript:alert(1)',
    '/\\evil.test',
    '/%5cevil',
    '/%2fevil',
    '/%252fevil',
    '/%255cevil',
    '/\n/evil',
    '/%00evil',
    '/%20evil',
    '/bad%',
    ' /safe',
    '/login?returnUrl=/login',
    '/login#section',
    '/%6cogin',
    '/login;mode=guest',
    {},
    null,
    undefined,
  ])('rejects unsafe value %j', value => {
    expect(safeReturnUrl(value, '/fallback')).toBe('/fallback')
  })
  it.each(['/reports?sort=name#row', '/workspace', '/users/%D8%B9%D9%84%DB%8C', '/'])(
    'preserves valid local URL %s',
    value => {
      expect(safeReturnUrl(value, '/fallback')).toBe(value)
    },
  )
  it('also validates fallback', () => {
    expect(safeReturnUrl(undefined, '//evil.test')).toBe('/')
  })
  it('prevents alternate configured login paths from becoming return loops', () => {
    expect(
      safeReturnUrl(
        '/account/sign-in?returnUrl=/account/sign-in',
        '/workspace',
        '/account/sign-in',
      ),
    ).toBe('/workspace')
  })
})
