import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { Router, RouterOutlet } from '@angular/router'
import { SessionStore } from '@org/platform'
import { ThemeStore } from '@org/platform'
import { AppLayout, LayoutNavItem } from '@org/layout'
import { PASSENGER_FEATURE_CONFIG } from '../passenger.routes'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import { NgIcon } from '@ng-icons/core'
import { lucideHome, lucideMap, lucideUser, lucideLifeBuoy } from '@ng-icons/lucide'

@Component({
  selector: 'lib-passenger-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppLayout, RouterOutlet, NgIcon, HlmButtonImports],
  template: `
    <lib-app-layout [items]="navigationItems()" [navigationLabel]="navigationLabel()">
      <span layoutBrand class="truncate font-semibold">
        <span aria-hidden="true">T</span> TTab
        <small>{{ fa() ? 'سرویس رفت‌وآمد' : 'Passenger' }}</small>
      </span>
      <div layoutHeader class="flex w-full min-w-0 items-center justify-between gap-3">
        <button
          hlmBtn
          variant="ghost"
          type="button"
          [attr.aria-label]="fa() ? 'تغییر پوسته' : 'Toggle theme'"
          (click)="toggleTheme()"
        >
          {{ dark() ? (fa() ? 'روشن' : 'Light') : fa() ? 'تیره' : 'Dark' }}
        </button>
        <button hlmBtn variant="outline" class="logout" type="button" (click)="logout()">
          {{ fa() ? 'خروج' : 'Sign out' }}
        </button>
      </div>
      <router-outlet />
      <footer class="passenger-footer">
        {{
          fa()
            ? 'اطلاعات سفر فقط از سرویس حمل‌ونقل دریافت می‌شود.'
            : 'Trip information is provided by your transport service.'
        }}
      </footer>
    </lib-app-layout>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .passenger-footer {
        padding: 1rem;
        color: var(--muted-foreground);
        text-align: center;
        font-size: 0.8rem;
        border-block-start: 1px solid var(--border);
        margin-block-start: auto;
      }
    `,
  ],
})
export class PassengerShell {
  private readonly config = inject(PASSENGER_FEATURE_CONFIG)
  private readonly session = inject(SessionStore)
  private readonly theme = inject(ThemeStore)
  private readonly router = inject(Router)
  protected readonly fa = computed(() => this.config.language() === 'fa')
  protected readonly dark = computed(() => this.theme.config().version === 'dark')

  protected readonly navigationLabel = computed(() =>
    this.fa() ? 'ناوبری مسافر' : 'Passenger navigation',
  )

  protected readonly navigationItems = computed(() => {
    const fa = this.fa()
    const item = (
      id: string,
      faLabel: string,
      enLabel: string,
      icon: unknown,
      commands: (string | number)[],
    ): LayoutNavItem => ({
      id,
      label: fa ? faLabel : enLabel,
      icon: icon as string,
      commands,
    })
    return [
      item('home', 'خانه', 'Home', lucideHome, ['/passenger/home']),
      item('assignment', 'شیفت و ایستگاه', 'Assignment', lucideMap, ['/passenger/assignment']),
      item('profile', 'حساب کاربری', 'Profile', lucideUser, ['/passenger/profile']),
      item('support', 'پشتیبانی', 'Support', lucideLifeBuoy, ['/passenger/support']),
    ]
  })

  protected toggleTheme(): void {
    this.theme.set('version', this.dark() ? 'light' : 'dark')
  }

  protected async logout(): Promise<void> {
    await this.session.logout()
    await this.router.navigateByUrl('/login')
  }
}
