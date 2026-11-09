import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormField, form } from '@angular/forms/signals'
import { ActivatedRoute, Router } from '@angular/router'
import { CompanyApi, CompanyRow, CompanySearchStore } from '@org/transport-company-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { SignalInput } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { COMPANY_FEATURE } from './company.routes'

const columns: readonly DataTableColumn<CompanyRow>[] = [
  { accessorKey: 'name', header: 'Company' },
  { accessorKey: 'companyTypeName', header: 'Type', cell: cell => cell.getValue() ?? '-' },
  { accessorKey: 'provinceName', header: 'Province', cell: cell => cell.getValue() ?? '-' },
  { accessorKey: 'cityName', header: 'City', cell: cell => cell.getValue() ?? '-' },
]
const noRows: readonly CompanyRow[] = []
function pageNumber(value: string | null) {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : 1
}

@Component({
  selector: 'lib-company-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTable, FormField, SignalInput, HlmButton, HlmFieldImports],
  providers: [CompanyApi, CompanySearchStore],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <header class="mb-6 flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">{{ config.heading ?? 'Companies' }}</h1>
      <p class="text-muted-foreground">
        Search company records. Viewing a record does not authorize a company workspace.
      </p>
    </header>
    <form class="mb-6 flex flex-wrap items-end gap-3" (submit)="search($event)">
      <div hlmField class="min-w-0 flex-1">
        <label hlmFieldLabel for="company-search">Company name</label>
        <input
          libSignalInput
          id="company-search"
          type="search"
          class="min-h-11"
          [formField]="searchForm.name"
        />
      </div>
      <button hlmBtn variant="outline" type="submit" class="min-h-11 min-w-11">Search</button>
    </form>
    <lib-data-table
      [rows]="rows()"
      [columns]="columns"
      [rowId]="rowId"
      [rowLabel]="rowLabel"
      [caption]="config.heading ?? 'Companies'"
      [loading]="store.loading()"
      [error]="error()"
      [page]="page()"
      [actionLabel]="config.onAction ? (config.actionLabel ?? 'Open') : null"
      (rowAction)="config.onAction?.($event)"
      (pageChange)="changePage($event)"
      (retry)="store.load(query())"
    />
  `,
})
export class CompanyPage {
  protected readonly config = inject(COMPANY_FEATURE)
  protected readonly store = inject(CompanySearchStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  })
  protected readonly query = computed(() => {
    const params = this.params()
    const requestedSize = Number(params.get('size'))
    return {
      name: params.get('name') ?? '',
      pageIndex: pageNumber(params.get('page')) - 1,
      pageSize: [10, 25, 50, 100].includes(requestedSize) ? requestedSize : 10,
    }
  })
  private readonly searchName = computed(() => this.query().name)
  private readonly draft = linkedSignal(() => ({ name: this.searchName() }))
  protected readonly searchForm = form(this.draft)
  protected readonly columns = columns
  protected readonly rowId = (row: CompanyRow) => String(row.id)
  protected readonly rowLabel = (row: CompanyRow) => row.name
  protected readonly rows = computed(() => this.store.page()?.items ?? noRows)
  protected readonly error = computed(() => {
    const error = this.store.error()
    return error?.status === 401 || error?.status === 403
      ? 'You do not have access to company search.'
      : (error?.message ?? null)
  })
  protected readonly page = computed<DataTablePage>(() => {
    const pagination = this.store.page()?.pagination
    return {
      pageIndex: this.query().pageIndex,
      pageSize: this.query().pageSize,
      totalPages: pagination?.totalPages ?? 0,
      hasPreviousPage: pagination?.hasPreviousPage ?? false,
      hasNextPage: pagination?.hasNextPage ?? false,
    }
  })

  constructor() {
    effect(() => this.store.load(this.query()))
  }

  protected search(event: Event) {
    event.preventDefault()
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { name: this.draft().name.trim() || null, page: 1 },
      queryParamsHandling: 'merge',
    })
  }

  protected changePage(page: { pageIndex: number; pageSize: number }) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page.pageIndex + 1, size: page.pageSize },
      queryParamsHandling: 'merge',
    })
  }
}
