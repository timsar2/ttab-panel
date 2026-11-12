import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core'
import { disabled, form, FormField, FormRoot, required, submit } from '@angular/forms/signals'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide'
import type { AuthCredentials as Credentials } from '@org/auth-data-access'
export type { AuthCredentials as Credentials } from '@org/auth-data-access'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmCardImports } from '@spartan-ng/helm/card'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { AUTH_APPEARANCE } from './auth-feature.providers'
import { AUTH_COPY } from './auth-copy'
import { SignalInput } from '@org/ui-forms'

@Component({
  selector: 'lib-login-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormRoot,
    NgIcon,
    HlmAlertImports,
    HlmButton,
    HlmCardImports,
    HlmFieldImports,
    SignalInput,
  ],
  providers: [provideIcons({ lucideEye, lucideEyeOff })],
  templateUrl: './login-form.html',
  styleUrl: './login-form.css',
  host: {
    '[attr.dir]': 'appearance.direction()',
    '[attr.lang]': 'appearance.direction() === "rtl" ? "fa" : "en"',
  },
})
export class LoginForm {
  readonly appearance = inject(AUTH_APPEARANCE)
  readonly busy = input(false)
  readonly error = input<string | null>(null)
  readonly notice = input<string | null>(null)
  readonly credentialsSubmit = output<Credentials>()
  protected readonly ready = signal(false)
  private readonly model = signal<Credentials>({
    username: 'admin@root.com',
    password: '@tLine!402*',
  })
  readonly credentials = this.model.asReadonly()
  readonly loginForm = form(this.model, path => {
    required(path.username)
    required(path.password)
    disabled(path, () => this.busy() || !this.ready())
  })
  readonly passwordVisible = signal(false)
  readonly invalidSubmission = signal(false)
  readonly copy = computed(() => AUTH_COPY[this.appearance.direction() === 'rtl' ? 'fa' : 'en'])
  private readonly usernameInput = viewChild.required<ElementRef<HTMLInputElement>>('usernameInput')
  private readonly passwordInput = viewChild.required<ElementRef<HTMLInputElement>>('passwordInput')

  constructor() {
    // Do not accept values into SSR controls before Signal Forms owns their state.
    afterNextRender(() => this.ready.set(true))
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault()
    if (!this.ready() || this.busy() || this.loginForm().submitting()) return
    this.invalidSubmission.set(false)
    await submit(this.loginForm, async () => {
      this.credentialsSubmit.emit({ ...this.credentials() })
    })
    if (this.loginForm().invalid()) {
      this.invalidSubmission.set(true)
      ;(this.loginForm.username().invalid()
        ? this.usernameInput()
        : this.passwordInput()
      ).nativeElement.focus()
    }
  }
}
