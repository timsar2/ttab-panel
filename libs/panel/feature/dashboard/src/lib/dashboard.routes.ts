import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  InjectionToken,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core'
import { HttpHeaders } from '@angular/common/http'
import type { Signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import type { Routes } from '@angular/router'
import { RouterLink } from '@angular/router'
import { NeshanMapComponent } from '@org/shared-maps'
import type { NeshanMapPoint } from '@org/shared-maps'
import { decodeRouteGeometry } from '@org/shared-route-geometry'
import type { GeoJsonLineString } from '@org/shared-route-geometry'
import { authGuard } from '@org/auth-data-access'
import { TrackingConnectionService } from '@org/shared-tracking'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { HlmButton } from '@spartan-ng/helm/button'
import { firstValueFrom } from 'rxjs'

export interface DashboardFeatureConfig {
  readonly path: string
  readonly apiUrl: string
  readonly companyId: () => Signal<number | null>
  readonly language: () => Signal<'en' | 'fa'>
  readonly neshanMapApiKey: string | null
  readonly neshanServiceApiKey: string | null
}

interface Trip {
  id: number
  driverId: number
  directionId: number
  name?: string
  fullName?: string
  directionName?: string
}
interface Direction {
  id: number
  name: string
}
interface Station {
  id: number
  name?: string
  lat?: number | null
  lng?: number | null
}
interface Support {
  id: number
  subject: string
  requestDate?: string
  tripId?: number
}
const DASHBOARD_CONFIG = new InjectionToken<DashboardFeatureConfig>('DASHBOARD_CONFIG')

@Component({
  selector: 'lib-dashboard-page',
  imports: [NeshanMapComponent, RouterLink, DataTable, HlmButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6">
        <h1 class="text-2xl font-semibold">{{ language() === 'fa' ? 'داشبورد' : 'Dashboard' }}</h1>
        <p class="text-muted-foreground mt-1">
          {{
            language() === 'fa'
              ? 'سفر فعال را برای مشاهده مسیر و درخواست‌های پشتیبانی انتخاب کنید.'
              : 'Select an active trip to view its route and support requests.'
          }}
        </p>
      </header>
      @if (!companyId()) {
        <p role="alert" class="rounded-md border p-4">
          {{ language() === 'fa' ? 'ابتدا یک شرکت انتخاب کنید.' : 'Choose a company first.' }}
        </p>
      } @else {
        <div class="mb-5 grid max-w-xl gap-2">
          <label for="dashboard-trip" class="text-sm font-medium">{{
            language() === 'fa' ? 'سفر فعال' : 'Active trip'
          }}</label>
          <select
            id="dashboard-trip"
            class="bg-background min-h-11 rounded-md border px-3"
            [value]="selectedTripId()"
            [disabled]="loadingTrips()"
            (change)="selectTrip($event)"
          >
            <option value="">{{ language() === 'fa' ? 'انتخاب سفر' : 'Select a trip' }}</option>
            @for (trip of trips(); track trip.id) {
              <option [value]="trip.id">
                {{ trip.directionName || trip.name || (language() === 'fa' ? 'سفر' : 'Trip') }} ·
                {{ trip.fullName }} (#{{ trip.id }})
              </option>
            }
          </select>
        </div>
        @if (loadingTrips()) {
          <p role="status">
            {{ language() === 'fa' ? 'در حال بارگذاری سفرها...' : 'Loading trips...' }}
          </p>
        } @else if (error()) {
          <p role="alert">{{ error() }}</p>
        }
        <section class="mb-6 h-64 overflow-hidden rounded-lg md:h-80">
          <lib-neshan-map
            class="block h-full"
            [apiKey]="config.neshanMapApiKey"
            [serviceApiKey]="config.neshanServiceApiKey"
            [language]="language()"
            [points]="points()"
            [routeGeoJson]="routeGeoJson()"
            [liveLocation]="liveLocation()"
            [fitContainer]="true"
          />
        </section>
        @if (trackingError()) {
          <p role="alert" class="mb-4">{{ trackingError() }}</p>
        }
        <section aria-labelledby="dashboard-support-heading" class="mt-6 rounded-lg border p-4">
          <h2 id="dashboard-support-heading" class="mb-3 text-lg font-semibold">
            {{ language() === 'fa' ? 'درخواست‌های باز' : 'Open support requests' }}
          </h2>
          <lib-data-table
            [rows]="supportRequests()"
            [columns]="supportColumns()"
            [rowId]="supportRowId"
            [rowLabel]="supportRowLabel"
            [caption]="language() === 'fa' ? 'درخواست‌های باز' : 'Open support requests'"
            [loading]="loadingSupport()"
            [error]="supportError() || null"
            [page]="supportTablePage()"
            [showPagination]="false"
            [rowActions]="supportActionsTemplate()"
            [actionHeading]="language() === 'fa' ? 'مشاهده' : 'Open'"
            [loadingLabel]="
              language() === 'fa' ? 'در حال بارگذاری درخواست‌ها...' : 'Loading support requests...'
            "
            [emptyLabel]="
              language() === 'fa'
                ? 'درخواست بازی برای نمایش وجود ندارد.'
                : 'No open requests found.'
            "
            [errorTitle]="language() === 'fa' ? 'بارگذاری ناموفق بود' : 'Unable to load requests'"
            [retryLabel]="language() === 'fa' ? 'تلاش دوباره' : 'Retry'"
            [pagingLabel]="language() === 'fa' ? 'صفحه درخواست‌ها' : 'Support request pages'"
            [pageLabel]="language() === 'fa' ? 'صفحه' : 'Page'"
            [previousLabel]="language() === 'fa' ? 'قبلی' : 'Previous'"
            [nextLabel]="language() === 'fa' ? 'بعدی' : 'Next'"
            (retry)="reloadSupport()"
          />
          <ng-template #dashboardSupportActions let-request>
            <a
              hlmBtn
              variant="outline"
              class="min-h-11"
              [routerLink]="['/client', companyId(), 'support', request.id]"
              >{{ language() === 'fa' ? 'مشاهده' : 'Open' }}</a
            >
          </ng-template>
        </section>
      }
    </main>
  `,
})
class DashboardPage {
  protected readonly config = inject(DASHBOARD_CONFIG)
  protected readonly language = this.config.language()
  protected readonly companyId = this.config.companyId()
  protected readonly tracking = inject(TrackingConnectionService)
  protected readonly trips = signal<Trip[]>([])
  protected readonly selectedTripId = signal('')
  protected readonly selectedAt = signal(0)
  protected readonly points = signal<NeshanMapPoint[]>([])
  protected readonly routeGeoJson = signal<GeoJsonLineString | null>(null)
  protected readonly supportRequests = signal<Support[]>([])
  protected readonly supportColumns = computed<readonly DataTableColumn<Support>[]>(() => [
    { accessorKey: 'subject', header: this.language() === 'fa' ? 'موضوع' : 'Subject' },
    {
      accessorKey: 'requestDate',
      header: this.language() === 'fa' ? 'تاریخ درخواست' : 'Request date',
      cell: info => info.getValue() ?? '-',
    },
  ])
  protected readonly supportRowId = (request: Support) => String(request.id)
  protected readonly supportRowLabel = (request: Support) => request.subject
  protected readonly supportTablePage = computed<DataTablePage>(() => ({
    pageIndex: 0,
    pageSize: Math.max(this.supportRequests().length, 1),
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  }))
  protected readonly supportActionsTemplate =
    viewChild.required<TemplateRef<{ $implicit: Support }>>('dashboardSupportActions')
  protected readonly loadingTrips = signal(false)
  protected readonly loadingSupport = signal(true)
  protected readonly supportError = signal('')
  protected readonly error = signal('')
  protected readonly trackingError = signal('')
  protected readonly liveLocation = computed(() => {
    const tripId = Number(this.selectedTripId())
    if (!tripId) return null
    const location = [...this.tracking.driverLocations().values()].find(
      item => item.tripId === tripId && Date.parse(item.receivedAt) >= this.selectedAt(),
    )
    return location
      ? {
          id: location.driverId ?? undefined,
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          label: location.driverId ? `Driver #${location.driverId}` : '',
        }
      : null
  })
  private readonly http = inject(HttpClient)
  private readonly destroyRef = inject(DestroyRef)
  private loadedCompanyId: number | null = null
  private trackingClientId = ''

  constructor() {
    afterNextRender(() => {
      this.trackingClientId = globalThis.crypto.randomUUID()
      void this.tracking
        .connectCookieStream(`/api/auth/tracking-stream?clientId=${this.trackingClientId}`)
        .catch(() => {
          this.trackingError.set(
            this.language() === 'fa'
              ? 'اتصال ردیابی زنده برقرار نشد.'
              : 'Could not connect to live tracking.',
          )
        })
    })
    this.destroyRef.onDestroy(() => void this.tracking.disconnect())
    effect(() => {
      const companyId = this.companyId()
      if (!companyId || companyId === this.loadedCompanyId) return
      this.loadedCompanyId = companyId
      void this.loadTrips(companyId)
      void this.loadSupportRequests(companyId)
    })
  }

  protected async selectTrip(event: Event) {
    const control = event.target
    if (!(control instanceof HTMLSelectElement)) return
    const previousTrip = this.trips().find(item => String(item.id) === this.selectedTripId())
    this.selectedTripId.set(control.value)
    this.selectedAt.set(Date.now())
    this.points.set([])
    this.routeGeoJson.set(null)
    this.error.set('')
    this.trackingError.set('')
    const trip = this.trips().find(item => String(item.id) === this.selectedTripId())
    const selectedTrip = trip ?? previousTrip
    const companyId = this.companyId()
    if (selectedTrip && companyId) {
      try {
        await firstValueFrom(
          this.http.post(
            `${this.config.apiUrl}/auth/tracking-group`,
            {
              clientId: this.trackingClientId,
              companyId,
              driverId: selectedTrip.driverId,
              tripId: trip?.id ?? null,
            },
            { headers: new HttpHeaders({ 'X-Auth-Request': '1' }) },
          ),
        )
      } catch {
        this.trackingError.set(
          this.language() === 'fa'
            ? 'عضویت در گروه ردیابی سفر ناموفق بود.'
            : 'Could not join the trip tracking group.',
        )
      }
    }
    if (trip) void this.loadTripData(trip)
  }

  protected reloadSupport() {
    const companyId = this.companyId()
    if (companyId) void this.loadSupportRequests(companyId)
  }

  private async loadTrips(companyId: number) {
    this.loadingTrips.set(true)
    this.error.set('')
    try {
      const firstPage = await firstValueFrom(
        this.http.post<{ result?: { list?: Trip[]; pagination?: { totalPages?: number } } }>(
          `${this.config.apiUrl}/v1/trips/search`,
          {
            companyId,
            isActive: 1,
            pageNumber: 1,
            pageSize: 100,
          },
        ),
      )
      const trips = [...(firstPage.result?.list ?? [])]
      const totalPages = firstPage.result?.pagination?.totalPages ?? 1
      for (let pageNumber = 2; pageNumber <= totalPages; pageNumber++) {
        const page = await firstValueFrom(
          this.http.post<{ result?: { list?: Trip[] } }>(`${this.config.apiUrl}/v1/trips/search`, {
            companyId,
            isActive: 1,
            pageNumber,
            pageSize: 100,
          }),
        )
        trips.push(...(page.result?.list ?? []))
      }
      const directionResponse = await firstValueFrom(
        this.http.post<{ result?: Direction[] }>(`${this.config.apiUrl}/v1/directions/search`, {
          companyId,
        }),
      )
      const names = new Map(
        (directionResponse.result ?? []).map(direction => [direction.id, direction.name]),
      )
      this.trips.set(trips.map(trip => ({ ...trip, directionName: names.get(trip.directionId) })))
    } catch {
      this.error.set(
        this.language() === 'fa' ? 'بارگذاری سفرها ناموفق بود.' : 'Could not load active trips.',
      )
    } finally {
      this.loadingTrips.set(false)
    }
  }

  private async loadTripData(trip: Trip) {
    const companyId = this.companyId()
    if (!companyId) return
    this.error.set('')
    try {
      const [directionResponse, stationResponse] = await Promise.all([
        firstValueFrom(
          this.http.get<{ result?: { encodedPolyline?: string; routeGeometry?: unknown } }>(
            `${this.config.apiUrl}/v1/directions/${trip.directionId}`,
          ),
        ),
        firstValueFrom(
          this.http.post<{ result?: { list?: Station[] } | Station[] }>(
            `${this.config.apiUrl}/v1/stations/search`,
            { companyId, directionId: trip.directionId, name: '' },
          ),
        ),
      ])
      const direction = directionResponse.result
      this.routeGeoJson.set(
        decodeRouteGeometry(direction?.routeGeometry ?? direction?.encodedPolyline),
      )
      const stationResult = stationResponse.result
      const stations = Array.isArray(stationResult) ? stationResult : (stationResult?.list ?? [])
      this.points.set(
        stations.map((station, index) => ({
          id: station.id,
          order: index + 1,
          name: station.name ?? '',
          lat: station.lat ?? null,
          lng: station.lng ?? null,
        })),
      )
    } catch {
      this.error.set(
        this.language() === 'fa'
          ? 'بارگذاری اطلاعات سفر ناموفق بود.'
          : 'Could not load trip details.',
      )
    }
  }

  private async loadSupportRequests(companyId: number) {
    this.loadingSupport.set(true)
    this.supportError.set('')
    try {
      const response = await firstValueFrom(
        this.http.post<{ result?: { list?: Support[] } }>(
          `${this.config.apiUrl}/v1/support/search`,
          {
            companyId,
            supportTypeId: 2,
            isAnswered: false,
            pageNumber: 1,
            pageSize: 100,
          },
        ),
      )
      this.supportRequests.set(
        (response.result?.list ?? []).sort((left, right) =>
          (right.requestDate ?? '').localeCompare(left.requestDate ?? ''),
        ),
      )
    } catch {
      this.supportError.set(
        this.language() === 'fa'
          ? 'بارگذاری درخواست‌های پشتیبانی ناموفق بود.'
          : 'Could not load support requests.',
      )
    } finally {
      this.loadingSupport.set(false)
    }
  }
}

export function createDashboardRoutes(config: DashboardFeatureConfig): Routes {
  return [
    {
      path: config.path,
      canActivate: [authGuard],
      providers: [{ provide: DASHBOARD_CONFIG, useValue: config }],
      data: { breadcrumb: 'Dashboard' },
      component: DashboardPage,
    },
  ]
}
