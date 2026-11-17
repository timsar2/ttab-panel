import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { DriverApi, RouteCard, ActiveTrip } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { DriverRouteCard } from './driver-route-card'
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@spartan-ng/helm/alert'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmSpinner } from '@spartan-ng/helm/spinner'

@Component({
  selector: 'lib-route-selection-page',
  imports: [HlmButton, DriverRouteCard, HlmSpinner, HlmAlert, HlmAlertDescription, HlmAlertTitle],
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
        @let trip = activeTrip()!;
        <section class="active-trip-section">
          <div class="trip-summary">
            <div>
              <h2>{{ trip.lineName }} · {{ trip.tripTypeName }}</h2>
              <p>{{ fa() ? 'ایستگاه‌های سفر فعال' : 'Active trip stations' }}</p>
            </div>
            <div class="active-trip-actions">
              <button hlmBtn variant="outline" (click)="goToLiveMap()">
                {{ fa() ? 'نمایش نقشه' : 'View Map' }}
              </button>
              <button hlmBtn variant="outline" (click)="showRoutes.set(!showRoutes())">
                {{ fa() ? 'مسیر جدید' : 'New Route' }}
              </button>
            </div>
          </div>
          <div class="active-stations">
            @for (station of trip.stations; track station.id; let i = $index) {
              <button class="active-station" (click)="openStation(station.id)">
                <span class="station-index" [class.current]="station.id === trip.nextStationId">
                  {{ i + 1 }}
                </span>
                <span class="station-details">
                  <strong>{{ station.name }}</strong>
                  @if (station.address) {
                    <span>{{ station.address }}</span>
                  }
                  <span>{{ station.passengers.length }} {{ fa() ? 'مسافر' : 'passengers' }}</span>
                </span>
                <span class="station-state">
                  @if (station.id === trip.nextStationId) {
                    {{ fa() ? 'ایستگاه بعدی' : 'Next station' }}
                  } @else if (isCompletedStation(station.id, trip.nextStationId, trip.stations)) {
                    {{ fa() ? 'انجام شد' : 'Completed' }}
                  }
                </span>
                <span aria-hidden="true">›</span>
              </button>
            } @empty {
              <p class="empty-stations">
                {{
                  fa()
                    ? 'ایستگاهی برای این سفر ثبت نشده است.'
                    : 'No stations are available for this trip.'
                }}
              </p>
            }
          </div>
        </section>
      }

      @if (showRoutes() && routes().length > 0) {
        <section class="routes-section">
          <h2 class="section-title">{{ fa() ? 'مسیرهای در دسترس' : 'Available Routes' }}</h2>
          <div class="routes-grid">
            @for (route of routes(); track route.id) {
              <lib-driver-route-card [route]="route" [fa]="fa()" (start)="startRoute($event)" />
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
      .active-trip-section {
        margin-bottom: 1.5rem;
      }
      .trip-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .trip-summary h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }
      .trip-summary p {
        margin: 0.35rem 0 0;
        color: var(--muted-foreground);
      }
      .active-stations {
        display: grid;
        gap: 0.65rem;
      }
      .active-station {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        width: 100%;
        padding: 1rem;
        text-align: start;
        color: inherit;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 0.75rem;
        cursor: pointer;
      }
      .active-station:hover {
        border-color: var(--primary);
      }
      .station-index {
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        flex: 0 0 2rem;
        border-radius: 50%;
        background: var(--muted);
        font-weight: 600;
      }
      .station-index.current {
        background: var(--primary);
        color: var(--primary-foreground);
      }
      .station-details {
        display: grid;
        gap: 0.2rem;
        min-width: 0;
        flex: 1;
      }
      .station-details span,
      .station-state,
      .empty-stations {
        color: var(--muted-foreground);
        font-size: 0.85rem;
      }
      .station-details span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .station-state {
        color: var(--primary);
      }
      @media (max-width: 600px) {
        .trip-summary {
          align-items: flex-start;
          flex-direction: column;
        }
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

  protected openStation(stationId: number): void {
    this.router.navigate(['/driver/station-operations', stationId])
  }

  protected isCompletedStation(
    stationId: number,
    nextStationId: number | null | undefined,
    stations: ActiveTrip['stations'],
  ): boolean {
    const nextIndex = stations.findIndex(station => station.id === nextStationId)
    const stationIndex = stations.findIndex(station => station.id === stationId)
    return nextIndex >= 0 && stationIndex >= 0 && stationIndex < nextIndex
  }
}
