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
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import {
  InspectionSearch,
  InspectionSort,
  InspectionStore,
  InspectionVisitRow,
} from '@org/transport-inspection-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { HlmButton } from '@spartan-ng/helm/button'
import { INSPECTION_LANGUAGE, INSPECTION_SCOPE } from '../inspection.routes'
import { inspectionText, type InspectionTextKey } from '../inspection-text'

const sorts: readonly InspectionSort[] = [
  'InspectionDate DESC',
  'InspectionDate',
  'Id DESC',
  'Id',
  'DriverName',
  'DriverName DESC',
  'InspectorName',
  'InspectorName DESC',
]

@Component({
  selector: 'lib-inspection-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButton, DataTable],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">{{ t('title') }}</h1>
        <p class="text-muted-foreground mt-2">{{ t('summary') }}</p>
      </div>
      <a hlmBtn class="min-h-11" [routerLink]="['new']">{{ t('register') }}</a>
    </header>
    <label class="mb-5 grid max-w-md gap-2 text-sm"
      >{{ t('sort') }}
      <select
        class="bg-background min-h-11 rounded-md border px-3"
        [value]="search().orderBy"
        (change)="changeSort($any($event.target).value)"
      >
        @for (sort of sorts; track sort) {
          <option [value]="sort">{{ sort }}</option>
        }
      </select>
    </label>
    @if (scope() === null) {
      <p role="status">{{ t('selectCompany') }}</p>
    } @else if (store.listStatus() === 'denied') {
      <p role="alert">{{ t('denied') }}</p>
    } @else {
      <lib-data-table
        [rows]="rows()"
        [columns]="columns()"
        [rowId]="rowId"
        [rowLabel]="rowLabel"
        [caption]="t('title')"
        [loading]="store.listStatus() === 'loading'"
        [error]="tableError()"
        [page]="tablePage()"
        [rowActions]="actionsTemplate()"
        [actionHeading]="t('actionHeading')"
        [loadingLabel]="t('loading')"
        [emptyLabel]="t('empty')"
        [errorTitle]="t('failed')"
        [retryLabel]="t('retry')"
        [showPagination]="false"
        (retry)="reload()"
      />
      <ng-template #inspectionActions let-visit>
        <a hlmBtn variant="outline" class="min-h-11" [routerLink]="[visit.id]">{{ t('open') }}</a>
      </ng-template>
      <nav class="mt-4 flex items-center justify-between gap-3" [attr.aria-label]="t('title')">
        <button
          hlmBtn
          variant="outline"
          class="min-h-11"
          [disabled]="store.listStatus() === 'loading' || search().pageNumber <= 1"
          (click)="changePage(search().pageNumber - 1)"
        >
          {{ t('previous') }}
        </button>
        <span aria-live="polite">{{ t('page') }} {{ search().pageNumber }}</span>
        <button
          hlmBtn
          variant="outline"
          class="min-h-11"
          [disabled]="store.listStatus() === 'loading' || !store.hasNext()"
          (click)="changePage(search().pageNumber + 1)"
        >
          {{ t('next') }}
        </button>
      </nav>
    }
  `,
})
export class InspectionPage {
  protected readonly language = inject(INSPECTION_LANGUAGE)
  protected readonly store = inject(InspectionStore)
  protected readonly scope = inject(INSPECTION_SCOPE)
  protected readonly sorts = sorts
  protected readonly rows = computed(() => this.store.visits() ?? [])
  protected readonly columns = computed<readonly DataTableColumn<InspectionVisitRow>[]>(() => [
    { accessorKey: 'inspectionDate', header: this.t('date') },
    {
      accessorKey: 'inspectorName',
      header: this.t('inspector'),
      cell: info => info.getValue() ?? '-',
    },
    { accessorKey: 'driverName', header: this.t('driver'), cell: info => info.getValue() ?? '-' },
    { accessorKey: 'carPlate', header: this.t('vehicle'), cell: info => info.getValue() ?? '-' },
    { accessorKey: 'statusTypeId', header: this.t('status'), cell: info => info.getValue() ?? '-' },
  ])
  protected readonly rowId = (row: InspectionVisitRow) => String(row.id)
  protected readonly rowLabel = (row: InspectionVisitRow) => `${row.inspectionDate} #${row.id}`
  protected readonly tablePage = computed<DataTablePage>(() => ({
    pageIndex: this.search().pageNumber - 1,
    pageSize: this.search().pageSize,
    totalPages: 0,
    hasPreviousPage: this.search().pageNumber > 1,
    hasNextPage: this.store.hasNext(),
  }))
  protected readonly tableError = computed(() =>
    this.store.listStatus() === 'error' ? this.t('failed') : null,
  )
  protected readonly actionsTemplate =
    viewChild.required<TemplateRef<{ $implicit: InspectionVisitRow }>>('inspectionActions')
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  })
  protected readonly search = computed<InspectionSearch>(() => {
    const raw = Number(this.params().get('page'))
    const pageNumber = Number.isSafeInteger(raw) && raw > 0 && raw <= 32767 ? raw : 1
    const orderBy = this.params().get('orderBy') as InspectionSort | null
    return {
      pageNumber,
      pageSize: 25,
      orderBy: orderBy && sorts.includes(orderBy) ? orderBy : sorts[0],
    }
  })

  constructor() {
    effect(() => {
      const companyId = this.scope()
      const query = this.search()
      untracked(() => {
        if (companyId === null) this.store.clear()
        else this.store.load(query)
      })
    })
  }

  protected t(key: InspectionTextKey): string {
    return inspectionText(this.language(), key)
  }
  protected reload() {
    this.store.load(this.search())
  }
  protected changeSort(orderBy: string) {
    if (!sorts.includes(orderBy as InspectionSort)) return
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { orderBy, page: 1 },
      queryParamsHandling: 'merge',
    })
  }
  protected changePage(pageNumber: number) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 32767) return
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: pageNumber },
      queryParamsHandling: 'merge',
    })
  }
}
