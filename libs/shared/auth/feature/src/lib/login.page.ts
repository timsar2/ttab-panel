import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { lucideLanguages, lucideMoon, lucideSun } from '@ng-icons/lucide'
import { AUTH_CONFIG, SessionStore, safeReturnUrl } from '@org/auth-data-access'
import { AuthLayout } from '@org/layout'
import { HlmButton } from '@spartan-ng/helm/button'
import { AUTH_APPEARANCE, AUTH_FEATURE_CONFIG } from './auth-feature.providers'
import { AUTH_COPY } from './auth-copy'
import { Credentials, LoginForm } from './login-form'

@Component({
  selector: 'lib-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthLayout, LoginForm, NgIcon, HlmButton],
  providers: [provideIcons({ lucideLanguages, lucideMoon, lucideSun })],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
  host: {
    '[attr.dir]': 'appearance.direction()',
    '[attr.lang]': 'appearance.direction() === "rtl" ? "fa" : "en"',
  },
})
export class LoginPage {
  readonly appearance = inject(AUTH_APPEARANCE)
  readonly config = inject(AUTH_FEATURE_CONFIG)
  readonly session = inject(SessionStore)
  private readonly authConfig = inject(AUTH_CONFIG)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly submitting = signal(false)
  private readonly unconfiguredSubmission = signal(false)
  readonly copy = computed(() => AUTH_COPY[this.appearance.direction() === 'rtl' ? 'fa' : 'en'])
  readonly busy = computed(
    () =>
      this.submitting() ||
      this.session.status() === 'authenticating' ||
      this.session.status() === 'refreshing',
  )
  readonly error = computed(() => {
    if (this.unconfiguredSubmission()) return this.copy().unavailableDescription
    const code = this.session.errorCode()
    return code ? this.copy().errors[code] : this.session.error()
  })

  async onSubmit(credentials: Credentials): Promise<void> {
    if (this.busy()) return
    if (!this.session.configured()) {
      this.unconfiguredSubmission.set(true)
      return
    }
    this.unconfiguredSubmission.set(false)
    this.submitting.set(true)
    try {
      if (await this.session.login(credentials)) {
        await this.router.navigateByUrl(
          safeReturnUrl(
            this.route.snapshot.queryParamMap.get('returnUrl'),
            this.authConfig.afterLoginUrl,
            this.authConfig.loginUrl,
          ),
        )
      }
    } finally {
      this.submitting.set(false)
    }
  }
}
