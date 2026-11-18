import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router, RouterOutlet } from '@angular/router'
import { SessionStore } from '@org/platform'
import { AppLayout, LayoutNavItem } from '@org/layout'
import { DriverApi, DriverHomeDetails } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import {
  lucideRoute,
  lucideMap,
  lucideUser,
  lucideBus,
  lucideFileText,
  lucideLifeBuoy,
} from '@ng-icons/lucide'

@Component({
  selector: 'lib-driver-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppLayout, RouterOutlet, HlmButtonImports],
  template: `
    <lib-app-layout [items]="navigationItems()" [navigationLabel]="navigationLabel()">
      <span layoutBrand class="truncate font-semibold">Driver</span>
      <div layoutHeader class="flex w-full min-w-0 items-center justify-between gap-3">
        <div class="min-w-0">
          <span class="block truncate font-semibold">{{ driverName() }}</span>
          @if (homeDetails(); as details) {
            <span class="text-muted-foreground block truncate text-sm">
              {{ details.vehicle.name ?? (fa() ? 'نوع وسیله' : 'Vehicle type') }}
              @if (details.vehicle.plate) {
                · {{ details.vehicle.plate }}
              }
            </span>
          }
        </div>
        <button hlmBtn variant="outline" class="min-h-11" type="button" (click)="logout()">
          {{ fa() ? 'خروج' : 'Sign out' }}
        </button>
      </div>
      <router-outlet />
    </lib-app-layout>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class DriverShell {
  private readonly api = inject(DriverApi)
  private readonly session = inject(SessionStore)
  private readonly router = inject(Router)
  private readonly config = inject(DRIVER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')
  private readonly profile = signal<Record<string, unknown> | null>(null)
  protected readonly driverName = computed(() => {
    const profile = this.profile()
    return `${String(profile?.['firstName'] ?? '')} ${String(profile?.['lastName'] ?? '')}`.trim()
  })
  protected readonly homeDetails = signal<DriverHomeDetails | null>(null)

  protected readonly navigationLabel = computed(() => (this.fa() ? 'ناوبری' : 'Navigation'))

  protected readonly navigationItems = computed(() => {
    const fa = this.fa()
    const item = (
      id: string,
      faLabel: string,
      enLabel: string,
      icon: unknown,
      commands: (string | number)[],
      exact?: boolean,
    ): LayoutNavItem => ({
      id,
      label: fa ? faLabel : enLabel,
      icon: icon as string,
      commands,
      exact: exact ?? false,
    })
    return [
      item(
        'route-selection',
        'انتخاب مسیر',
        'Route Selection',
        lucideRoute,
        ['/driver/route-selection'],
        true,
      ),
      item('route-management', 'مدیریت مسیرها', 'Route Management', lucideMap, [
        '/driver/route-management',
      ]),
      item('profile', 'پروفایل', 'Profile', lucideUser, ['/driver/profile']),
      item('vehicle-profile', 'پروفایل وسیله', 'Vehicle Profile', lucideBus, [
        '/driver/vehicle-profile',
      ]),
      item('documents', 'مدرک‌ها', 'Documents', lucideFileText, ['/driver/documents']),
      item('support', 'پشتیبانی', 'Support', lucideLifeBuoy, ['/driver/support']),
    ]
  })

  constructor() {
    this.loadDriver()
  }

  private async loadDriver(): Promise<void> {
    const [details, profile] = await Promise.allSettled([
      this.api.driverHomeDetails(),
      this.api.profile(),
    ])
    if (details.status === 'fulfilled') this.homeDetails.set(details.value)
    if (profile.status === 'fulfilled') this.profile.set(profile.value)
  }

  protected async logout(): Promise<void> {
    await this.session.logout()
    await this.router.navigateByUrl('/login')
  }
}
