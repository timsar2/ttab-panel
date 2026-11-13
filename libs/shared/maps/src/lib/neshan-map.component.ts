// Keep this package-owned ambient CSS declaration visible to every source consumer.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../styles.d.ts" />
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

export interface NeshanMapPoint {
  readonly id: number
  readonly order: number
  readonly name: string
  readonly lat: number | null
  readonly lng: number | null
}

interface GeoJsonFeatureCollection {
  readonly type: 'FeatureCollection'
  readonly features: readonly {
    readonly type: 'Feature'
    readonly geometry: {
      readonly type: 'Point' | 'LineString'
      readonly coordinates: readonly number[] | readonly (readonly number[])[]
    }
    readonly properties: Readonly<Record<string, string | number>>
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
          language() === 'fa' ? 'نقشه نشان و ایستگاه‌های مسیر' : 'Neshan map and Route stations'
        "
        role="region"
        aria-busy="true"
      ></div>
    }
  `,
})
export class NeshanMapComponent {
  readonly apiKey = input<string | null>(null)
  readonly points = input<readonly NeshanMapPoint[]>([])
  readonly language = input<'en' | 'fa'>('en')
  private readonly mapHost = viewChild<ElementRef<HTMLDivElement>>('mapHost')
  private readonly destroyRef = inject(DestroyRef)
  private readonly map = signal<NeshanMap | null>(null)
  private readonly ready = signal(false)
  protected readonly error = signal<string | null>(null)
  private disposed = false

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
      const orderedLine =
        points.length > 1
          ? [
              {
                type: 'Feature' as const,
                geometry: {
                  type: 'LineString' as const,
                  coordinates: points.map(point => [point.lng as number, point.lat as number]),
                },
                properties: { label: 'Station order' },
              },
            ]
          : []
      const pointData: GeoJsonFeatureCollection = {
        type: 'FeatureCollection',
        features: pointFeatures,
      }
      const lineData: GeoJsonFeatureCollection = {
        type: 'FeatureCollection',
        features: orderedLine,
      }

      this.setGeoJson(map, 'route-stations', pointData)
      this.setGeoJson(map, 'route-station-order', lineData)
      this.fit(map, points)
    })
    afterNextRender(() => void this.createMap())
    this.destroyRef.onDestroy(() => {
      this.disposed = true
      this.map()?.remove()
      this.map.set(null)
    })
  }

  private async createMap() {
    const apiKey = this.apiKey()?.trim()
    const host = this.mapHost()?.nativeElement
    if (!apiKey || !host || this.disposed) return
    try {
      await import('@neshan-maps-platform/maplibre-sdk/style.css')
      const sdk = await import('@neshan-maps-platform/maplibre-sdk')
      if (this.disposed) return
      const first = this.points().find(point => this.validPoint(point))
      const map = new sdk.default.Map({
        container: host,
        style: 'https://static.neshan.org/sdk/maplibre/styles/light.json',
        center: first ? [first.lng as number, first.lat as number] : [51.383743, 35.70115],
        zoom: first ? 12 : 6,
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

  private setGeoJson(map: NeshanMap, sourceId: string, data: GeoJsonFeatureCollection) {
    const existing = map.getSource(sourceId) as MutableGeoJsonSource | undefined
    if (existing?.setData) {
      existing.setData(data)
      return
    }
    map.addSource(sourceId, { type: 'geojson', data: data as never })
    if (sourceId === 'route-stations') {
      map.addLayer({
        id: 'route-station-points',
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 8,
          'circle-color': '#0f766e',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })
      map.addLayer({
        id: 'route-station-labels',
        type: 'symbol',
        source: sourceId,
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
      return
    }
    map.addLayer({
      id: 'route-station-order-line',
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#0f766e',
        'line-width': 3,
        'line-dasharray': [1.5, 1.5],
        'line-opacity': 0.7,
      },
    })
  }

  private fit(map: NeshanMap, points: readonly NeshanMapPoint[]) {
    if (points.length === 0) return
    if (points.length === 1) {
      map.easeTo({ center: [points[0].lng as number, points[0].lat as number], zoom: 13 })
      return
    }
    const longitudes = points.map(point => point.lng as number)
    const latitudes = points.map(point => point.lat as number)
    map.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      { padding: 48, maxZoom: 14, duration: 350 },
    )
  }

  private validPoint(point: NeshanMapPoint) {
    return (
      point.lat !== null &&
      point.lng !== null &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      point.lat >= -90 &&
      point.lat <= 90 &&
      point.lng >= -180 &&
      point.lng <= 180
    )
  }
}
