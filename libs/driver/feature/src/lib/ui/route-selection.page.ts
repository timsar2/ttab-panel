import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { DriverApi, RouteCard, ActiveTrip } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { NeshanMapComponent, NeshanMapPoint } from '@org/shared-maps'
import { environment } from '@org/platform/config'
import { DriverLocationPublisherService } from '@org/shared-tracking'
import { DriverRouteCard } from './driver-route-card'
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@spartan-ng/helm/alert'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmSpinner } from '@spartan-ng/helm/spinner'

@Component({
  selector: 'lib-route-selection-page',
  imports: [
    HlmButton,
    DriverRouteCard,
    NeshanMapComponent,
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
        @let trip = activeTrip()!;
        <section class="active-trip-section">
          <lib-neshan-map
            class="active-trip-map"
            [apiKey]="neshanMapApiKey"
            [serviceApiKey]="neshanServiceApiKey"
            [points]="mapPoints()"
            [routeGeoJson]="trip.routeGeoJson"
            [language]="config.language()"
          />
          <div class="trip-summary">
            <div>
              <h2>{{ trip.lineName }} · {{ trip.tripTypeName }}</h2>
              <p>{{ fa() ? 'ایستگاه‌های سفر فعال' : 'Active trip stations' }}</p>
            </div>
            <div class="active-trip-actions">
              <button hlmBtn variant="outline" (click)="goToLiveMap()">
                {{ fa() ? 'نمایش نقشه' : 'View Map' }}
              </button>
              <button hlmBtn variant="outline" (click)="endTrip()">
                {{ fa() ? 'پایان سفر' : 'Stop Trip' }}
              </button>
              <button hlmBtn variant="outline" (click)="showRoutes.set(!showRoutes())">
                {{ fa() ? 'مسیر جدید' : 'New Route' }}
              </button>
            </div>
          </div>
          @if (publishError()) {
            <p class="publish-error" role="status">{{ publishError() }}</p>
          }
          <ol class="active-stations" [attr.aria-label]="fa() ? 'مراحل سفر' : 'Trip steps'">
            @for (station of trip.stations; track station.id; let i = $index) {
              <li
                class="stepper-item"
                [class.current]="station.id === trip.nextStationId"
                [class.completed]="
                  isCompletedStation(station.id, trip.nextStationId, trip.stations)
                "
              >
                <span class="stepper-node" aria-hidden="true">
                  @if (isCompletedStation(station.id, trip.nextStationId, trip.stations)) {
                    <svg viewBox="0 0 20 20" fill="none">
                      <path d="m5 10 3.2 3.2L15 6.5" />
                    </svg>
                  } @else {
                    {{ i + 1 }}
                  }
                </span>
                <button class="active-station" (click)="openStation(station.id)">
                  <span class="station-details">
                    <strong>{{ station.name }}</strong>
                    @if (station.address) {
                      <span>{{ station.address }}</span>
                    }
                    <span>{{ station.passengers.length }} {{ fa() ? 'مسافر' : 'passengers' }}</span>
                  </span>
                  <span class="station-state">
                    @if (station.id === trip.nextStationId) {
                      {{ fa() ? 'ایستگاه بعدی' : 'Current stop' }}
                    } @else if (isCompletedStation(station.id, trip.nextStationId, trip.stations)) {
                      {{ fa() ? 'انجام شد' : 'Completed' }}
                    } @else {
                      {{ fa() ? 'پیش رو' : 'Upcoming' }}
                    }
                  </span>
                  <span class="station-chevron" aria-hidden="true">›</span>
                </button>
              </li>
            } @empty {
              <li class="empty-stations">
                {{
                  fa()
                    ? 'ایستگاهی برای این سفر ثبت نشده است.'
                    : 'No stations are available for this trip.'
                }}
              </li>
            }
          </ol>
        </section>
      }

      @if (tripActionError()) {
        <div class="publish-error" role="alert">
          <p>{{ tripActionError() }}</p>
          <button hlmBtn variant="outline" class="retry-btn" (click)="loadData()">
            {{ fa() ? 'تلاش مجدد' : 'Retry' }}
          </button>
        </div>
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
      .active-trip-map {
        display: block;
        height: 15rem;
        margin-bottom: 1rem;
      }
      .active-trip-map ::ng-deep [role='region'] {
        min-height: 0;
        height: 100%;
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
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .stepper-item {
        position: relative;
        min-height: 6rem;
        padding-inline-start: 3.25rem;
        padding-block: 0.35rem;
      }
      .stepper-item:not(:last-child)::after {
        position: absolute;
        z-index: 0;
        inset-inline-start: 0.95rem;
        top: 2.7rem;
        bottom: -0.35rem;
        width: 2px;
        background: var(--border);
        content: '';
      }
      .stepper-item.completed:not(:last-child)::after {
        background: var(--primary);
      }
      .stepper-node {
        position: absolute;
        z-index: 1;
        inset-inline-start: 0;
        top: 1.15rem;
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        border: 1px solid var(--border);
        border-radius: 50%;
        background: var(--muted);
        color: var(--muted-foreground);
        font-weight: 600;
      }
      .stepper-node svg {
        width: 1rem;
        height: 1rem;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .stepper-item.current .stepper-node {
        border-color: var(--primary);
        background: var(--primary);
        color: var(--primary-foreground);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 16%, transparent);
      }
      .stepper-item.completed .stepper-node {
        border-color: var(--primary);
        background: var(--primary);
        color: var(--primary-foreground);
      }
      .active-station {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        width: 100%;
        min-height: 5.25rem;
        padding: 0.85rem 1rem;
        text-align: start;
        color: inherit;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 0.75rem;
        cursor: pointer;
        transition:
          border-color 150ms ease,
          background-color 150ms ease;
      }
      .active-station:hover,
      .stepper-item.current .active-station {
        border-color: var(--primary);
      }
      .stepper-item.current .active-station {
        background: color-mix(in srgb, var(--primary) 4%, var(--card));
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
        white-space: nowrap;
      }
      .stepper-item:not(.current):not(.completed) .station-state {
        color: var(--muted-foreground);
      }
      .station-chevron {
        color: var(--muted-foreground);
        font-size: 1.25rem;
      }
      .publish-error {
        margin: 0 0 0.75rem;
        color: var(--destructive);
        font-size: 0.875rem;
      }
      @media (max-width: 600px) {
        .page-container {
          padding: 1rem;
        }
        .page-header {
          margin-bottom: 1.25rem;
        }
        .active-trip-map {
          height: 12rem;
          margin-inline: -1rem;
          width: calc(100% + 2rem);
        }
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
  private readonly publisher = inject(DriverLocationPublisherService)
  protected readonly fa = computed(() => this.config.language() === 'fa')
  protected readonly neshanMapApiKey = environment.neshanMapApiKey ?? null
  protected readonly neshanServiceApiKey = environment.neshanServiceApiKey ?? null

  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly tripActionError = signal<string | null>(null)
  protected readonly publishError = signal<string | null>(null)
  protected readonly routes = signal<RouteCard[]>([])
  protected readonly activeTrip = signal<ActiveTrip | null>(null)
  protected readonly showRoutes = signal(false)
  protected readonly mapPoints = computed<NeshanMapPoint[]>(() =>
    (this.activeTrip()?.stations ?? [])
      .filter(station => typeof station.lat === 'number' && typeof station.lng === 'number')
      .map((station, index) => ({
        id: station.id,
        order: station.order ?? index + 1,
        name: station.name,
        lat: station.lat ?? null,
        lng: station.lng ?? null,
      })),
  )

  constructor() {
    this.loadData()
  }

  protected async loadData(): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    this.tripActionError.set(null)
    try {
      const [routes, activeTrip] = await Promise.all([
        this.api.availableRoutes(),
        this.api.activeTrip(),
      ])
      this.routes.set(routes)
      this.activeTrip.set(activeTrip)
      this.showRoutes.set(!activeTrip)
      if (activeTrip) {
        if (typeof navigator !== 'undefined') void this.startLocationPublishing()
      } else {
        this.publisher.stop()
        this.publishError.set(null)
      }
    } catch {
      this.publisher.stop()
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
    this.tripActionError.set(null)
    try {
      await this.api.startTrip({
        driverLineId: route.driverLineId,
        shiftTimeId: route.shiftTimeId,
        tripTypeId: route.tripTypeId,
        directionId: route.directionId,
      })
    } catch {
      this.error.set(
        this.fa()
          ? 'شروع سفر ناموفق بود. لطفاً دوباره تلاش کنید.'
          : 'Failed to start trip. Please try again.',
      )
      this.loading.set(false)
      return
    }

    try {
      const trip = await this.api.activeTrip()
      if (!trip) {
        this.showRoutes.set(true)
        this.tripActionError.set(
          this.fa()
            ? 'سفر ثبت شد، اما دریافت اطلاعات آن ممکن نبود. لطفاً دوباره تلاش کنید.'
            : 'Trip started, but its details could not be loaded. Please retry.',
        )
        return
      }

      this.activeTrip.set(trip)
      this.showRoutes.set(false)
      if (typeof navigator !== 'undefined') void this.startLocationPublishing()
    } catch {
      this.showRoutes.set(true)
      this.tripActionError.set(
        this.fa()
          ? 'سفر ثبت شد، اما دریافت اطلاعات آن ممکن نبود. لطفاً دوباره تلاش کنید.'
          : 'Trip started, but its details could not be loaded. Please retry.',
      )
    } finally {
      this.loading.set(false)
    }
  }

  protected goToLiveMap(): void {
    this.router.navigateByUrl('/driver/live-map')
  }

  protected async endTrip(): Promise<void> {
    const trip = this.activeTrip()
    if (!trip) return
    if (
      !window.confirm(
        this.fa() ? 'آیا از پایان سفر اطمینان دارید؟' : 'Are you sure you want to end this trip?',
      )
    )
      return

    this.loading.set(true)
    this.tripActionError.set(null)
    try {
      await this.api.endTrip({ tripId: trip.id, directionId: trip.directionId })
      this.publisher.stop()
      this.activeTrip.set(null)
      this.showRoutes.set(true)
      this.publishError.set(null)
    } catch {
      this.tripActionError.set(
        this.fa() ? 'پایان سفر ناموفق بود.' : 'Failed to end trip. Please try again.',
      )
    } finally {
      this.loading.set(false)
    }
  }

  private async startLocationPublishing(): Promise<void> {
    this.publishError.set(null)
    const driverId = this.config.identity().driverId ?? null
    const started = await this.publisher.start({
      distanceFilterMeters: 10,
      minIntervalMs: 5000,
      periodicIntervalMs: 15_000,
      getContext: () => {
        const trip = this.api.cachedActiveTrip()
        if (!trip) return null
        return {
          tripId: trip.id,
          driverId,
          directionId: trip.directionId,
          driverLineId: trip.driverLineId,
          lineId: trip.lineId ?? null,
          nextStationId: trip.nextStationId ?? null,
        }
      },
      send: payload => this.api.sendDriverLocation(payload),
      onError: error => {
        this.publishError.set(
          error instanceof Error
            ? error.message
            : this.fa()
              ? 'ارسال موقعیت راننده با خطا مواجه شد.'
              : 'Driver location could not be sent.',
        )
      },
    })
    if (!started) {
      this.publishError.set(
        this.publisher.permissionDenied()
          ? this.fa()
            ? 'دسترسی مکان رد شده است. تنظیمات مرورگر را بررسی کنید.'
            : 'Location permission was denied. Check your browser settings.'
          : this.fa()
            ? 'موقعیت مکانی در این دستگاه در دسترس نیست.'
            : 'Location is unavailable on this device.',
      )
    }
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
