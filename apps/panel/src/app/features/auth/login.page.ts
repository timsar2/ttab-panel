import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideEye,
  lucideEyeOff,
  lucideLanguages,
  lucideMoon,
  lucideSun,
} from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { PreferencesStore } from '../../core/preferences/preferences.store';

// The composing directive takes precedence over Helm's raw invalid host binding.
@Directive({
  selector: 'input[appLoginInput]',
  hostDirectives: [HlmInput],
  host: {
    '[id]': 'id()',
    '[attr.aria-invalid]': 'showError() ? "true" : null',
    '[attr.data-invalid]': 'showError() ? "true" : null',
    '[attr.data-matches-spartan-invalid]': 'showError() ? "true" : null',
  },
})
class LoginInput {
  readonly id = input.required<string>();
  private readonly field = inject(FormField);
  readonly showError = computed(
    () => this.field.state().touched() && this.field.state().invalid(),
  );
}

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    NgIcon,
    HlmAlertImports,
    HlmButton,
    HlmCardImports,
    LoginInput,
    HlmLabel,
  ],
  providers: [
    provideIcons({
      lucideEye,
      lucideEyeOff,
      lucideLanguages,
      lucideMoon,
      lucideSun,
    }),
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
  host: {
    '[attr.dir]': 'preferences.direction()',
    '[attr.lang]': 'preferences.isRtl() ? "fa" : "en"',
  },
})
export class LoginPage {
  readonly preferences = inject(PreferencesStore);
  readonly credentials = signal({ username: '', password: '' });
  readonly loginForm = form(this.credentials, (path) => {
    required(path.username);
    required(path.password);
  });
  readonly passwordVisible = signal(false);
  readonly feedback = signal<'idle' | 'invalid' | 'unconfigured'>('idle');
  private readonly usernameInput =
    viewChild.required<ElementRef<HTMLInputElement>>('usernameInput');
  private readonly passwordInput =
    viewChild.required<ElementRef<HTMLInputElement>>('passwordInput');

  readonly copy = computed(() =>
    this.preferences.isRtl()
      ? {
          panel: 'پنل مدیریت',
          eyebrow: 'فضایی برای مدیریت بهتر',
          brandTitle: 'با تمرکز بیشتر،\nمدیریت کنید.',
          brandDescription:
            'نقطه شروع یک تجربه منظم، روشن و یکپارچه برای مدیریت.',
          brandNote: 'ساده، منظم، در دسترس',
          welcome: 'خوش آمدید',
          title: 'ورود به پنل مدیریت',
          description: 'برای ادامه، نام کاربری و رمز عبور خود را وارد کنید.',
          username: 'نام کاربری',
          usernamePlaceholder: 'نام کاربری خود را وارد کنید',
          password: 'رمز عبور',
          passwordPlaceholder: 'رمز عبور خود را وارد کنید',
          usernameRequired: 'نام کاربری را وارد کنید.',
          passwordRequired: 'رمز عبور را وارد کنید.',
          showPassword: 'نمایش رمز عبور',
          hidePassword: 'پنهان کردن رمز عبور',
          submit: 'ورود به پنل',
          submitting: 'در حال بررسی…',
          invalidTitle: 'اطلاعات ورود کامل نیست',
          invalidDescription: 'فیلدهای مشخص‌شده را تکمیل کنید.',
          unavailableTitle: 'احراز هویت پیکربندی نشده است',
          unavailableDescription:
            'این صفحه هنوز به سرویس احراز هویت متصل نیست. ورود انجام نشد و اطلاعات شما ارسال نشد.',
          notice: 'این نسخه به سرویس احراز هویت متصل نیست.',
          footer: 'پنل مدیریت · Press ID',
          direction: 'تغییر زبان به انگلیسی و جهت به چپ‌به‌راست',
          darkTheme: 'فعال کردن حالت تیره',
          lightTheme: 'فعال کردن حالت روشن',
          dark: 'حالت تیره',
          light: 'حالت روشن',
        }
      : {
          panel: 'Administration',
          eyebrow: 'A clearer space to manage',
          brandTitle: 'Less distraction.\nMore focus.',
          brandDescription:
            'A considered starting point for a clear, organized and connected administration experience.',
          brandNote: 'Simple. Organized. Accessible.',
          welcome: 'Welcome back',
          title: 'Sign in to your panel',
          description: 'Enter your username and password to continue.',
          username: 'Username',
          usernamePlaceholder: 'Enter your username',
          password: 'Password',
          passwordPlaceholder: 'Enter your password',
          usernameRequired: 'Enter your username.',
          passwordRequired: 'Enter your password.',
          showPassword: 'Show password',
          hidePassword: 'Hide password',
          submit: 'Sign in to panel',
          submitting: 'Checking…',
          invalidTitle: 'Complete your sign-in details',
          invalidDescription: 'Fill in the highlighted fields to continue.',
          unavailableTitle: 'Authentication is not configured',
          unavailableDescription:
            'This page is not connected to an authentication service yet. You have not been signed in and your details have not been sent.',
          notice: 'This version is not connected to an authentication service.',
          footer: 'Administration panel · Press ID',
          direction:
            'Switch language to Persian and direction to right-to-left',
          darkTheme: 'Switch to dark theme',
          lightTheme: 'Switch to light theme',
          dark: 'Dark mode',
          light: 'Light mode',
        },
  );

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loginForm().submitting()) return;
    this.feedback.set('idle');
    await submit(this.loginForm, async () => {
      this.feedback.set('unconfigured');
    });
    if (this.loginForm().invalid()) {
      this.feedback.set('invalid');
      const input = this.loginForm.username().invalid()
        ? this.usernameInput()
        : this.passwordInput();
      input.nativeElement.focus();
    }
  }
}
