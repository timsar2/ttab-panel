import { HttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import {
  PLATFORM_ID,
  REQUEST,
  REQUEST_CONTEXT,
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
import { Observable, firstValueFrom } from 'rxjs'
import {
  AUTH_CONFIG,
  AuthSession,
  SessionStore,
  authGuard,
  guestGuard,
  provideAuth,
  requireRoles,
} from '../index'

const metadata = (): AuthSession => ({
  user: {
    id: '123',
    businessEntityId: 17,
    companyId: 29,
    firstName: 'First',
    lastName: 'Last',
    roles: ['Admin'],
  },
  expiresAt: Date.now() + 300_000,
})
const route = { queryParamMap: convertToParamMap({}) } as ActivatedRouteSnapshot
const state = { url: '/workspace' } as RouterStateSnapshot

function setup(serverSession?: AuthSession | null) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideAuth({ apiUrl: '/api', mode: 'cookie', afterLoginUrl: '/workspace' }),
      provideHttpClientTesting(),
      ...(serverSession !== undefined
        ? [
            { provide: PLATFORM_ID, useValue: 'server' },
            { provide: REQUEST_CONTEXT, useValue: { authSession: serverSession } },
          ]
        : []),
    ],
  })
  return {
    session: TestBed.inject(SessionStore),
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
  }
}

describe('cookie authentication', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify())

  it('stores only public metadata and uses credentialed same-origin login', async () => {
    const { session, controller } = setup()
    const login = session.login({ username: 'person@example.test', password: 'secret' })
    const request = controller.expectOne('/api/auth/login')
    expect(request.request.body).toEqual({ username: 'person@example.test', password: 'secret' })
    expect(request.request.credentials).toBe('same-origin')
    expect(request.request.headers.get('X-Auth-Request')).toBe('1')
    expect(request.request.transferCache).toBe(false)
    const value = metadata()
    request.flush({ ...value, token: 'must-not-be-stored', refreshToken: 'must-not-be-stored' })
    expect(await login).toBe(true)
    expect(session.user()).toEqual(value.user)
    expect(session.accessToken()).toBeNull()
    expect(JSON.stringify(session.user())).not.toContain('must-not-be-stored')
  })

  it('restores once for concurrent guards before authorizing navigation', async () => {
    const { controller, session } = setup()
    const first = TestBed.runInInjectionContext(() =>
      authGuard(route, state),
    ) as Observable<boolean>
    const second = TestBed.runInInjectionContext(() =>
      requireRoles(['Admin'])(route, state),
    ) as Observable<boolean>
    const a = firstValueFrom(first)
    const b = firstValueFrom(second)
    expect(session.isAuthenticated()).toBe(false)
    controller.expectOne('/api/auth/session').flush(metadata())
    expect(await a).toBe(true)
    expect(await b).toBe(true)
  })

  it('redirects failed restoration to login with a safe return URL', async () => {
    const { controller } = setup()
    const result = firstValueFrom(
      TestBed.runInInjectionContext(() => authGuard(route, state)) as Observable<UrlTree>,
    )
    controller.expectOne('/api/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' })
    expect(TestBed.inject(Router).serializeUrl(await result)).toBe('/login?returnUrl=%2Fworkspace')
  })

  it('restores guest routes and denies missing roles without redirect loops', async () => {
    const { controller } = setup()
    const result = firstValueFrom(
      TestBed.runInInjectionContext(() => guestGuard(route, state)) as Observable<UrlTree>,
    )
    controller.expectOne('/api/auth/session').flush(metadata())
    expect(TestBed.inject(Router).serializeUrl(await result)).toBe('/workspace')
    expect(TestBed.runInInjectionContext(() => requireRoles(['Missing'])(route, state))).toBe(false)
  })

  it('does not restore a session after logout while restoration is pending', async () => {
    const { controller, session } = setup()
    const restoration = firstValueFrom(session.restore())
    const request = controller.expectOne('/api/auth/session')
    const logout = session.logout()
    expect(request.cancelled).toBe(true)
    controller.expectOne('/api/auth/logout').flush({})
    await logout
    expect(await restoration).toBe(false)
    expect(session.isAuthenticated()).toBe(false)
  })

  it('refreshes parallel 401s once and never attaches bearer headers', async () => {
    const { controller, session, http } = setup()
    const restoration = firstValueFrom(session.restore())
    controller.expectOne('/api/auth/session').flush(metadata())
    await restoration
    const a = firstValueFrom(http.get('/api/one', { headers: { Authorization: 'Bearer unsafe' } }))
    const b = firstValueFrom(http.get('/api/two'))
    for (const path of ['one', 'two']) {
      const request = controller.expectOne(`/api/${path}`)
      expect(request.request.headers.has('Authorization')).toBe(false)
      expect(request.request.headers.get('X-Auth-Request')).toBe('1')
      expect(request.request.transferCache).toBe(false)
      request.flush({}, { status: 401, statusText: 'Unauthorized' })
    }
    controller.expectOne('/api/auth/refresh').flush(metadata())
    controller.expectOne('/api/one').flush({ ok: true })
    controller.expectOne('/api/two').flush({ ok: true })
    expect(await a).toEqual({ ok: true })
    expect(await b).toEqual({ ok: true })
  })

  it('does not reauthenticate from the cookie while logout is pending or failed', async () => {
    const { controller, session } = setup()
    const restoration = firstValueFrom(session.restore())
    controller.expectOne('/api/auth/session').flush(metadata())
    await restoration
    const logout = session.logout()
    expect(await firstValueFrom(session.restore())).toBe(false)
    controller.expectNone('/api/auth/session')
    controller.expectOne('/api/auth/logout').flush({}, { status: 503, statusText: 'Unavailable' })
    await logout
    expect(await firstValueFrom(session.restore())).toBe(false)
    expect(session.user()).toBeNull()
  })

  it('waits for logout before issuing a new login cookie', async () => {
    const { controller, session } = setup()
    const logout = session.logout()
    const login = session.login({ username: 'person@example.test', password: 'secret' })
    controller.expectNone('/api/auth/login')
    controller.expectOne('/api/auth/logout').flush({})
    await logout
    controller.expectOne('/api/auth/login').flush(metadata())
    expect(await login).toBe(true)
  })

  it('leaves third-party requests untouched', () => {
    const { http, controller } = setup()
    http.get('https://other.test/api/private').subscribe()
    const request = controller.expectOne('https://other.test/api/private')
    expect(request.request.withCredentials).toBe(false)
    expect(request.request.headers.has('X-Auth-Request')).toBe(false)
    request.flush({})
  })

  it.each([true, false])(
    'uses only validated request-scoped metadata on SSR (authenticated=%s)',
    async authenticated => {
      const { controller } = setup(authenticated ? metadata() : null)
      const result = await firstValueFrom(
        TestBed.runInInjectionContext(() => authGuard(route, state)) as Observable<
          boolean | UrlTree
        >,
      )
      expect(result === true).toBe(authenticated)
      controller.expectNone('/api/auth/session')
    },
  )

  it('rejects a cross-origin cookie API configuration', () => {
    TestBed.configureTestingModule({
      providers: [
        provideAuth({ apiUrl: 'https://other.test/api', mode: 'cookie' }),
        provideHttpClientTesting(),
      ],
    })
    expect(TestBed.inject(AUTH_CONFIG).configured).toBe(false)
  })

  it('forwards SSR reads only to the host-configured BFF origin with the session cookie', () => {
    TestBed.configureTestingModule({
      providers: [
        provideAuth({ apiUrl: '/api', mode: 'cookie' }),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: REQUEST_CONTEXT, useValue: { authApiOrigin: 'https://panel.example.test' } },
        {
          provide: REQUEST,
          useValue: new Request('https://untrusted-host.test/workspace', {
            headers: { cookie: '__Host-auth-session=session-handle; unrelated=private' },
          }),
        },
      ],
    })
    const controller = TestBed.inject(HttpTestingController)
    TestBed.inject(HttpClient)
      .get('/api/companies?page=1', {
        headers: { Authorization: 'Bearer unsafe', Cookie: 'spoofed=cookie' },
      })
      .subscribe()
    const request = controller.expectOne('https://panel.example.test/api/companies?page=1')
    expect(request.request.headers.get('Cookie')).toBe('__Host-auth-session=session-handle')
    expect(request.request.headers.has('Authorization')).toBe(false)
    expect(request.request.transferCache).toBe(false)
    expect(request.request.redirect).toBe('error')
    request.flush([])
  })

  it('fails closed for SSR writes or a missing trusted BFF origin', async () => {
    const { http, controller } = setup(null)
    await expect(firstValueFrom(http.get('/api/companies'))).rejects.toThrow('SSR API transport')
    await expect(firstValueFrom(http.post('/api/companies', {}))).rejects.toThrow(
      'SSR API transport',
    )
    controller.expectNone('/api/companies')
  })
})
