import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { DriverApi, RouteCard, ActiveTrip } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@spartan-ng/helm/alert'
import { HlmButton } from '@spartan-ng/helm/button'
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardFooter,
  HlmCardHeader,
  HlmCardTitle,
} from '@spartan-ng/helm/card'
import { HlmSpinner } from '@spartan-ng/helm/spinner'

@Component({
  selector: 'lib-route-selection-page',
  imports: [
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmCardDescription,
    HlmCardFooter,
    HlmCardHeader,
    HlmCardTitle,
    HlmSpinner,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
  ],
  template: `
    <div class="page-container" [attr.dir]="fa() ? 'rtl' : 'ltr'">
      <header class="page-header">
        <h1>{{ fa() ? 'انتخاب مسیر' : 'Route Selection' }}</h1>
        <p class="page-subtitle">
          {{ fa() ? 'مسیر و شیفت مورد نظر را انتخاب کنید' : 'Select your route and shift' }}
        </p>
      </header>

      @if (loading()) {
        <div class="loading-state">
          <hlm-spinner />
          <p>{{ fa() ? 'در حال بارگذاری مسیرها...' : 'Loading routes...' }}</p>
        </div>
      } @else if (error()) {
        <hlm-alert class="error-alert" variant="destructive">
          <h2 hlmAlertTitle>{{ fa() ? 'خطا در بارگذاری' : 'Failed to load' }}</h2>
          <p hlmAlertDescription>{{ error() }}</p>
          <button hlmBtn variant="outline" class="retry-btn" (click)="loadData()">
            {{ fa() ? 'تلاش مجدد' : 'Retry' }}
          </button>
        </hlm-alert>
      } @else if (activeTrip()) {
        <hlm-alert class="active-trip-alert" variant="default">
          <h2 hlmAlertTitle>{{ fa() ? 'سفر فعال وجود دارد' : 'Active trip found' }}</h2>
          <p hlmAlertDescription>
            {{
              fa()
                ? 'شما یک سفر در حال انجام دارید. می‌توانید به نقشه سفر بروید یا یک مسیر جدید آغاز کنید.'
                : 'You have an active trip. Continue to the trip map or start a new route.'
            }}
          </p>
          <div class="active-trip-actions">
            <button hlmBtn (click)="goToLiveMap()">
              {{ fa() ? 'نمایش نقشه سفر' : 'View Trip Map' }}
            </button>
            <button hlmBtn variant="outline" (click)="showRoutes.set(true)">
              {{ fa() ? 'مشاهده مسیرهای دیگر' : 'View Other Routes' }}
            </button>
          </div>
        </hlm-alert>
      }

      @if (showRoutes() && routes().length > 0) {
        <section class="routes-section">
          <h2 class="section-title">{{ fa() ? 'مسیرهای در دسترس' : 'Available Routes' }}</h2>
          <div class="routes-grid">
            @for (route of routes(); track route.id) {
              <hlm-card class="route-card" (click)="startRoute(route)">
                <div hlmCardHeader>
                  <h3 hlmCardTitle>{{ route.lineName }}</h3>
                  <p hlmCardDescription>{{ route.tripTypeName }}</p>
                </div>
                <div hlmCardContent>
                  <div class="route-detail">
                    <span class="detail-item">
                      <svg
                        class="detail-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {{ route.shiftTime }}
                    </span>
                    <span class="detail-item">
                      <svg
                        class="detail-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {{ route.departureTime }}
                    </span>
                  </div>
                </div>
                <div hlmCardFooter>
                  <button
                    hlmBtn
                    class="start-route-btn"
                    (click)="$event.stopPropagation(); startRoute(route)"
                  >
                    {{ fa() ? 'شروع سفر' : 'Start Trip' }}
                  </button>
                </div>
              </hlm-card>
            }
          </div>
        </section>
      } @else if (showRoutes() && routes().length === 0) {
        <hlm-alert class="empty-alert" variant="default">
          <h2 hlmAlertTitle>{{ fa() ? 'مسیری یافت نشد' : 'No routes available' }}</h2>
          <p hlmAlertDescription>
            {{
              fa()
                ? 'هیچ مسیری برای شما در دسترس نیست.'
                : 'No routes are available for you at this time.'
            }}
          </p>
        </hlm-alert>
      }

      <div class="page-footer">
        <a hlmBtn variant="outline" routerLink="/driver/route-management">
          {{ fa() ? 'مدیریت مسیرها و فیلترها' : 'Route Management & Filters' }}
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .page-container {
        padding: 1.5rem;
        max-width: 800px;
        margin: 0 auto;
      }
      .page-header {
        margin-bottom: 2rem;
      }
      .page-header h1 {
        font-size: 1.875rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
      }
      .page-subtitle {
        color: var(--muted-foreground);
        margin: 0;
      }
      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 3rem;
      }
      .error-alert,
      .active-trip-alert,
      .empty-alert {
        margin-bottom: 1.5rem;
      }
      .active-trip-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1rem;
        flex-wrap: wrap;
      }
      .routes-section {
        margin-top: 1.5rem;
      }
      .section-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 1rem;
      }
      .routes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
      }
      .route-card {
        cursor: pointer;
        transition:
          box-shadow 0.2s,
          transform 0.2s;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .route-card:hover {
        box-shadow: var(--shadow-lg);
        transform: translateY(-2px);
      }
      .route-detail {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }
      .detail-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--muted-foreground);
      }
      .detail-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .start-route-btn {
        width: 100%;
      }
      .page-footer {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border);
        text-align: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteSelectionPage {
  private readonly api = inject(DriverApi)
  private readonly router = inject(Router)
  private readonly config = inject(DRIVER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')

  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly routes = signal<RouteCard[]>([])
  protected readonly activeTrip = signal<ActiveTrip | null>(null)
  protected readonly showRoutes = signal(false)

  constructor() {
    this.loadData()
  }

  protected async loadData(): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    try {
      const [routes, activeTrip] = await Promise.all([
        this.api.availableRoutes(),
        this.api.activeTrip(),
      ])
      this.routes.set(routes)
      this.activeTrip.set(activeTrip)
      this.showRoutes.set(!activeTrip)
    } catch {
      this.error.set(
        this.fa()
          ? 'بارگذاری مسیرها ناموفق بود. لطفاً دوباره تلاش کنید.'
          : 'Failed to load routes. Please try again.',
      )
    } finally {
      this.loading.set(false)
    }
  }

  protected async startRoute(route: RouteCard): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    try {
      await this.api.startTrip({
        driverLineId: route.driverLineId,
        shiftTimeId: route.shiftTimeId,
        tripTypeId: route.tripTypeId,
        directionId: route.directionId,
      })
      await this.router.navigateByUrl('/driver/live-map')
    } catch {
      this.error.set(
        this.fa()
          ? 'شروع سفر ناموفق بود. لطفاً دوباره تلاش کنید.'
          : 'Failed to start trip. Please try again.',
      )
    } finally {
      this.loading.set(false)
    }
  }

  protected goToLiveMap(): void {
    this.router.navigateByUrl('/driver/live-map')
  }
}
