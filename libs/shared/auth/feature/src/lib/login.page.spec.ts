import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router'
import { AUTH_CONFIG, AuthErrorCode, SessionStore, guestGuard } from '@org/auth-data-access'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_APPEARANCE, provideAuthFeature } from './auth-feature.providers'
import { createAuthRoutes } from './auth.routes'
import { LoginPage } from './login.page'

describe('LoginPage', () => {
  const configured = signal(true)
  const status = signal<'anonymous' | 'authenticating' | 'authenticated' | 'refreshing'>(
    'anonymous',
  )
  const error = signal<string | null>(null)
  const errorCode = signal<AuthErrorCode | null>(null)
  const direction = signal<'rtl' | 'ltr'>('rtl')
  const theme = signal<'light' | 'dark'>('light')
  const login = vi.fn<(credentials: { username: string; password: string }) => Promise<boolean>>()
  const credentials = { username: 'editor', password: 'x' }
  let returnUrl: string | null = '/reports?tab=mine'

  beforeEach(() => {
    configured.set(true)
    status.set('anonymous')
    error.set(null)
    errorCode.set(null)
    direction.set('rtl')
    theme.set('light')
    returnUrl = '/reports?tab=mine'
    login.mockReset().mockResolvedValue(true)
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        provideAuthFeature({
          brandName: 'Transit Console',
          footer: 'Operator portal',
        }),
        {
          provide: AUTH_CONFIG,
          useValue: { loginUrl: '/login', afterLoginUrl: '/workspace' },
        },
        {
          provide: SessionStore,
          useValue: {
            configured,
            status,
            error,
            errorCode,
            login,
            user: signal(null),
            isAuthenticated: signal(false),
            logout: vi.fn(),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParamMap() {
                return convertToParamMap({ returnUrl })
              },
            },
          },
        },
      ],
    })
  })

  it('uses configured brand/footer and works without a preferences adapter', async () => {
    const fixture = TestBed.createComponent(LoginPage)
    await fixture.whenStable()
    const element: HTMLElement = fixture.nativeElement
    expect(element.textContent).toContain('Transit Console')
    expect(element.querySelector('.page-footer')?.textContent).toContain('Operator portal')
    expect(element.textContent).not.toContain('Press')
    expect(element.querySelector('.preferences')).toBeNull()
    expect(element.getAttribute('dir')).toBe('rtl')
  })

  it('navigates only after successful login to the safe return URL', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true)
    const fixture = TestBed.createComponent(LoginPage)
    await fixture.componentInstance.onSubmit(credentials)
    expect(login).toHaveBeenCalledExactlyOnceWith(credentials)
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/reports?tab=mine')
  })

  it.each(['https://evil.example', '//evil.example', '/login?returnUrl=/login', null])(
    'uses configured fallback for unsafe/missing return URL %s',
    async url => {
      returnUrl = url
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true)
      const fixture = TestBed.createComponent(LoginPage)
      await fixture.componentInstance.onSubmit(credentials)
      expect(navigate).toHaveBeenCalledExactlyOnceWith('/workspace')
    },
  )

  it('shows actual sanitized session failure, not an unconfigured message', async () => {
    login.mockImplementation(async () => {
      error.set('The username or password is incorrect.')
      return false
    })
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl')
    const fixture = TestBed.createComponent(LoginPage)
    await fixture.componentInstance.onSubmit(credentials)
    await fixture.whenStable()
    expect(fixture.nativeElement.textContent).toContain('The username or password is incorrect.')
    expect(fixture.nativeElement.textContent).not.toContain('این نسخه به سرویس')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('prevents return loops with alternate configured login paths', async () => {
    returnUrl = '/sign-in?returnUrl=/reports'
    TestBed.overrideProvider(AUTH_CONFIG, {
      useValue: { loginUrl: '/sign-in', afterLoginUrl: '/dispatch' },
    })
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true)
    const fixture = TestBed.createComponent(LoginPage)
    await fixture.componentInstance.onSubmit(credentials)
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/dispatch')
  })

  it.each([
    ['rtl', 'نام کاربری یا رمز عبور نادرست است.'],
    ['ltr', 'The username or password is incorrect.'],
  ] as const)('localizes invalid-credentials (401) feedback in %s', async (locale, message) => {
    direction.set(locale)
    TestBed.overrideProvider(AUTH_APPEARANCE, {
      useValue: {
        direction: direction.asReadonly(),
        theme: theme.asReadonly(),
      },
    })
    login.mockImplementation(async () => {
      errorCode.set('invalid-credentials')
      error.set('Internal backend diagnostic that must not appear')
      return false
    })
    const fixture = TestBed.createComponent(LoginPage)
    await fixture.componentInstance.onSubmit(credentials)
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[aria-live]')?.textContent).toContain(message)
    expect(fixture.nativeElement.textContent).not.toContain('Internal backend diagnostic')
    expect(login).toHaveBeenCalledExactlyOnceWith(credentials)
  })

  it('translates an existing sign-in error when locale changes without a new request', async () => {
    TestBed.overrideProvider(AUTH_APPEARANCE, {
      useValue: {
        direction: direction.asReadonly(),
        theme: theme.asReadonly(),
      },
    })
    login.mockImplementation(async () => {
      errorCode.set('invalid-credentials')
      error.set('The username or password is incorrect.')
      return false
    })
    const fixture = TestBed.createComponent(LoginPage)
    await fixture.componentInstance.onSubmit(credentials)
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[aria-live]')?.textContent).toContain(
      'نام کاربری یا رمز عبور نادرست است.',
    )
    direction.set('ltr')
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[aria-live]')?.textContent).toContain(
      'The username or password is incorrect.',
    )
    direction.set('rtl')
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[aria-live]')?.textContent).toContain(
      'نام کاربری یا رمز عبور نادرست است.',
    )
    expect(login).toHaveBeenCalledTimes(1)
  })

  it.each([
    [
      'configuration',
      'سرویس احراز هویت به درستی پیکربندی نشده است. با پشتیبانی تماس بگیرید.',
      'The authentication service is not configured correctly. Contact support.',
    ],
    [
      'unavailable',
      'سرویس احراز هویت در دسترس نیست. دوباره تلاش کنید.',
      'The authentication service is unavailable. Try again.',
    ],
    [
      'invalid-response',
      'پاسخ معتبری از سرویس احراز هویت دریافت نشد. دوباره تلاش کنید.',
      'The authentication service returned an invalid response. Try again.',
    ],
    [
      'session-expired',
      'نشست شما منقضی شده است. دوباره وارد شوید.',
      'Your session has expired. Sign in again.',
    ],
  ] as const)(
    'renders safe localized %s feedback instead of diagnostic details',
    async (code, persian, english) => {
      TestBed.overrideProvider(AUTH_APPEARANCE, {
        useValue: {
          direction: direction.asReadonly(),
          theme: theme.asReadonly(),
        },
      })
      errorCode.set(code)
      error.set('Internal backend diagnostic that must not appear')
      const fixture = TestBed.createComponent(LoginPage)
      await fixture.whenStable()
      expect(fixture.nativeElement.querySelector('[aria-live]')?.textContent).toContain(persian)
      expect(fixture.nativeElement.textContent).not.toContain('Internal backend diagnostic')
      direction.set('ltr')
      await fixture.whenStable()
      expect(fixture.nativeElement.querySelector('[aria-live]')?.textContent).toContain(english)
      expect(fixture.nativeElement.textContent).not.toContain('Internal backend diagnostic')
      expect(login).not.toHaveBeenCalled()
    },
  )

  it('does not call login when unconfigured and displays honest feedback', async () => {
    configured.set(false)
    errorCode.set('configuration')
    error.set('Internal backend diagnostic that must not appear')
    const fixture = TestBed.createComponent(LoginPage)
    await fixture.componentInstance.onSubmit(credentials)
    await fixture.whenStable()
    expect(login).not.toHaveBeenCalled()
    expect(fixture.nativeElement.textContent).toContain('اطلاعات شما ارسال نشد')
    expect(fixture.nativeElement.textContent).not.toContain('Internal backend diagnostic')
  })

  it('blocks duplicate submissions before and during pending session requests', async () => {
    let resolve: (value: boolean) => void = () => undefined
    login.mockImplementation(
      () =>
        new Promise<boolean>(done => {
          resolve = done
        }),
    )
    const fixture = TestBed.createComponent(LoginPage)
    const pending = fixture.componentInstance.onSubmit(credentials)
    await fixture.componentInstance.onSubmit(credentials)
    expect(login).toHaveBeenCalledTimes(1)
    resolve(false)
    await pending
    status.set('refreshing')
    await fixture.componentInstance.onSubmit(credentials)
    expect(login).toHaveBeenCalledTimes(1)
  })

  it('delegates existing appearance actions and preserves focused button', async () => {
    TestBed.overrideProvider(AUTH_APPEARANCE, {
      useValue: {
        direction: direction.asReadonly(),
        theme: theme.asReadonly(),
        toggleDirection: () => direction.set('ltr'),
        toggleTheme: () => theme.set('dark'),
      },
    })
    const fixture = TestBed.createComponent(LoginPage)
    await fixture.whenStable()
    const element: HTMLElement = fixture.nativeElement
    const language = element.querySelector('.preferences button') as HTMLButtonElement
    language.focus()
    language.click()
    await fixture.whenStable()
    expect(element.getAttribute('lang')).toBe('en')
    expect(document.activeElement).toBe(language)
    const mode = element.querySelector('[aria-label="Switch to dark theme"]') as HTMLButtonElement
    mode.click()
    await fixture.whenStable()
    expect(theme()).toBe('dark')
    expect(mode.getAttribute('aria-label')).toBe('Switch to light theme')
    expect(mode.getAttribute('aria-pressed')).toBe('true')
  })

  it('creates guarded default and alternate routes with lazy smart page', async () => {
    expect(createAuthRoutes()[0].path).toBe('login')
    const route = createAuthRoutes({
      path: 'sign-in',
      title: 'Fleet sign in',
    })[0]
    expect(route.path).toBe('sign-in')
    expect(route.title).toBe('Fleet sign in')
    expect(route.canActivate).toEqual([guestGuard])
    expect(await TestBed.runInInjectionContext(() => route.loadComponent?.())).toBe(LoginPage)
  })
})
