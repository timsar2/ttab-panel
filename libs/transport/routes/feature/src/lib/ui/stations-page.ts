import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import {
  RouteId,
  RouteStation,
  RoutesApi,
  RoutesStore,
  routeId,
} from '@org/transport-routes-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { HlmButton } from '@spartan-ng/helm/button'
import { ROUTE_FEATURE, ROUTE_LANGUAGE, ROUTE_MANAGE } from '../route.routes'
import { ROUTE_TEXT, routeText } from '../route-text'

@Component({
  selector: 'lib-stations-page',
  imports: [DataTable, HlmButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-muted-foreground mb-1 text-sm">{{ text('routes') }}</p>
          <h1 class="text-2xl font-semibold">{{ text('stations') }}</h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['../..']">{{
            text('back')
          }}</a>
          @if (canManage()) {
            <a hlmBtn class="min-h-11" [routerLink]="['add']">{{
              language() === 'fa' ? 'افزودن ایستگاه' : 'Add station'
            }}</a>
          }
        </div>
      </header>
      @if (invalidId()) {
        <p role="alert">{{ text('notFound') }}</p>
      } @else if (!hasCompany()) {
        <p role="alert" class="rounded-md border p-4">{{ deniedMessage() }}</p>
      } @else {
        <lib-data-table
          [rows]="store.stations() ?? emptyStations"
          [columns]="columns()"
          [rowId]="rowId"
          [rowLabel]="rowLabel"
          [caption]="text('stations')"
          [page]="page()"
          [showPagination]="false"
          [loading]="store.mapStatus() === 'loading'"
          [error]="listError()"
          [rowActions]="menuTemplate()"
          [actionHeading]="text('actions')"
          [loadingLabel]="text('stationsLoading')"
          [emptyLabel]="text('noStations')"
          [errorTitle]="text('stationsFailed')"
          [retryLabel]="text('retry')"
          (retry)="reload()"
        />
      }
    </main>
    <ng-template #stationMenu let-station>
      <a class="hover:bg-accent min-h-11 rounded px-3 py-2" [routerLink]="['detail', station.id]">{{
        language() === 'fa' ? 'مشاهده و ویرایش' : 'View / edit'
      }}</a>
    </ng-template>
  `,
})
export class StationsPage {
  protected readonly config = inject(ROUTE_FEATURE)
  protected readonly language = inject(ROUTE_LANGUAGE)
  protected readonly canManage = inject(ROUTE_MANAGE)
  protected readonly store = inject(RoutesStore)
  private readonly api = inject(RoutesApi)
  private readonly session = inject(SessionStore)
  private readonly activatedRoute = inject(ActivatedRoute)
  private readonly params = this.activatedRoute.paramMap
  protected readonly directionId = computed(() => this.readId(this.paramsSignal().get('id')))
  private readonly paramsSignal = toSignal(this.params, {
    initialValue: this.activatedRoute.snapshot.paramMap,
  })
  protected readonly invalidId = computed(
    () => this.paramsSignal().get('id') !== null && this.directionId() === null,
  )
  protected readonly emptyStations: readonly RouteStation[] = []
  protected readonly rowId = (station: RouteStation) => String(station.id)
  protected readonly rowLabel = (station: RouteStation) => station.name
  protected readonly menuTemplate =
    viewChild.required<TemplateRef<{ $implicit: RouteStation }>>('stationMenu')
  protected readonly columns = computed<readonly DataTableColumn<RouteStation>[]>(() => [
    {
      accessorKey: 'orderNo',
      header: this.language() === 'fa' ? 'شماره ایستگاه' : 'Order',
      cell: cell => cell.getValue(),
    },
    {
      accessorKey: 'name',
      header: this.language() === 'fa' ? 'نام ایستگاه' : 'Station',
      cell: cell => cell.getValue(),
    },
    {
      accessorKey: 'cityName',
      header: this.language() === 'fa' ? 'شهر' : 'City',
      cell: cell => cell.getValue() ?? '-',
    },
    {
      accessorKey: 'address',
      header: this.language() === 'fa' ? 'آدرس' : 'Address',
      cell: cell => cell.getValue() ?? '-',
    },
  ])
  protected readonly hasCompany = computed(
    () => this.session.user() !== null && this.api.companyId() !== null,
  )
  protected readonly deniedMessage = computed(
    () => this.config.deniedMessage?.[this.language()] ?? this.text('denied'),
  )
  protected readonly listError = computed(() => {
    const error = this.store.mapError()
    if (!error) return null
    return error.code === 'routes-access-denied' || error.status === 401 || error.status === 403
      ? this.deniedMessage()
      : this.text('stationsFailed')
  })
  protected readonly page = computed<DataTablePage>(() => ({
    pageIndex: 0,
    pageSize: Math.max(this.store.stations()?.length ?? 0, 1),
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  }))
  private loadedKey = ''

  constructor() {
    effect(() => {
      const id = this.directionId()
      const company = this.api.companyId()
      const version = this.session.version()
      const key = `${company ?? ''}:${version}:${id ?? ''}`
      if (!id || !this.hasCompany() || key === this.loadedKey) return
      this.loadedKey = key
      untracked(() => this.store.loadStations(id))
    })
  }

  protected text(key: keyof typeof ROUTE_TEXT) {
    return routeText(this.language(), key)
  }
  protected reload() {
    const id = this.directionId()
    if (id) this.store.loadStations(id)
  }
  private readId(value: string | null): RouteId | null {
    if (!value || !/^[1-9]\d*$/.test(value)) return null
    try {
      return routeId(Number(value))
    } catch {
      return null
    }
  }
}
