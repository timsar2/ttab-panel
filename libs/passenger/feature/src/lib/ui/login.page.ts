import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { SessionStore } from '@org/platform'
import { PassengerApi } from '../passenger.api'
import { PASSENGER_LOGIN_LANGUAGE, PASSENGER_SET_LANGUAGE } from '../passenger.login-config'
import { hasPassengerAccess } from '../passenger.routes'
import { HlmButtonImports } from '@spartan-ng/helm/button'

@Component({
  selector: 'lib-passenger-login-page',
  imports: [HlmButtonImports],
  template: `
    <main class="login-page" [attr.dir]="fa() ? 'rtl' : 'ltr'">
      @if (roleBlocked()) {
        <section class="login-card">
          <p class="eyebrow">TTAB · PASSENGER</p>
          <h1>{{ fa() ? 'این بخش برای مسافران است' : 'Passenger access only' }}</h1>
          <p>
            {{
              fa()
                ? 'این حساب مجوز ورود به تجربه مسافر را ندارد. از برنامه متناسب با نقش حساب خود استفاده کنید.'
                : 'This account is not authorized for the Passenger experience. Use the application assigned to your account role.'
            }}
          </p>
          <button hlmBtn variant="outline" (click)="signOut()">
            {{ fa() ? 'خروج از حساب' : 'Sign out' }}
          </button>
        </section>
      } @else if (!onboarded()) {
        <section class="login-card">
          <p class="eyebrow">TTAB · PASSENGER</p>
          <h1>{{ titles()[introStep()] }}</h1>
          <p>{{ descriptions()[introStep()] }}</p>
          <div class="intro-dots" aria-label="{{ fa() ? 'صفحه معرفی' : 'Introduction pages' }}">
            <span [class.active]="introStep() === 0"></span
            ><span [class.active]="introStep() === 1"></span
            ><span [class.active]="introStep() === 2"></span>
          </div>
          <button hlmBtn class="primary" (click)="nextIntro()">
            {{
              introStep() === 2 ? (fa() ? 'شروع' : 'Get started') : fa() ? 'ادامه' : 'Continue'
            }}</button
          ><button hlmBtn variant="link" class="text-button" (click)="finishIntro()">
            {{ fa() ? 'رد کردن' : 'Skip introduction' }}
          </button>
        </section>
      } @else {
        <section class="login-card">
          <p class="eyebrow">TTAB · PASSENGER</p>
          <h1>
            {{
              fa()
                ? otpSent()
                  ? 'تأیید شماره همراه'
                  : 'ورود مسافر'
                : otpSent()
                  ? 'Verify your phone'
                  : 'Passenger sign in'
            }}
          </h1>
          <p>
            {{
              fa()
                ? otpSent()
                  ? 'کد شش‌رقمی ارسال‌شده را وارد کنید.'
                  : 'برای دریافت کد ورود، شماره همراه خود را وارد کنید.'
                : otpSent()
                  ? 'Enter the six-digit code sent to your phone.'
                  : 'Enter your phone number to receive a one-time code.'
            }}
          </p>
          <form class="stack" (submit)="$event.preventDefault(); otpSent() ? verify() : sendCode()">
            <label
              >{{ fa() ? 'شماره همراه' : 'Mobile number'
              }}<input
                type="tel"
                autocomplete="tel"
                inputmode="tel"
                [disabled]="busy() || otpSent()"
                [value]="phone()"
                (input)="phone.set($any($event.target).value)"
                [attr.aria-describedby]="phoneError() ? 'login-error' : null"
                required
            /></label>
            @if (otpSent()) {
              <label
                >{{ fa() ? 'کد یک‌بارمصرف' : 'One-time code'
                }}<input
                  type="text"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="6"
                  [value]="otp()"
                  (input)="otp.set($any($event.target).value)"
                  required
              /></label>
            }
            @if (error()) {
              <p id="login-error" class="error" role="alert">{{ error() }}</p>
            }
            <button hlmBtn class="primary" [disabled]="busy()">
              {{
                busy()
                  ? fa()
                    ? 'لطفاً صبر کنید...'
                    : 'Please wait...'
                  : otpSent()
                    ? fa()
                      ? 'ورود'
                      : 'Verify and sign in'
                    : fa()
                      ? 'دریافت کد'
                      : 'Send code'
              }}
            </button>
          </form>
          @if (otpSent()) {
            <button
              class="text-button"
              [disabled]="busy()"
              (click)="otpSent.set(false); otp.set(''); error.set(null)"
            >
              {{ fa() ? 'ویرایش شماره' : 'Change phone number' }}
            </button>
          }
        </section>
      }
      <footer>
        <button class="text-button" (click)="toggleLanguage()">
          {{ fa() ? 'English' : 'فارسی' }}
        </button>
      </footer>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
        background: var(--background);
        color: var(--foreground);
      }
      .login-page {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 1rem;
        background:
          radial-gradient(
            ellipse at 15% 20%,
            color-mix(in srgb, var(--primary) 16%, transparent),
            transparent 35%
          ),
          var(--background);
      }
      .login-card {
        width: min(100%, 28rem);
        box-sizing: border-box;
        border: 1px solid var(--border);
        border-radius: 1.25rem;
        padding: clamp(1.5rem, 6vw, 2.5rem);
        background: var(--card);
        box-shadow: var(--shadow-lg);
      }
      .eyebrow {
        color: var(--primary);
        font-weight: 800;
        letter-spacing: 0.1em;
        font-size: 0.75rem;
      }
      h1 {
        margin: 0.5rem 0;
        font-size: 1.8rem;
      }
      .login-card > p:not(.eyebrow) {
        color: var(--muted-foreground);
        line-height: 1.7;
      }
      .stack {
        display: grid;
        gap: 1rem;
      }
      label {
        display: grid;
        gap: 0.4rem;
        font-weight: 600;
      }
      input {
        width: 100%;
        box-sizing: border-box;
        min-height: 2.8rem;
        border: 1px solid var(--input);
        border-radius: 0.55rem;
        padding: 0.65rem 0.75rem;
        background: var(--background);
        color: var(--foreground);
        font: inherit;
      }
      .primary {
        width: 100%;
        min-height: 2.8rem;
        border: 0;
        border-radius: 0.65rem;
        background: var(--primary);
        color: var(--primary-foreground);
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      .primary:disabled {
        opacity: 0.6;
      }
      .text-button {
        display: block;
        margin: 0.8rem auto 0;
        padding: 0.5rem;
        border: 0;
        background: transparent;
        color: var(--muted-foreground);
        text-decoration: underline;
        cursor: pointer;
      }
      .error {
        color: var(--destructive);
      }
      footer {
        position: absolute;
        inset-block-end: 1rem;
        inset-inline-end: 1rem;
      }
      .intro-dots {
        display: flex;
        gap: 0.5rem;
        margin: 1.5rem 0;
      }
      .intro-dots span {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 50%;
        background: var(--muted);
      }
      .intro-dots .active {
        background: var(--primary);
      }
      button:focus-visible,
      input:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: 2px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerLoginPage {
  private readonly api = inject(PassengerApi)
  private readonly session = inject(SessionStore)
  private readonly router = inject(Router)
  private readonly preferences = inject(PASSENGER_LOGIN_LANGUAGE)
  private readonly setPreference = inject(PASSENGER_SET_LANGUAGE)
  protected readonly fa = computed(() => this.preferences() === 'fa')
  protected readonly roleBlocked = computed(() => {
    const roles = this.session.user()?.roles ?? []
    return this.session.isAuthenticated() && !hasPassengerAccess(roles)
  })
  protected readonly introStep = signal(0)
  protected readonly onboarded = signal(this.readIntroState())
  protected readonly phone = signal('09193422694')
  protected readonly otp = signal('')
  protected readonly otpSent = signal(false)
  protected readonly busy = signal(false)
  protected readonly error = signal<string | null>(null)
  protected readonly phoneError = signal(false)
  protected readonly titles = computed(() =>
    this.fa()
      ? ['رفت‌وآمد آسوده', 'برنامه سفر شما', 'همیشه به‌روز']
      : ['A calmer commute', 'Your trip, organized', 'Stay informed'],
  )
  protected readonly descriptions = computed(() =>
    this.fa()
      ? [
          'اطلاعات سرویس شرکت را در یک فضای ساده دنبال کنید.',
          'شیفت و ایستگاه رفت‌وآمد خود را مدیریت کنید.',
          'وضعیت سفر و اطلاعات راننده را هنگام فعال بودن سفر ببینید.',
        ]
      : [
          'Keep your company transport details in one clear place.',
          'Manage your shift and pickup station.',
          'See trip and driver details when an active trip is available.',
        ],
  )

  private readIntroState(): boolean {
    try {
      return localStorage.getItem('passenger.intro.complete.v1') === 'true'
    } catch {
      return false
    }
  }
  protected nextIntro(): void {
    if (this.introStep() === 2) this.finishIntro()
    else this.introStep.update(step => step + 1)
  }
  protected finishIntro(): void {
    try {
      localStorage.setItem('passenger.intro.complete.v1', 'true')
    } catch {
      /* Intro can be skipped again if storage is unavailable. */
    }
    this.onboarded.set(true)
  }
  protected toggleLanguage(): void {
    this.setPreference(this.fa() ? 'en' : 'fa')
  }
  protected async signOut(): Promise<void> {
    await this.session.logout()
  }

  protected async sendCode(): Promise<void> {
    const normalized = this.phone().trim()
    if (!/^\+?[\d\s()-]{11,20}$/.test(normalized) || normalized.replace(/\D/g, '').length !== 11) {
      this.phoneError.set(true)
      this.error.set(
        this.fa() ? 'شماره همراه معتبر وارد کنید.' : 'Enter a valid 11-digit mobile number.',
      )
      return
    }
    this.busy.set(true)
    this.error.set(null)
    this.phoneError.set(false)
    try {
      await this.api.requestOtp(normalized.replace(/[\s()-]/g, ''))
      this.otpSent.set(true)
    } catch {
      this.error.set(
        this.fa()
          ? 'ارسال کد ناموفق بود؛ دوباره تلاش کنید.'
          : 'Could not send a code. Please try again.',
      )
    } finally {
      this.busy.set(false)
    }
  }
  protected async verify(): Promise<void> {
    if (!/^\d{6}$/.test(this.otp())) {
      this.error.set(this.fa() ? 'کد شش‌رقمی را وارد کنید.' : 'Enter the six-digit code.')
      return
    }
    this.busy.set(true)
    this.error.set(null)
    const success = await this.session.login({
      username: this.phone()
        .trim()
        .replace(/[\s()-]/g, ''),
      password: this.otp(),
    })
    this.busy.set(false)
    if (!success) {
      this.error.set(
        this.fa()
          ? 'کد تأیید نشد؛ کد را بررسی و دوباره تلاش کنید.'
          : 'The code could not be verified. Check it and try again.',
      )
      return
    }
    await this.router.navigateByUrl('/passenger/home')
  }
}
