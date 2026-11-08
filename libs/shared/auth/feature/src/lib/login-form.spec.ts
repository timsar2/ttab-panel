import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_APPEARANCE } from './auth-feature.providers'
import { LoginForm } from './login-form'

describe('LoginForm', () => {
  let fixture: ComponentFixture<LoginForm>
  let element: HTMLElement
  const direction = signal<'rtl' | 'ltr'>('rtl')
  const theme = signal<'light' | 'dark'>('light')

  beforeEach(async () => {
    direction.set('rtl')
    theme.set('light')
    await TestBed.configureTestingModule({
      imports: [LoginForm],
      providers: [
        {
          provide: AUTH_APPEARANCE,
          useValue: {
            direction: direction.asReadonly(),
            theme: theme.asReadonly(),
          },
        },
      ],
    }).compileComponents()
    fixture = TestBed.createComponent(LoginForm)
    element = fixture.nativeElement
    await fixture.whenStable()
  })

  function input(id: string, value: string): HTMLInputElement {
    const control = element.querySelector(`#${id}`) as HTMLInputElement
    control.value = value
    control.dispatchEvent(new Event('input', { bubbles: true }))
    return control
  }

  it('keeps controls disabled until their first browser render completes', async () => {
    const pending = TestBed.createComponent(LoginForm)
    expect(pending.componentInstance.loginForm.username().disabled()).toBe(true)
    expect(pending.componentInstance.loginForm.password().disabled()).toBe(true)
    await pending.whenStable()
    expect(pending.componentInstance.loginForm.username().disabled()).toBe(false)
    expect(pending.nativeElement.querySelector('input').disabled).toBe(false)
  })

  it('starts in Persian with labels, autocomplete and neutral pristine validation', () => {
    expect(element.getAttribute('dir')).toBe('rtl')
    expect(element.getAttribute('lang')).toBe('fa')
    expect(element.querySelector('h1')?.textContent).toContain('ورود به پنل مدیریت')
    expect(element.querySelector('label[for="username"]')).toBeTruthy()
    expect(element.querySelector('#username')?.getAttribute('autocomplete')).toBe('username')
    expect(element.querySelector('#password')?.getAttribute('autocomplete')).toBe(
      'current-password',
    )
    expect(element.querySelector('#password')?.getAttribute('type')).toBe('password')
    expect(element.querySelector('hlm-field-error')).toBeNull()
    for (const control of element.querySelectorAll('input')) {
      expect(control.getAttribute('aria-invalid')).not.toBe('true')
      expect(control.getAttribute('data-invalid')).not.toBe('true')
      expect(control.getAttribute('data-matches-spartan-invalid')).not.toBe('true')
      expect(control.getAttribute('aria-describedby')).toBeNull()
    }
  })

  it('marks empty fields touched, describes errors and focuses the first invalid input', async () => {
    const emit = vi.fn()
    fixture.componentInstance.credentialsSubmit.subscribe(emit)
    await fixture.componentInstance.onSubmit(new Event('submit', { cancelable: true }))
    await fixture.whenStable()
    expect(fixture.componentInstance.loginForm.username().touched()).toBe(true)
    expect(fixture.componentInstance.loginForm.password().touched()).toBe(true)
    for (const control of element.querySelectorAll('input')) {
      expect(control.getAttribute('aria-invalid')).toBe('true')
      expect(control.getAttribute('data-matches-spartan-invalid')).toBe('true')
      const description = control.getAttribute('aria-describedby')
      expect(element.querySelector(`#${description}`)?.textContent?.trim()).toBeTruthy()
    }
    expect(document.activeElement).toBe(element.querySelector('#username'))
    expect(emit).not.toHaveBeenCalled()
  })

  it.each([
    ['rtl', 'light'],
    ['rtl', 'dark'],
    ['ltr', 'light'],
    ['ltr', 'dark'],
  ] as const)(
    'gates errors on blur/submit and clears corrected errors in %s/%s',
    async (dir, mode) => {
      direction.set(dir)
      theme.set(mode)
      await fixture.whenStable()
      const username = element.querySelector('#username') as HTMLInputElement
      username.dispatchEvent(new Event('blur'))
      await fixture.whenStable()
      expect(username.getAttribute('aria-invalid')).toBe('true')
      expect(username.getAttribute('aria-describedby')).toBe('username-error')
      expect(element.querySelector('#password-error')).toBeNull()
      input('username', 'editor')
      await fixture.whenStable()
      expect(username.getAttribute('aria-invalid')).not.toBe('true')
      expect(username.getAttribute('aria-describedby')).toBeNull()
      expect(element.querySelector('#username-error')).toBeNull()
      await fixture.componentInstance.onSubmit(new Event('submit', { cancelable: true }))
      await fixture.whenStable()
      expect(document.activeElement).toBe(element.querySelector('#password'))
      input('password', 'x')
      await fixture.whenStable()
      expect(element.querySelector('#password-error')).toBeNull()
    },
  )

  it('emits typed credentials without imposing a minimum password length', async () => {
    const emit = vi.fn()
    fixture.componentInstance.credentialsSubmit.subscribe(emit)
    input('username', 'editor')
    input('password', 'x')
    element
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await fixture.whenStable()
    expect(emit).toHaveBeenCalledExactlyOnceWith({
      username: 'editor',
      password: 'x',
    })
  })

  it('reveals the same password control and preserves its value', async () => {
    const password = input('password', 'example')
    const toggle = element.querySelector('[aria-controls="password"]') as HTMLButtonElement
    toggle.click()
    await fixture.whenStable()
    expect(password.type).toBe('text')
    expect(toggle.getAttribute('aria-label')).toBe('پنهان کردن رمز عبور')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    toggle.click()
    await fixture.whenStable()
    expect(password.type).toBe('password')
    expect(password.value).toBe('example')
  })

  it('reacts to locale changes without replacing controls or credentials', async () => {
    const username = input('username', 'editor')
    username.focus()
    direction.set('ltr')
    await fixture.whenStable()
    expect(element.getAttribute('lang')).toBe('en')
    expect(element.querySelector('h1')?.textContent).toContain('Sign in to your panel')
    expect(element.querySelector('#username')).toBe(username)
    expect(document.activeElement).toBe(username)
    expect(username.placeholder).toBe('Enter your username')
    expect(fixture.componentInstance.credentials().username).toBe('editor')
  })

  it('disables duplicate submissions while busy and renders supplied error as text', async () => {
    const emit = vi.fn()
    fixture.componentInstance.credentialsSubmit.subscribe(emit)
    fixture.componentRef.setInput('busy', true)
    fixture.componentRef.setInput('error', 'Invalid credentials <script>alert(1)</script>')
    await fixture.whenStable()
    await fixture.componentInstance.onSubmit(new Event('submit'))
    expect(emit).not.toHaveBeenCalled()
    expect((element.querySelector('[type="submit"]') as HTMLButtonElement).disabled).toBe(true)
    expect((element.querySelector('#username') as HTMLInputElement).disabled).toBe(true)
    expect(element.querySelector('form')?.getAttribute('aria-busy')).toBe('true')
    expect(element.querySelector('[aria-live]')?.textContent).toContain(
      'Invalid credentials <script>',
    )
    expect(element.querySelector('script')).toBeNull()
  })
})
