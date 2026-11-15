import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'
import { DriverApi, ActiveTrip, Station, RouteGeometry } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import { HlmDrawerImports } from '@spartan-ng/helm/drawer'
import { HlmCardImports } from '@spartan-ng/helm/card'
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmSeparatorImports } from '@spartan-ng/helm/separator'
import { HlmScrollAreaImports } from '@spartan-ng/helm/scroll-area'

@Component({
  selector: 'lib-live-trip-map-page',
  imports: [
    HlmButtonImports,
    HlmDrawerImports,
    HlmCardImports,
    HlmSpinnerImports,
    HlmAlertImports,
    HlmSeparatorImports,
    HlmScrollAreaImports,
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
            <hlm-alert-title>{{ fa() ? 'خطا در بارگذاری' : 'Failed to load' }}</hlm-alert-title>
            <hlm-alert-description>{{ error() }}</hlm-alert-description>
            <button hlmBtn variant="outline" (click)="loadTripData()">
              {{ fa() ? 'تلاش مجدد' : 'Retry' }}
            </button>
          </hlm-alert>
        </div>
      } @else if (trip()) {
        <div #mapContainer class="map-container" id="map"></div>

        <div class="map-controls">
          <button hlmBtn variant="outline" class="control-btn" (click)="centerOnDriver()">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <span class="btn-text">{{ fa() ? 'موقعیت من' : 'My Location' }}</span>
          </button>
          <button hlmBtn variant="outline" class="control-btn" (click)="toggleStationPanel()">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <span class="btn-text">{{
              stationPanelOpen()
                ? fa()
                  ? 'بستن پنل'
                  : 'Close Panel'
                : fa()
                  ? 'ایستگاه‌ها'
                  : 'Stations'
            }}</span>
          </button>
          <hlm-drawer>
            <button hlmBtn variant="outline" class="control-btn" hlmDrawerTrigger>
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <span class="btn-text">{{ fa() ? 'پشتیبانی' : 'Support' }}</span>
            </button>
            <div hlmDrawerContent />
            <div hlmDrawerSidebar class="support-drawer">
              <router-outlet />
            </div>
          </hlm-drawer>
        </div>

        <hlm-drawer [open]="stationPanelOpen()" (openChange)="stationPanelOpen.set($event)">
          <div hlmDrawerContent />
          <div hlmDrawerSidebar class="station-panel" [attr.dir]="fa() ? 'rtl' : 'ltr'">
            <div class="panel-header">
              <h2>{{ fa() ? 'لیست ایستگاه‌ها' : 'Stations' }}</h2>
              <p class="trip-info">{{ trip()?.lineName }} · {{ trip()?.tripTypeName }}</p>
              <button
                hlmBtn
                variant="ghost"
                size="icon"
                class="close-panel"
                (click)="stationPanelOpen.set(false)"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <hlm-separator />
            <hlm-scroll-area class="stations-list">
              @for (station of trip()?.stations; track station.id; let i = $index) {
                <button
                  class="station-item"
                  [class.active]="isCurrentStation(station)"
                  [class.completed]="isCompletedStation(station)"
                  (click)="openStationOperations(station)"
                >
                  <div class="station-marker">
                    <span class="station-number">{{ i + 1 }}</span>
                    @if (isCurrentStation(station)) {
                      <span class="current-badge">{{ fa() ? 'بعدی' : 'Next' }}</span>
                    } @else if (isCompletedStation(station)) {
                      <span class="completed-badge">✓</span>
                    }
                  </div>
                  <div class="station-info">
                    <p class="station-name">{{ station.name }}</p>
                    @if (station.address) {
                      <p class="station-address">{{ station.address }}</p>
                    }
                    <p class="station-passengers">
                      {{ station.passengers.length }} {{ fa() ? 'مسافر' : 'passenger'
                      }}{{ station.passengers.length !== 1 ? 's' : '' }}
                    </p>
                  </div>
                  <div class="station-status">
                    @if (isCurrentStation(station)) {
                      <span class="status-next">{{ fa() ? 'ایستگاه بعدی' : 'Next station' }}</span>
                    } @else if (isCompletedStation(station)) {
                      <span class="status-completed">{{ fa() ? 'تکمیل شده' : 'Completed' }}</span>
                    } @else {
                      <span class="status-upcoming">{{ fa() ? 'آینده' : 'Upcoming' }}</span>
                    }
                  </div>
                </button>
              }
            </hlm-scroll-area>
            <hlm-separator />
            <div class="panel-footer">
              <button hlmBtn variant="outline" (click)="endTrip()">
                {{ fa() ? 'پایان سفر' : 'End Trip' }}
              </button>
            </div>
          </div>
        </hlm-drawer>
      } @else {
        <div class="no-trip">
          <hlm-alert variant="default">
            <hlm-alert-title>{{ fa() ? 'سفر فعالی یافت نشد' : 'No active trip' }}</hlm-alert-title>
            <hlm-alert-description>{{
              fa()
                ? 'شما هیچ سفر فعالی ندارید. به انتخاب مسیر بروید.'
                : 'You have no active trip. Go to route selection.'
            }}</hlm-alert-description>
            <button hlmBtn (click)="goToRouteSelection()">
              {{ fa() ? 'انتخاب مسیر' : 'Select Route' }}
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
      }
      .error-overlay hlm-alert,
      .no-trip hlm-alert {
        max-width: 400px;
        width: 100%;
        text-align: center;
      }
      .map-container {
        width: 100%;
        height: 100%;
        position: relative;
      }
      .map-controls {
        position: absolute;
        top: 1rem;
        right: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        z-index: 100;
      }
      .control-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        box-shadow: var(--shadow-md);
        white-space: nowrap;
      }
      .control-btn:hover {
        background: var(--muted);
      }
      .btn-text {
        display: none;
      }
      @media (min-width: 768px) {
        .btn-text {
          display: inline;
        }
      }
      .support-drawer {
        min-width: 320px;
        max-width: 400px;
        padding: 1.5rem;
      }
      .station-panel {
        min-width: 320px;
        max-width: 400px;
        height: 100vh;
        display: flex;
        flex-direction: column;
        background: var(--card);
        border-inline-start: 1px solid var(--border);
      }
      .panel-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 1rem;
        gap: 1rem;
      }
      .panel-header h2 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
      }
      .trip-info {
        font-size: 0.875rem;
        color: var(--muted-foreground);
        margin: 0;
      }
      .close-panel {
        flex-shrink: 0;
      }
      .stations-list {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;
      }
      .station-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        border-radius: 0.5rem;
        background: transparent;
        border: 1px solid transparent;
        text-align: start;
        width: 100%;
        transition: all 0.2s;
      }
      .station-item:hover {
        background: var(--muted);
        border-color: var(--border);
      }
      .station-item.active {
        background: color-mix(in srgb, var(--primary) 10%, transparent);
        border-color: var(--primary);
      }
      .station-item.completed {
        opacity: 0.6;
      }
      .station-marker {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }
      .station-number {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--primary);
        color: var(--primary-foreground);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.75rem;
      }
      .station-item.completed .station-number {
        background: var(--muted);
        color: var(--muted-foreground);
      }
      .current-badge,
      .completed-badge {
        font-size: 0.625rem;
        padding: 0.125rem 0.375rem;
        border-radius: 9999px;
        background: var(--primary);
        color: var(--primary-foreground);
      }
      .completed-badge {
        background: var(--muted);
        color: var(--muted-foreground);
      }
      .station-info {
        flex: 1;
        min-width: 0;
      }
      .station-name {
        margin: 0 0 0.25rem;
        font-weight: 500;
        font-size: 0.875rem;
      }
      .station-address {
        margin: 0 0 0.25rem;
        font-size: 0.75rem;
        color: var(--muted-foreground);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .station-passengers {
        margin: 0;
        font-size: 0.75rem;
        color: var(--muted-foreground);
      }
      .station-status {
        flex-shrink: 0;
        font-size: 0.75rem;
        font-weight: 500;
      }
      .status-next {
        color: var(--primary);
      }
      .status-completed {
        color: var(--muted-foreground);
      }
      .status-upcoming {
        color: var(--muted-foreground);
      }
      .panel-footer {
        padding: 1rem;
        border-top: 1px solid var(--border);
      }
      .panel-footer button {
        width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveTripMapPage implements OnDestroy {
  private readonly api = inject(DriverApi)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly config = inject(DRIVER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')

  protected readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer')
  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly trip = signal<ActiveTrip | null>(null)
  protected readonly stationPanelOpen = signal(false)
  protected readonly driverLocation = signal<{ lat: number; lng: number } | null>(null)
  private map: any = null
  private watchId: number | null = null
  private mapLib: any = null

  constructor() {
    effect(() => {
      if (this.trip() && this.mapContainer()) {
        this.initMap()
      }
    })
    this.loadTripData()
    this.startLocationTracking()
  }

  ngOnDestroy(): void {
    this.cleanupMap()
    this.stopLocationTracking()
  }

  protected async loadTripData(): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    try {
      const [trip, geometry] = await Promise.all([
        this.api.activeTrip(),
        this.api.routeGeometry(0, 0), // Will be updated with actual IDs
      ])
      this.trip.set(trip)
      if (trip) {
        const geo = await this.api.routeGeometry(trip.id, trip.directionId)
        this.renderRoute(geo)
      }
    } catch {
      this.error.set(this.fa() ? 'بارگذاری اطلاعات سفر ناموفق بود.' : 'Failed to load trip data.')
    } finally {
      this.loading.set(false)
    }
  }

  private async initMap(): Promise<void> {
    if (this.map || !this.mapContainer()) return
    try {
      // Dynamic import for MapLibre GL
      const maplibregl = await import('maplibre-gl')

      // Try to import Neshan SDK, fallback to basic MapLibre style
      let nsdk: any = null
      try {
        // Use a variable to prevent TypeScript from resolving this optional dependency at compile time
        const neshanModuleName = '@neshan-maps-platform/sdk-maplibre'
        nsdk = await import(neshanModuleName)
      } catch {
        console.warn('Neshan SDK not available, using basic map style')
      }

      this.mapLib = { maplibregl, nsdk }

      // Initialize map - using environment variable for key
      const mapKey = (window as any).__NESHAN_MAP_KEY__ || 'your-map-key'

      // Use Neshan style if available, otherwise use a basic MapLibre style
      const mapStyle =
        nsdk && typeof nsdk.getStyle === 'function'
          ? nsdk.getStyle(mapKey)
          : 'https://demotiles.maplibre.org/style.json' // Fallback to demo style

      this.map = new maplibregl.Map({
        container: this.mapContainer()!.nativeElement,
        style: mapStyle,
        center: this.getInitialCenter(),
        zoom: 14,
        hash: true,
      })

      this.map.addControl(new maplibregl.NavigationControl(), 'top-right')
      this.map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }),
        'top-right',
      )

      this.addStationMarkers()
      this.addDriverMarker()
    } catch (e) {
      console.error('Map initialization failed:', e)
      this.error.set(
        this.fa()
          ? 'راه‌اندازی نقشه ناموفق بود. لطفاً کلید نقشه را بررسی کنید.'
          : 'Map initialization failed. Please check map key.',
      )
    }
  }

  private getInitialCenter(): [number, number] {
    const trip = this.trip()
    if (trip?.stations.length) {
      const first = trip.stations[0]
      if (first.lat && first.lng) return [first.lng, first.lat]
    }
    return [51.4215, 35.6892] // Tehran default
  }

  private renderRoute(geometry: RouteGeometry): void {
    if (!this.map || !this.mapLib || !geometry.coordinates.length) return

    const { maplibregl } = this.mapLib
    const routeGeoJson = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: geometry.coordinates,
      },
      properties: {},
    }

    if (this.map.getSource('route')) {
      this.map.getSource('route').setData(routeGeoJson)
    } else {
      this.map.addSource('route', { type: 'geojson', data: routeGeoJson })
      this.map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      })
    }
    this.map.fitBounds(this.calculateBounds(geometry.coordinates), { padding: 50 })
  }

  private calculateBounds(coords: number[][]): any {
    const { maplibregl } = this.mapLib
    const bounds = new maplibregl.LngLatBounds()
    coords.forEach(([lng, lat]) => bounds.extend([lng, lat]))
    return bounds
  }

  private addStationMarkers(): void {
    if (!this.map || !this.mapLib) return
    const { maplibregl } = this.mapLib
    const trip = this.trip()
    if (!trip?.stations.length) return

    const stationGeoJson = {
      type: 'FeatureCollection',
      features: trip.stations.map((station, index) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: station.lng && station.lat ? [station.lng, station.lat] : [0, 0],
        },
        properties: {
          id: station.id,
          name: station.name,
          order: index + 1,
          isCurrent: this.isCurrentStation(station),
          isCompleted: this.isCompletedStation(station),
        },
      })),
    }

    if (this.map.getSource('stations')) {
      this.map.getSource('stations').setData(stationGeoJson)
    } else {
      this.map.addSource('stations', { type: 'geojson', data: stationGeoJson })
      this.map.addLayer({
        id: 'station-markers',
        type: 'symbol',
        source: 'stations',
        layout: {
          'icon-image': 'marker',
          'icon-size': 0.8,
          'text-field': ['get', 'order'],
          'text-font': ['Open Sans SemiBold'],
          'text-size': 12,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        },
      })
    }
  }

  private addDriverMarker(): void {
    if (!this.map || !this.mapLib || !this.driverLocation()) return
    const { maplibregl } = this.mapLib
    const { lat, lng } = this.driverLocation()!

    const driverGeoJson = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {},
    }

    if (this.map.getSource('driver')) {
      this.map.getSource('driver').setData(driverGeoJson)
    } else {
      this.map.addSource('driver', { type: 'geojson', data: driverGeoJson })
      this.map.addLayer({
        id: 'driver-marker',
        type: 'circle',
        source: 'driver',
        paint: {
          'circle-radius': 10,
          'circle-color': '#3b82f6',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      })
    }
  }

  private startLocationTracking(): void {
    if (!navigator.geolocation) return
    this.watchId = navigator.geolocation.watchPosition(
      pos => {
        this.driverLocation.set({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        this.addDriverMarker()
      },
      err => {
        console.warn('Geolocation error:', err)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    )
  }

  private stopLocationTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
  }

  private cleanupMap(): void {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
  }

  protected centerOnDriver(): void {
    if (this.map && this.driverLocation()) {
      const { lat, lng } = this.driverLocation()!
      this.map.flyTo({ center: [lng, lat], zoom: 16 })
    } else if (this.map && this.trip()?.stations.length) {
      const station = this.trip()!.stations[0]
      if (station.lat && station.lng) {
        this.map.flyTo({ center: [station.lng, station.lat], zoom: 14 })
      }
    }
  }

  protected toggleStationPanel(): void {
    this.stationPanelOpen.set(!this.stationPanelOpen())
  }

  protected isCurrentStation(station: Station): boolean {
    const trip = this.trip()
    if (!trip?.nextStationId) return false
    return station.id === trip.nextStationId
  }

  protected isCompletedStation(station: Station): boolean {
    const trip = this.trip()
    if (!trip?.passengerStationId) return false
    const currentIndex = trip.stations.findIndex(s => s.id === trip.passengerStationId)
    const stationIndex = trip.stations.findIndex(s => s.id === station.id)
    return stationIndex < currentIndex
  }

  protected openStationOperations(station: Station): void {
    this.router.navigate(['/driver/station-operations', station.id])
  }

  protected async endTrip(): Promise<void> {
    const trip = this.trip()
    if (!trip) return

    const confirmed = window.confirm(
      this.fa() ? 'آیا از پایان سفر اطمینان دارید؟' : 'Are you sure you want to end this trip?',
    )
    if (!confirmed) return

    this.loading.set(true)
    try {
      await this.api.endTrip({ tripId: trip.id, directionId: trip.directionId })
      await this.router.navigateByUrl('/driver/route-selection')
    } catch {
      this.error.set(
        this.fa()
          ? 'پایان سفر ناموفق بود. لطفاً دوباره تلاش کنید.'
          : 'Failed to end trip. Please try again.',
      )
    } finally {
      this.loading.set(false)
    }
  }

  protected goToRouteSelection(): void {
    this.router.navigateByUrl('/driver/route-selection')
  }
}
