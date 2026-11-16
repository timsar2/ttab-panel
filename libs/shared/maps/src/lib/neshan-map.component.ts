// Extend shared Neshan map to support live driver marker for tracking views.
// Backward compatible: existing inputs still work.
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core'
import type { Map as NeshanMap } from '@neshan-maps-platform/maplibre-sdk'
import { MapCoordinate, neshanDirectionsUrl, neshanRouteCoordinates } from './neshan-directions'

export interface NeshanMapPoint {
  readonly id: number
  readonly order: number
  readonly name: string
  readonly lat: number | null
  readonly lng: number | null
}

export interface NeshanLiveLocation {
  readonly id?: number | string
  readonly receivedAt?: string
  readonly lat: number
  readonly lng: number
  readonly heading?: number | null
  readonly label?: string
}

interface GeoJsonFeatureCollection {
  readonly type: 'FeatureCollection'
  readonly features: readonly {
    readonly type: 'Feature'
    readonly geometry: {
      readonly type: 'Point' | 'LineString'
      readonly coordinates: readonly number[] | readonly (readonly number[])[]
    }
    readonly properties: Readonly<Record<string, string | number | boolean>>
  }[]
}

interface MutableGeoJsonSource {
  setData(data: GeoJsonFeatureCollection): void
}

@Component({
  selector: 'lib-neshan-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    @if (!apiKey()) {
      <p class="rounded-md border p-4" role="status">
        {{
          language() === 'fa'
            ? 'کلید وب نقشه نشان تنظیم نشده است.'
            : 'Neshan Web Map API key is not configured.'
        }}
      </p>
    } @else if (error(); as mapError) {
      <div class="rounded-md border p-4" role="alert">
        <p>{{ language() === 'fa' ? 'نقشه بارگذاری نشد.' : 'The map could not be loaded.' }}</p>
        <p class="mt-1 text-sm">{{ mapError }}</p>
      </div>
    } @else {
      <div
        #mapHost
        class="bg-muted min-h-80 w-full overflow-hidden rounded-lg border sm:min-h-[28rem] lg:min-h-[36rem]"
        [attr.aria-label]="
          language() === 'fa' ? 'نقشه نشان و ایستگاه‌های مسیر' : 'Neshan map and route stations'
        "
        role="region"
      ></div>
      @if (routeError()) {
        <p class="text-muted-foreground mt-2 text-sm" role="status">
          {{
            language() === 'fa' ? 'نمایش مسیر جاده‌ای در دسترس نیست.' : 'Road route is unavailable.'
          }}
        </p>
      }
    }
  `,
})
export class NeshanMapComponent {
  readonly apiKey = input<string | null>(null)
  readonly serviceApiKey = input<string | null>(null)
  readonly points = input<readonly NeshanMapPoint[]>([])
  /** Live driver/vehicle marker updated in real time. */
  readonly liveLocation = input<NeshanLiveLocation | null>(null)
  /** Multiple live markers, for administration tracking views. */
  readonly liveLocations = input<readonly NeshanLiveLocation[]>([])
  /** When true, keep camera following live location. */
  readonly followLive = input(false)
  readonly language = input<'en' | 'fa'>('en')

  private readonly mapHost = viewChild<ElementRef<HTMLDivElement>>('mapHost')
  private readonly destroyRef = inject(DestroyRef)
  private readonly map = signal<NeshanMap | null>(null)
  private readonly ready = signal(false)
  protected readonly error = signal<string | null>(null)
  protected readonly routeError = signal(false)
  private disposed = false
  private routeRequestVersion = 0

  constructor() {
    effect(() => {
      const map = this.map()
      if (!map || !this.ready()) return
      const points = this.points()
        .filter(point => this.validPoint(point))
        .slice()
        .sort((left, right) => left.order - right.order)
      const pointFeatures = points.map(point => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [point.lng as number, point.lat as number],
        },
        properties: {
          label: `${point.order}. ${point.name}`,
          order: point.order,
        },
      }))
      const pointData: GeoJsonFeatureCollection = {
        type: 'FeatureCollection',
        features: pointFeatures,
      }
      this.setStations(map, pointData)
      if (!this.liveLocation() && this.liveLocations().length === 0) this.fit(map, points)
    })

    effect(() => {
      const map = this.map()
      const ready = this.ready()
      const points = this.points()
      const serviceApiKey = this.serviceApiKey()?.trim()
      if (!map || !ready) return
      const requestVersion = ++this.routeRequestVersion
      const url = neshanDirectionsUrl(points)
      if (!url) {
        this.clearRoute(map)
        this.routeError.set(false)
        return
      }
      if (!serviceApiKey) {
        this.clearRoute(map)
        this.routeError.set(true)
        return
      }
      this.routeError.set(false)
      void this.loadRoute(map, url, serviceApiKey, requestVersion)
    })

    effect(() => {
      const map = this.map()
      if (!map || !this.ready()) return
      const locations = this.liveLocations().length
        ? this.liveLocations()
        : this.liveLocation()
          ? [this.liveLocation()!]
          : []
      const validLocations = locations.filter(location =>
        this.validCoord(location.lat, location.lng),
      )
      if (validLocations.length === 0) {
        this.clearLive(map)
        return
      }
      this.setLive(map, validLocations)
      if (this.followLive() && validLocations.length === 1) {
        const live = validLocations[0]
        map.easeTo({
          center: [live.lng, live.lat],
          duration: 500,
          zoom: Math.max(map.getZoom(), 14),
        })
      }
    })

    afterNextRender(() => void this.createMap())
    this.destroyRef.onDestroy(() => {
      this.disposed = true
      this.routeRequestVersion++
      this.map()?.remove()
      this.map.set(null)
    })
  }

  private async createMap() {
    const apiKey = this.apiKey()?.trim()
    const host = this.mapHost()?.nativeElement
    if (!apiKey || !host || this.disposed) return
    try {
      // @ts-expect-error SDK stylesheet is resolved by the Angular bundler as a side-effect import.
      await import('@neshan-maps-platform/maplibre-sdk/style.css')
      const sdk = await import('@neshan-maps-platform/maplibre-sdk')
      if (this.disposed) return
      const first =
        this.liveLocations()[0] ??
        this.liveLocation() ??
        this.points().find(point => this.validPoint(point))
      const center: [number, number] =
        first && this.validCoord(first.lat, first.lng)
          ? [first.lng as number, first.lat as number]
          : [51.383743, 35.70115]
      const map = new sdk.default.Map({
        container: host,
        style: 'https://static.neshan.org/sdk/maplibre/styles/light.json',
        center,
        zoom: first ? 13 : 6,
        apiKey,
        trackResize: true,
      })
      map.addControl(new sdk.default.NavigationControl(), 'top-right')
      map.on('load', () => {
        if (!this.disposed) this.ready.set(true)
      })
      map.on('error', event => {
        const message = event.error?.message
        if (message && !this.error()) this.error.set(message)
      })
      this.map.set(map)
    } catch {
      if (!this.disposed) this.error.set('Neshan Map SDK could not be initialized.')
    }
  }

  private setStations(map: NeshanMap, data: GeoJsonFeatureCollection) {
    const existing = map.getSource('route-stations') as MutableGeoJsonSource | undefined
    if (existing?.setData) {
      existing.setData(data)
      return
    }
    map.addSource('route-stations', { type: 'geojson', data: data as never })
    if (!map.getLayer('route-station-points')) {
      map.addLayer({
        id: 'route-station-points',
        type: 'circle',
        source: 'route-stations',
        paint: {
          'circle-radius': 8,
          'circle-color': '#0f766e',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })
    }
    if (!map.getLayer('route-station-labels')) {
      map.addLayer({
        id: 'route-station-labels',
        type: 'symbol',
        source: 'route-stations',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-offset': [0, 1.6],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#172554',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      })
    }
  }

  private setLive(map: NeshanMap, locations: readonly NeshanLiveLocation[]) {
    const data: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: locations.map(live => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [live.lng, live.lat] },
        properties: {
          label: live.label ?? '',
          id: live.id ?? '',
          heading: live.heading ?? 0,
        },
      })),
    }
    const existing = map.getSource('live-driver') as MutableGeoJsonSource | undefined
    if (existing?.setData) {
      existing.setData(data)
      return
    }
    map.addSource('live-driver', { type: 'geojson', data: data as never })
    if (!map.getLayer('live-driver-direction')) {
      map.addLayer({
        id: 'live-driver-direction',
        type: 'symbol',
        source: 'live-driver',
        layout: {
          'text-field': '▲',
          'text-size': 20,
          'text-rotate': ['get', 'heading'],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#1d4ed8', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
      })
    }
    if (!map.getLayer('live-driver-pulse')) {
      map.addLayer({
        id: 'live-driver-pulse',
        type: 'circle',
        source: 'live-driver',
        paint: {
          'circle-radius': 14,
          'circle-color': '#2563eb',
          'circle-opacity': 0.2,
        },
      })
    }
    if (!map.getLayer('live-driver-point')) {
      map.addLayer({
        id: 'live-driver-point',
        type: 'circle',
        source: 'live-driver',
        paint: {
          'circle-radius': 8,
          'circle-color': '#2563eb',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
      })
    }
  }

  private clearLive(map: NeshanMap) {
    if (map.getLayer('live-driver-point')) map.removeLayer('live-driver-point')
    if (map.getLayer('live-driver-pulse')) map.removeLayer('live-driver-pulse')
    if (map.getLayer('live-driver-direction')) map.removeLayer('live-driver-direction')
    if (map.getSource('live-driver')) map.removeSource('live-driver')
  }

  private async loadRoute(
    map: NeshanMap,
    url: string,
    serviceApiKey: string,
    requestVersion: number,
  ) {
    try {
      const response = await fetch(url, { headers: { 'Api-Key': serviceApiKey } })
      if (!response.ok) throw new Error('Neshan route request failed.')
      const coordinates = neshanRouteCoordinates(await response.json())
      if (this.disposed || requestVersion !== this.routeRequestVersion) return
      this.setRoute(map, coordinates)
      if (!this.liveLocation()) this.fitCoordinates(map, coordinates)
      this.routeError.set(false)
    } catch {
      if (this.disposed || requestVersion !== this.routeRequestVersion) return
      this.clearRoute(map)
      this.routeError.set(true)
    }
  }

  private setRoute(map: NeshanMap, coordinates: readonly MapCoordinate[]) {
    const data: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates },
          properties: {},
        },
      ],
    }
    const existing = map.getSource('route-road') as MutableGeoJsonSource | undefined
    if (existing?.setData) {
      existing.setData(data)
      return
    }
    map.addSource('route-road', { type: 'geojson', data: data as never })
    if (!map.getLayer('route-road-line')) {
      map.addLayer({
        id: 'route-road-line',
        type: 'line',
        source: 'route-road',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.85 },
      })
    }
  }

  private clearRoute(map: NeshanMap) {
    if (map.getLayer('route-road-line')) map.removeLayer('route-road-line')
    if (map.getSource('route-road')) map.removeSource('route-road')
  }

  private fit(map: NeshanMap, points: readonly NeshanMapPoint[]) {
    this.fitCoordinates(
      map,
      points.map(point => [point.lng as number, point.lat as number] as const),
    )
  }

  private fitCoordinates(map: NeshanMap, coordinates: readonly MapCoordinate[]) {
    if (coordinates.length === 0) return
    if (coordinates.length === 1) {
      map.easeTo({ center: [...coordinates[0]], zoom: 13 })
      return
    }
    const longitudes = coordinates.map(([longitude]) => longitude)
    const latitudes = coordinates.map(([, latitude]) => latitude)
    map.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      { padding: 48, maxZoom: 14, duration: 350 },
    )
  }

  private validCoord(lat: unknown, lng: unknown): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    )
  }

  private validPoint(point: NeshanMapPoint) {
    return this.validCoord(point.lat, point.lng)
  }
}
