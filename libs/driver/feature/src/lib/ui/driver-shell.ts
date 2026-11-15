import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router, RouterLink, RouterOutlet } from '@angular/router'
import { SessionStore } from '@org/platform'
import { DriverApi, DriverRecord } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import { HlmDrawerImports } from '@spartan-ng/helm/drawer'
import { HlmAvatarImports } from '@spartan-ng/helm/avatar'
import { HlmSeparatorImports } from '@spartan-ng/helm/separator'

@Component({
  selector: 'lib-driver-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    HlmButtonImports,
    HlmDrawerImports,
    HlmAvatarImports,
    HlmSeparatorImports,
  ],
  template: `
    <hlm-drawer>
      <button hlmBtn variant="ghost" size="icon" class="drawer-trigger" hlmDrawerTrigger>
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <div hlmDrawerContent class="drawer-content">
        <router-outlet />
      </div>

      <div hlmDrawerSidebar class="drawer-sidebar" [attr.dir]="fa() ? 'rtl' : 'ltr'">
        <header class="drawer-header">
          <div class="user-info">
            @if (driver(); as d) {
              <hlm-avatar class="avatar">
                @if (d.profileImage) {
                  <img [src]="d.profileImage" alt="" hlmAvatarImage />
                } @else {
                  <span hlmAvatarFallback>{{ d.fullName?.charAt(0) ?? 'D' }}</span>
                }
              </hlm-avatar>
              <div class="user-details">
                <p class="user-name">{{ d.fullName }}</p>
                <p class="user-vehicle">
                  {{ d.vehicleType ?? (fa() ? 'نوع وسیله' : 'Vehicle type') }}
                  @if (d.vehiclePlate) {
                    · {{ d.vehiclePlate }}
                  }
                </p>
              </div>
            } @else {
              <div class="loading-placeholder">Loading...</div>
            }
          </div>
        </header>

        <hlm-separator class="drawer-separator" />

        <nav class="drawer-nav">
          <a
            hlmBtn
            variant="ghost"
            class="nav-item"
            routerLink="/driver/route-selection"
            routerLinkActive="active"
          >
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>{{ fa() ? 'انتخاب مسیر' : 'Route Selection' }}</span>
          </a>
          <a
            hlmBtn
            variant="ghost"
            class="nav-item"
            routerLink="/driver/route-management"
            routerLinkActive="active"
          >
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span>{{ fa() ? 'مدیریت مسیرها' : 'Route Management' }}</span>
          </a>
          <a
            hlmBtn
            variant="ghost"
            class="nav-item"
            routerLink="/driver/profile"
            routerLinkActive="active"
          >
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>{{ fa() ? 'پروفایل' : 'Profile' }}</span>
          </a>
          <a
            hlmBtn
            variant="ghost"
            class="nav-item"
            routerLink="/driver/vehicle-profile"
            routerLinkActive="active"
          >
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span>{{ fa() ? 'پروفایل وسیله' : 'Vehicle Profile' }}</span>
          </a>
          <a
            hlmBtn
            variant="ghost"
            class="nav-item"
            routerLink="/driver/documents"
            routerLinkActive="active"
          >
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>{{ fa() ? 'مدرک‌ها' : 'Documents' }}</span>
          </a>
          <a
            hlmBtn
            variant="ghost"
            class="nav-item"
            routerLink="/driver/support"
            routerLinkActive="active"
          >
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span>{{ fa() ? 'پشتیبانی' : 'Support' }}</span>
          </a>
        </nav>

        <hlm-separator class="drawer-separator" />

        <div class="drawer-footer">
          <button hlmBtn variant="ghost" class="nav-item logout-btn" (click)="logout()">
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>{{ fa() ? 'خروج' : 'Logout' }}</span>
          </button>
        </div>
      </div>
    </hlm-drawer>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .drawer-trigger {
        position: fixed;
        top: 1rem;
        left: 1rem;
        z-index: 50;
      }
      .drawer-content {
        height: 100vh;
        overflow: auto;
      }
      .drawer-sidebar {
        min-width: 280px;
        max-width: 320px;
        background: var(--card);
        border-inline-end: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
      .drawer-header {
        padding: 1.5rem 1rem;
      }
      .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .avatar {
        width: 48px;
        height: 48px;
      }
      .user-name {
        font-weight: 600;
        font-size: 1rem;
        margin: 0;
      }
      .user-vehicle {
        font-size: 0.875rem;
        color: var(--muted-foreground);
        margin: 0.25rem 0 0;
      }
      .loading-placeholder {
        color: var(--muted-foreground);
        font-size: 0.875rem;
      }
      .drawer-separator {
        margin: 0.5rem 0;
      }
      .drawer-nav {
        flex: 1;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        overflow-y: auto;
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        text-align: start;
        justify-content: flex-start;
        width: 100%;
      }
      .nav-item.active {
        background: var(--primary);
        color: var(--primary-foreground);
      }
      .nav-item.active .nav-icon {
        stroke: var(--primary-foreground);
      }
      .nav-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
      .drawer-footer {
        padding: 1rem;
      }
      .logout-btn {
        color: var(--destructive);
      }
      .logout-btn:hover {
        background: color-mix(in srgb, var(--destructive) 10%, transparent);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverShell {
  private readonly api = inject(DriverApi)
  private readonly session = inject(SessionStore)
  private readonly router = inject(Router)
  private readonly config = inject(DRIVER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')
  protected readonly driver = signal<DriverRecord | null>(null)

  constructor() {
    this.loadDriver()
  }

  private async loadDriver(): Promise<void> {
    try {
      const driver = await this.api.driver()
      this.driver.set(driver)
    } catch {
      /* Driver info will remain null; UI shows placeholder */
    }
  }

  protected async logout(): Promise<void> {
    await this.session.logout()
    await this.router.navigateByUrl('/login')
  }
}
