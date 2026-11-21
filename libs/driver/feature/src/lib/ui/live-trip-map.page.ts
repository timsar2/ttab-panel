import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core'
import { Router } from '@angular/router'
import { NeshanLiveLocation, NeshanMapComponent, NeshanMapPoint } from '@org/shared-maps'
import { DriverLocationPublisherService } from '@org/shared-tracking'
import { SessionStore } from '@org/platform'
import { environment } from '@org/platform/config'
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@spartan-ng/helm/alert'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmSeparator } from '@spartan-ng/helm/separator'
import { HlmSpinner } from '@spartan-ng/helm/spinner'
import { ActiveTrip, DriverApi, Station } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'

@Component({
  selector: 'lib-live-trip-map-page',
  imports: [
    NeshanMapComponent,
    HlmButton,
    HlmSpinner,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmSeparator,
  ],
  template: `
    <div class="map-page" [attr.dir]="fa() ? 'rtl' : 'ltr'">
      @if (loading()) {
        <div class="loading-overlay">
          <hlm-spinner />
          <p>{{ fa() ? 'در حال بارگذاری نقشه...' : 'Loading map...' }}</p>
        </div>
      } @else if (error()) {
        <div class="error-overlay">
          <hlm-alert variant="destructive">
            <h2 hlmAlertTitle>{{ fa() ? 'خطا در بارگذاری' : 'Failed to load' }}</h2>
            <p hlmAlertDescription>{{ error() }}</p>
            <button hlmBtn variant="outline" (click)="loadTripData()">
              {{ fa() ? 'تلاش مجدد' : 'Retry' }}
            </button>
          </hlm-alert>
        </div>
      } @else if (trip(); as activeTrip) {
        <lib-neshan-map
          class="map-fill"
          [apiKey]="neshanMapApiKey"
          [serviceApiKey]="neshanServiceApiKey"
          [points]="mapPoints()"
          [routeGeoJson]="activeTrip.routeGeoJson"
          [liveLocation]="liveLocation()"
          [followLive]="true"
          [language]="config.language()"
        />

        <div class="map-controls">
          <button hlmBtn variant="outline" class="control-btn" (click)="toggleStationPanel()">
            <span class="btn-text">{{ fa() ? 'ایستگاه‌ها' : 'Stations' }}</span>
          </button>
        </div>

        @if (stationPanelOpen()) {
          <section
            class="station-panel"
            role="dialog"
            [attr.aria-label]="fa() ? 'ایستگاه‌ها' : 'Stations'"
          >
            <div class="panel-header">
              <div>
                <h2>{{ fa() ? 'ایستگاه‌ها و جهت مسیر' : 'Direction stations' }}</h2>
                <p class="trip-info">{{ activeTrip.lineName }} · {{ activeTrip.tripTypeName }}</p>
              </div>
              <button hlmBtn variant="ghost" size="icon" (click)="stationPanelOpen.set(false)">
                ×
              </button>
            </div>
            <hlm-separator />
            <div class="stations-list">
              <button hlmBtn variant="outline" class="stop-trip-action" (click)="endTrip()">
                {{ fa() ? 'پایان سفر' : 'Stop Trip' }}
              </button>
              @for (station of activeTrip.stations; track station.id; let i = $index) {
                <button
                  class="station-item"
                  [class.active]="isCurrentStation(station)"
                  [class.completed]="isCompletedStation(station)"
                  (click)="openStationOperations(station)"
                >
                  <span class="station-number">{{ i + 1 }}</span>
                  <div class="station-info">
                    <p class="station-name">{{ station.name }}</p>
                    @if (station.address) {
                      <p class="station-address">{{ station.address }}</p>
                    }
                    <p class="station-passengers">
                      {{ station.passengers.length }} {{ fa() ? 'مسافر' : 'passenger(s)' }}
                    </p>
                  </div>
                  <span class="station-status">
                    @if (isCurrentStation(station)) {
                      {{ fa() ? 'بعدی' : 'Next' }}
                    } @else if (isCompletedStation(station)) {
                      {{ fa() ? 'تکمیل' : 'Done' }}
                    }
                  </span>
                </button>
              }
            </div>
            <hlm-separator />
            <div class="panel-footer">
              <p class="publish-state" [class.ok]="publisher.running()">
                {{
                  publisher.running()
                    ? fa()
                      ? 'ارسال موقعیت بر اساس مسافت فعال است'
                      : 'Distance-based location sharing active'
                    : fa()
                      ? 'ارسال موقعیت غیرفعال'
                      : 'Location sharing inactive'
                }}
              </p>
              @if (publisher.permissionDenied()) {
                <p class="publish-error" role="alert">
                  {{
                    fa()
                      ? 'برای اشتراک موقعیت، دسترسی مکان را فعال کنید.'
                      : 'Allow location access to share your live position.'
                  }}
                </p>
              }
              @if (publishError()) {
                <p class="publish-error" role="status">{{ publishError() }}</p>
              }
              <button hlmBtn variant="outline" (click)="endTrip()">
                {{ fa() ? 'توقف مسیر سرویس' : 'Stop service direction' }}
              </button>
            </div>
          </section>
        }
      } @else {
        <div class="no-trip">
          <hlm-alert variant="default">
            <h2 hlmAlertTitle>{{ fa() ? 'سفر فعالی یافت نشد' : 'No active trip' }}</h2>
            <p hlmAlertDescription>
              {{ fa() ? 'برای شروع، یک مسیر را انتخاب کنید.' : 'Select a route to start a trip.' }}
            </p>
            <button hlmBtn (click)="goToRouteSelection()">
              {{ fa() ? 'انتخاب مسیر' : 'Select route' }}
            </button>
          </hlm-alert>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
      .map-page {
        height: 100%;
        position: relative;
      }
      .map-fill {
        height: 100%;
      }
      .loading-overlay,
      .error-overlay,
      .no-trip {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: var(--background);
        z-index: 10;
        gap: 1rem;
      }
      .map-controls {
        position: absolute;
        top: 1rem;
        inset-inline-end: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        z-index: 20;
      }
      .control-btn {
        background: var(--card);
      }
      .station-panel {
        position: absolute;
        inset-block: 0;
        inset-inline-start: 0;
        z-index: 30;
        min-width: 320px;
        max-width: 420px;
        width: min(420px, calc(100vw - 1rem));
        display: flex;
        flex-direction: column;
        background: var(--card);
        border-inline-start: 1px solid var(--border);
        box-shadow: var(--shadow-lg);
      }
      .panel-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem;
        align-items: flex-start;
      }
      .panel-header h2 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
      }
      .trip-info {
        margin: 0.25rem 0 0;
        font-size: 0.85rem;
        color: var(--muted-foreground);
      }
      .stations-list {
        flex: 1;
        padding: 0.5rem;
        overflow-y: auto;
      }
      .stop-trip-action {
        width: 100%;
        margin-bottom: 0.5rem;
      }
      .station-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        text-align: start;
        padding: 0.75rem;
        border: 1px solid transparent;
        border-radius: 0.5rem;
        background: transparent;
      }
      .station-item.active {
        border-color: var(--primary);
        background: color-mix(in srgb, var(--primary) 10%, transparent);
      }
      .station-item.completed {
        opacity: 0.65;
      }
      .station-number {
        width: 28px;
        height: 28px;
        border-radius: 9999px;
        background: var(--primary);
        color: var(--primary-foreground);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 600;
        flex-shrink: 0;
      }
      .station-info {
        flex: 1;
        min-width: 0;
      }
      .station-name {
        margin: 0;
        font-weight: 500;
        font-size: 0.9rem;
      }
      .station-address,
      .station-passengers {
        margin: 0.15rem 0 0;
        font-size: 0.75rem;
        color: var(--muted-foreground);
      }
      .station-status {
        font-size: 0.75rem;
        color: var(--primary);
        font-weight: 500;
      }
      .panel-footer {
        padding: 1rem;
        display: grid;
        gap: 0.75rem;
      }
      .publish-state {
        margin: 0;
        font-size: 0.8rem;
        color: var(--muted-foreground);
      }
      .publish-state.ok {
        color: var(--primary);
      }
      .publish-error {
        margin: 0;
        color: var(--destructive);
        font-size: 0.8rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveTripMapPage {
  private readonly api = inject(DriverApi)
  private readonly router = inject(Router)
  private readonly session = inject(SessionStore)
  protected readonly config = inject(DRIVER_FEATURE_CONFIG)
  protected readonly publisher = inject(DriverLocationPublisherService)

  protected readonly fa = computed(() => this.config.language() === 'fa')
  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly publishError = signal<string | null>(null)
  protected readonly trip = signal<ActiveTrip | null>(null)
  protected readonly stationPanelOpen = signal(false)
  protected readonly neshanMapApiKey = environment.neshanMapApiKey ?? null
  protected readonly neshanServiceApiKey = environment.neshanServiceApiKey ?? null

  protected readonly mapPoints = computed<NeshanMapPoint[]>(() =>
    (this.trip()?.stations ?? [])
      .filter(s => typeof s.lat === 'number' && typeof s.lng === 'number')
      .map((s, i) => ({
        id: s.id,
        order: s.order ?? i + 1,
        name: s.name,
        lat: s.lat ?? null,
        lng: s.lng ?? null,
      })),
  )

  protected readonly liveLocation = computed<NeshanLiveLocation | null>(() => {
    const pos = this.publisher.lastPosition()
    if (!pos) return null
    return { lat: pos.lat, lng: pos.lng, label: this.fa() ? 'راننده' : 'Driver' }
  })

  constructor() {
    afterNextRender(() => void this.loadTripData())
  }

  protected async loadTripData(): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    try {
      const trip = await this.api.activeTrip()
      this.trip.set(trip)
      if (trip) await this.startRealtime()
      else this.publisher.stop()
    } catch {
      this.error.set(this.fa() ? 'بارگذاری اطلاعات سفر ناموفق بود.' : 'Failed to load trip data.')
    } finally {
      this.loading.set(false)
    }
  }

  private async startRealtime(): Promise<void> {
    this.publishError.set(null)
    const driverId = this.session.user()?.businessEntityId ?? null

    const started = await this.publisher.start({
      distanceFilterMeters: 10,
      minIntervalMs: 5000,
      periodicIntervalMs: 15_000,
      getContext: () => {
        const currentTrip = this.api.cachedActiveTrip()
        if (!currentTrip) return null
        return {
          tripId: currentTrip.id,
          driverId,
          directionId: currentTrip.directionId,
          driverLineId: currentTrip.driverLineId,
          lineId: currentTrip.lineId ?? null,
          nextStationId: currentTrip.nextStationId ?? null,
        }
      },
      send: async payload => {
        await this.api.sendDriverLocation(payload)
      },
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
    if (!started && this.publisher.permissionDenied()) {
      this.publishError.set(
        this.fa()
          ? 'دسترسی مکان رد شده است. تنظیمات مرورگر را بررسی کنید.'
          : 'Location permission was denied. Check your browser settings.',
      )
    }
  }

  protected toggleStationPanel(): void {
    this.stationPanelOpen.update(v => !v)
  }
  protected isCurrentStation(station: Station): boolean {
    return this.trip()?.nextStationId === station.id
  }
  protected isCompletedStation(station: Station): boolean {
    const trip = this.trip()
    if (!trip?.nextStationId) return false
    const nextIndex = trip.stations.findIndex(s => s.id === trip.nextStationId)
    const idx = trip.stations.findIndex(s => s.id === station.id)
    return nextIndex > -1 && idx > -1 && idx < nextIndex
  }
  protected openStationOperations(station: Station): void {
    this.router.navigate(['/driver/station-operations', station.id])
  }
  protected async endTrip(): Promise<void> {
    const trip = this.trip()
    if (!trip) return
    if (
      !window.confirm(
        this.fa() ? 'آیا از پایان سفر اطمینان دارید؟' : 'Are you sure you want to end this trip?',
      )
    )
      return
    this.loading.set(true)
    try {
      await this.api.endTrip({ tripId: trip.id, directionId: trip.directionId })
      this.publisher.stop()
      await this.router.navigateByUrl('/driver/route-selection')
    } catch {
      this.error.set(this.fa() ? 'پایان سفر ناموفق بود.' : 'Failed to end trip. Please try again.')
    } finally {
      this.loading.set(false)
    }
  }
  protected goToRouteSelection(): void {
    this.router.navigateByUrl('/driver/route-selection')
  }
}
