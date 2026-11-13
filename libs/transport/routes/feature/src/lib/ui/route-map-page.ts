import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import {
  DirectionRoute,
  RouteId,
  RouteStation,
  RoutesApi,
  RoutesStore,
  routeId,
} from '@org/transport-routes-data-access'
import { NeshanMapComponent, NeshanMapPoint } from '@org/shared-maps'
import { HlmButton } from '@spartan-ng/helm/button'
import { ROUTE_FEATURE, ROUTE_LANGUAGE } from '../route.routes'
import { ROUTE_TEXT, routeText } from '../route-text'

export function routeMapPoints(stations: readonly RouteStation[]): readonly NeshanMapPoint[] {
  return stations
    .filter(
      station =>
        station.lat !== null &&
        station.lng !== null &&
        Number.isFinite(station.lat) &&
        Number.isFinite(station.lng) &&
        station.lat >= -90 &&
        station.lat <= 90 &&
        station.lng >= -180 &&
        station.lng <= 180,
    )
    .map(station => ({
      id: station.id,
      order: station.orderNo,
      name: station.name,
      lat: station.lat,
      lng: station.lng,
    }))
}

@Component({
  selector: 'lib-route-map-page',
  imports: [HlmButton, NeshanMapComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-muted-foreground mb-1 text-sm">{{ text('routes') }}</p>
          <h1 class="text-2xl font-semibold">{{ text('map') }}</h1>
        </div>
        <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['..']">{{ text('back') }}</a>
      </header>

      @if (!hasCompany()) {
        <p role="alert" class="rounded-md border p-4">{{ deniedMessage() }}</p>
      } @else {
        <div class="mb-5 grid max-w-2xl gap-2">
          <label for="route-map-direction" class="text-sm font-medium">{{ text('route') }}</label>
          <select
            id="route-map-direction"
            class="bg-background min-h-11 rounded-md border px-3"
            [value]="selectedId()"
            [disabled]="store.listLoading() || store.listError() !== null"
            (change)="selectDirection($event)"
          >
            <option value="">{{ text('route') }}</option>
            @for (route of store.routes() ?? emptyRoutes; track route.id) {
              <option [value]="route.id">{{ route.name }} · {{ route.departureTime }}</option>
            }
          </select>
        </div>
        @if (store.listLoading()) {
          <p role="status">{{ text('loading') }}</p>
        } @else if (store.listError()) {
          <p role="alert">{{ listErrorMessage() }}</p>
          <button hlmBtn variant="outline" type="button" (click)="reloadRoutes()">
            {{ text('retry') }}
          </button>
        } @else if (invalidRouteId()) {
          <p role="alert">{{ text('notFound') }}</p>
        } @else if (!store.routes()?.length) {
          <p role="status">{{ text('empty') }}</p>
        } @else if (selectedId() && store.mapStatus() === 'loading') {
          <p role="status">{{ text('stationsLoading') }}</p>
        } @else if (selectedId() && store.mapStatus() === 'denied') {
          <p role="alert">{{ deniedMessage() }}</p>
        } @else if (selectedId() && store.mapStatus() === 'error') {
          <p role="alert">{{ text('stationsFailed') }}</p>
          <button hlmBtn variant="outline" type="button" (click)="reloadStations()">
            {{ text('retry') }}
          </button>
        } @else if (selectedId() && store.mapStatus() === 'ready') {
          <div class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <section class="min-w-0">
              @if (mapPoints().length === 0) {
                <p role="status" class="mb-3 rounded-md border p-3">{{ text('noStations') }}</p>
              }
              <lib-neshan-map
                [apiKey]="config.neshanMapApiKey ?? null"
                [language]="language()"
                [points]="mapPoints()"
              />
              <p class="text-muted-foreground mt-2 text-sm">{{ text('mapOrderNote') }}</p>
            </section>
            <aside class="min-w-0 rounded-lg border p-4" [attr.aria-label]="text('stations')">
              <h2 class="mb-3 text-lg font-semibold">{{ text('stations') }}</h2>
              <ol class="grid gap-2">
                @for (station of store.stations() ?? []; track station.id) {
                  <li class="bg-muted/50 flex min-w-0 gap-3 rounded-md p-3">
                    <span
                      class="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                      >{{ station.orderNo }}</span
                    >
                    <span class="min-w-0">
                      <span class="block font-medium break-words">{{ station.name }}</span>
                      <span class="text-muted-foreground block text-xs break-words">{{
                        station.address || station.cityName || '-'
                      }}</span>
                    </span>
                  </li>
                } @empty {
                  <li role="status" class="text-muted-foreground">{{ text('noStations') }}</li>
                }
              </ol>
            </aside>
          </div>
        }
      }
    </main>
  `,
})
export class RouteMapPage {
  protected readonly config = inject(ROUTE_FEATURE)
  protected readonly language = inject(ROUTE_LANGUAGE)
  protected readonly store = inject(RoutesStore)
  private readonly api = inject(RoutesApi)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly selectedId = signal('')
  protected readonly emptyRoutes: readonly DirectionRoute[] = []
  private readonly routeParamId = computed(() => this.validId(this.params().get('id')))
  protected readonly invalidRouteId = computed(
    () => this.params().get('id') !== null && this.routeParamId() === null,
  )
  protected readonly hasCompany = computed(
    () => this.session.user() !== null && this.api.companyId() !== null,
  )
  protected readonly deniedMessage = computed(
    () => this.config.deniedMessage?.[this.language()] ?? this.text('denied'),
  )
  protected readonly mapPoints = computed<readonly NeshanMapPoint[]>(() =>
    routeMapPoints(this.store.stations() ?? []),
  )
  protected readonly listErrorMessage = computed(() => {
    const error = this.store.listError()
    return error?.code === 'routes-access-denied' || error?.status === 401 || error?.status === 403
      ? this.deniedMessage()
      : this.text('failed')
  })
  private lastStationsKey = ''

  constructor() {
    effect(() => {
      this.api.companyId()
      this.session.version()
      const routeId = this.routeParamId()
      untracked(() => {
        this.selectedId.set(routeId === null ? '' : String(routeId))
        this.store.loadList()
      })
    })
    effect(() => {
      const routes = this.store.routes()
      const routeId = this.routeParamId()
      if (!routes) return
      if (this.params().get('id') !== null) {
        const exactRoute = routes.find(route => route.id === routeId)
        if (exactRoute && this.selectedId() !== String(exactRoute.id))
          untracked(() => this.selectedId.set(String(exactRoute.id)))
        else if (!exactRoute && this.selectedId()) untracked(() => this.selectedId.set(''))
        return
      }
      const selected =
        routeId === null
          ? routes.find(route => String(route.id) === this.selectedId())
          : routes.find(route => route.id === routeId)
      const fallback = selected ?? routes[0]
      if (fallback && this.selectedId() !== String(fallback.id))
        untracked(() => this.selectedId.set(String(fallback.id)))
      if (!fallback && this.selectedId()) untracked(() => this.selectedId.set(''))
    })
    effect(() => {
      this.api.companyId()
      const version = this.session.version()
      const selectedId = this.selectedId()
      const routes = this.store.routes()
      const selectedRoute = routes?.find(route => String(route.id) === selectedId)
      const key = `${this.api.companyId() ?? ''}:${version}:${selectedId}`
      if (!selectedRoute || key === this.lastStationsKey) return
      this.lastStationsKey = key
      untracked(() => this.store.loadStations(selectedRoute.id))
    })
  }

  protected text(key: keyof typeof ROUTE_TEXT) {
    return routeText(this.language(), key)
  }
  protected selectDirection(event: Event) {
    const target = event.target
    if (target instanceof HTMLSelectElement) {
      this.selectedId.set(target.value)
      this.lastStationsKey = ''
    }
  }
  protected reloadRoutes() {
    this.store.loadList()
  }
  protected reloadStations() {
    const route = this.store.routes()?.find(item => String(item.id) === this.selectedId())
    if (route) this.store.loadStations(route.id)
  }
  private validId(value: string | null): RouteId | null {
    if (!value || !/^[1-9]\d*$/.test(value)) return null
    try {
      return routeId(Number(value))
    } catch {
      return null
    }
  }
}
