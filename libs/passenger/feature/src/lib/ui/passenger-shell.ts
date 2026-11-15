import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { Router, RouterLink, RouterOutlet } from '@angular/router'
import { SessionStore } from '@org/platform'
import { ThemeStore } from '@org/platform'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import { PASSENGER_FEATURE_CONFIG } from '../passenger.routes'

@Component({
  selector: 'lib-passenger-shell',
  imports: [RouterLink, RouterOutlet, HlmButtonImports],
  template: `
    <div class="passenger-layout" [attr.dir]="rtl() ? 'rtl' : 'ltr'">
      <header class="passenger-header">
        <a class="brand" routerLink="/passenger/home"
          ><span aria-hidden="true">T</span> TTab
          <small>{{ rtl() ? 'سرویس رفت‌وآمد' : 'Passenger' }}</small></a
        >
        <nav aria-label="{{ rtl() ? 'ناوبری مسافر' : 'Passenger navigation' }}">
          <a routerLink="/passenger/home">{{ rtl() ? 'خانه' : 'Home' }}</a>
          <a routerLink="/passenger/assignment">{{ rtl() ? 'شیفت و ایستگاه' : 'Assignment' }}</a>
          <a routerLink="/passenger/profile">{{ rtl() ? 'حساب کاربری' : 'Profile' }}</a>
          <a routerLink="/passenger/support">{{ rtl() ? 'پشتیبانی' : 'Support' }}</a>
        </nav>
        <button
          hlmBtn
          variant="ghost"
          type="button"
          [attr.aria-label]="rtl() ? 'تغییر پوسته' : 'Toggle theme'"
          (click)="toggleTheme()"
        >
          {{ dark() ? (rtl() ? 'روشن' : 'Light') : rtl() ? 'تیره' : 'Dark' }}
        </button>
        <button hlmBtn variant="outline" class="logout" type="button" (click)="logout()">
          {{ rtl() ? 'خروج' : 'Sign out' }}
        </button>
      </header>
      <main id="main-content"><router-outlet /></main>
      <footer>
        {{
          rtl()
            ? 'اطلاعات سفر فقط از سرویس حمل‌ونقل دریافت می‌شود.'
            : 'Trip information is provided by your transport service.'
        }}
      </footer>
    </div>
  `,
  styleUrl: './passenger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerShell {
  private readonly config = inject(PASSENGER_FEATURE_CONFIG)
  private readonly session = inject(SessionStore)
  private readonly theme = inject(ThemeStore)
  private readonly router = inject(Router)
  protected readonly rtl = computed(() => this.config.language() === 'fa')
  protected readonly dark = computed(() => this.theme.config().version === 'dark')

  protected toggleTheme(): void {
    this.theme.set('version', this.dark() ? 'light' : 'dark')
  }

  protected async logout(): Promise<void> {
    await this.session.logout()
    await this.router.navigateByUrl('/login')
  }
}
