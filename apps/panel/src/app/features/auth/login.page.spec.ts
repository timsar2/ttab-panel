import {
  computed,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PreferencesStore } from '../../core/preferences/preferences.store';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let element: HTMLElement;
  const direction = signal<'rtl' | 'ltr'>('rtl');
  const theme = signal<'light' | 'dark'>('light');
  const preferences = {
    direction,
    theme,
    isRtl: computed(() => direction() === 'rtl'),
    toggleDirection: () =>
      direction.update((value) => (value === 'rtl' ? 'ltr' : 'rtl')),
    toggleTheme: () =>
      theme.update((value) => (value === 'light' ? 'dark' : 'light')),
  };

  beforeEach(async () => {
    direction.set('rtl');
    theme.set('light');
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideZonelessChangeDetection(),
        { provide: PreferencesStore, useValue: preferences },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginPage);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  function input(id: string, value: string): void {
    const control = element.querySelector(`#${id}`) as HTMLInputElement;
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('starts in Persian with associated labels and credential autocomplete', () => {
    expect(element.getAttribute('dir')).toBe('rtl');
    expect(element.getAttribute('lang')).toBe('fa');
    expect(element.querySelector('h1')?.textContent).toContain(
      'ورود به پنل مدیریت',
    );
    expect(element.querySelector('label[for="username"]')).toBeTruthy();
    expect(
      element.querySelector('#username')?.getAttribute('autocomplete'),
    ).toBe('username');
    expect(
      element.querySelector('#password')?.getAttribute('autocomplete'),
    ).toBe('current-password');
    expect(element.querySelector('#password')?.getAttribute('type')).toBe(
      'password',
    );
    expect(element.querySelector('#username-error')).toBeNull();
    for (const control of element.querySelectorAll('input')) {
      expect(control.getAttribute('aria-invalid')).not.toBe('true');
      expect(control.getAttribute('data-invalid')).not.toBe('true');
      expect(control.getAttribute('data-matches-spartan-invalid')).not.toBe(
        'true',
      );
      expect(control.getAttribute('aria-describedby')).toBeNull();
    }
  });

  it('marks empty fields touched, describes errors and focuses the first invalid field', async () => {
    await fixture.componentInstance.onSubmit(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.loginForm.username().touched()).toBe(true);
    expect(fixture.componentInstance.loginForm.password().touched()).toBe(true);
    expect(
      element.querySelector('#username')?.getAttribute('aria-describedby'),
    ).toBe('username-error');
    expect(element.querySelector('#password-error')).toBeTruthy();
    for (const control of element.querySelectorAll('input')) {
      expect(control.getAttribute('aria-invalid')).toBe('true');
      expect(control.getAttribute('data-invalid')).toBe('true');
      expect(control.getAttribute('data-matches-spartan-invalid')).toBe('true');
      const description = control.getAttribute('aria-describedby');
      expect(
        element.querySelector(`#${description}`)?.textContent?.trim(),
      ).toBeTruthy();
    }
    expect(document.activeElement).toBe(element.querySelector('#username'));
    expect(fixture.componentInstance.feedback()).toBe('invalid');
  });

  it.each([
    ['rtl', 'light'],
    ['rtl', 'dark'],
    ['ltr', 'light'],
    ['ltr', 'dark'],
  ] as const)(
    'only exposes errors after blur and clears them on correction in %s/%s',
    async (dir, mode) => {
      direction.set(dir);
      theme.set(mode);
      await fixture.whenStable();
      const username = element.querySelector('#username') as HTMLInputElement;
      const password = element.querySelector('#password') as HTMLInputElement;
      expect(username.getAttribute('aria-invalid')).not.toBe('true');
      expect(password.getAttribute('aria-invalid')).not.toBe('true');

      username.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
      expect(username.getAttribute('aria-invalid')).toBe('true');
      expect(username.getAttribute('data-matches-spartan-invalid')).toBe(
        'true',
      );
      expect(username.getAttribute('aria-describedby')).toBe('username-error');
      expect(
        element.querySelector('#username-error')?.textContent?.trim(),
      ).toBeTruthy();
      expect(password.getAttribute('aria-invalid')).not.toBe('true');
      expect(element.querySelector('#password-error')).toBeNull();

      input('username', 'editor');
      await fixture.whenStable();
      expect(username.getAttribute('aria-invalid')).not.toBe('true');
      expect(username.getAttribute('data-invalid')).not.toBe('true');
      expect(username.getAttribute('data-matches-spartan-invalid')).not.toBe(
        'true',
      );
      expect(username.getAttribute('aria-describedby')).toBeNull();
      expect(element.querySelector('#username-error')).toBeNull();

      await fixture.componentInstance.onSubmit(
        new Event('submit', { cancelable: true }),
      );
      await fixture.whenStable();
      expect(password.getAttribute('aria-invalid')).toBe('true');
      expect(password.getAttribute('aria-describedby')).toBe('password-error');
      input('password', 'x');
      await fixture.whenStable();
      expect(password.getAttribute('aria-invalid')).not.toBe('true');
      expect(password.getAttribute('data-matches-spartan-invalid')).not.toBe(
        'true',
      );
      expect(password.getAttribute('aria-describedby')).toBeNull();
      expect(element.querySelector('#password-error')).toBeNull();
    },
  );

  it('shows honest unavailable feedback for valid credentials without a minimum password policy', async () => {
    input('username', 'editor');
    input('password', 'x');
    await fixture.whenStable();
    await fixture.componentInstance.onSubmit(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.loginForm().valid()).toBe(true);
    expect(fixture.componentInstance.feedback()).toBe('unconfigured');
    expect(
      element.querySelector('[aria-live="polite"]')?.textContent,
    ).toContain('احراز هویت پیکربندی نشده است');
    expect(fixture.componentInstance.loginForm().submitting()).toBe(false);
  });

  it('reveals and hides the same password input without losing its value', async () => {
    input('password', 'example');
    const password = element.querySelector('#password') as HTMLInputElement;
    const toggle = element.querySelector(
      '[aria-controls="password"]',
    ) as HTMLButtonElement;
    toggle.click();
    await fixture.whenStable();
    expect(password.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('پنهان کردن رمز عبور');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    toggle.click();
    await fixture.whenStable();
    expect(password.type).toBe('password');
    expect(password.value).toBe('example');
  });

  it('switches locale and direction without replacing controls or clearing credentials', async () => {
    input('username', 'editor');
    const toggle = element.querySelector(
      '.preferences button',
    ) as HTMLButtonElement;
    toggle.focus();
    toggle.click();
    await fixture.whenStable();
    expect(element.getAttribute('dir')).toBe('ltr');
    expect(element.getAttribute('lang')).toBe('en');
    expect(element.querySelector('h1')?.textContent).toContain(
      'Sign in to your panel',
    );
    expect(
      element.querySelector('#username')?.getAttribute('placeholder'),
    ).toBe('Enter your username');
    expect(fixture.componentInstance.credentials().username).toBe('editor');
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute('aria-label')).toContain(
      'Switch language to Persian',
    );
    await fixture.componentInstance.onSubmit(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    expect(element.querySelector('#password-error')?.textContent).toContain(
      'Enter your password.',
    );
  });

  it('delegates theme switching to preferences and updates the accessible label', async () => {
    direction.set('ltr');
    await fixture.whenStable();
    const toggle = element.querySelector(
      '[aria-label="Switch to dark theme"]',
    ) as HTMLButtonElement;
    toggle.click();
    await fixture.whenStable();
    expect(theme()).toBe('dark');
    expect(toggle.getAttribute('aria-label')).toBe('Switch to light theme');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});
