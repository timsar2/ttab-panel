import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  untracked,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormField, form } from '@angular/forms/signals'
import { ActivatedRoute, Router } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import {
  PeopleApi,
  PeopleSearch,
  PeopleSearchStore,
  PersonRow,
  UserShiftState,
} from '@org/transport-people-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { LookupSelect, SignalInput } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { PEOPLE_FEATURE } from '../people.routes'

const columns: readonly DataTableColumn<PersonRow>[] = [
  { accessorKey: 'fullName', header: 'Person', cell: cell => cell.getValue() ?? '-' },
  { accessorKey: 'nationalId', header: 'National ID', cell: cell => cell.getValue() ?? '-' },
]
const noRows: readonly PersonRow[] = []
const states: readonly UserShiftState[] = ['All', 'HasShift', 'HasNotShift']

@Component({
  selector: 'lib-people-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTable, FormField, SignalInput, LookupSelect, HlmButton, HlmFieldImports],
  providers: [PeopleSearchStore],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <header class="mb-6 flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">{{ config.heading ?? 'People' }}</h1>
      <p class="text-muted-foreground">
        Company-scoped person records, not login permissions or passenger assignments.
      </p>
    </header>
    <form class="mb-6 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4" (submit)="search($event)">
      <div hlmField>
        <label hlmFieldLabel for="people-name">Full name</label>
        <input
          libSignalInput
          id="people-name"
          type="search"
          class="min-h-11"
          [formField]="searchForm.fullName"
        />
      </div>
      <div hlmField>
        <label hlmFieldLabel for="people-national-id">National ID</label>
        <input
          libSignalInput
          id="people-national-id"
          type="search"
          class="min-h-11"
          [formField]="searchForm.nationalId"
        />
      </div>
      <lib-lookup-select
        id="people-shift-state"
        label="Shift assignment filter"
        placeholder="No shift filter"
        [field]="searchForm.shiftState"
        [options]="shiftOptions"
      />
      <button hlmBtn variant="outline" type="submit" class="min-h-11">Search</button>
    </form>
    <lib-data-table
      [rows]="rows()"
      [columns]="columns"
      [rowId]="rowId"
      [rowLabel]="rowLabel"
      [caption]="config.heading ?? 'People'"
      [loading]="store.loading()"
      [error]="error()"
      [page]="page()"
      [actionLabel]="config.onSelect ? (config.actionLabel ?? 'Select person') : null"
      (rowAction)="select($event)"
      (pageChange)="changePage($event)"
      (retry)="reload()"
    />
  `,
})
export class PeoplePage {
  protected readonly config = inject(PEOPLE_FEATURE)
  protected readonly store = inject(PeopleSearchStore)
  private readonly api = inject(PeopleApi)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  })
  protected readonly query = computed<PeopleSearch>(() => {
    const params = this.params()
    const page = params.get('page')
    const number = page && /^[1-9]\d*$/.test(page) ? Number(page) : 1
    const size = Number(params.get('size'))
    const state = params.get('shift') as UserShiftState | null
    return {
      fullName: params.get('name') ?? '',
      nationalId: params.get('nationalId') ?? '',
      userShiftState: state && states.includes(state) ? state : null,
      pageIndex: Number.isSafeInteger(number) && number <= 2147483647 ? number - 1 : 0,
      pageSize: [10, 25, 50, 100].includes(size) ? size : 10,
    }
  })
  private readonly draft = linkedSignal(() => {
    this.api.companyId()
    this.session.version()
    return {
      fullName: this.query().fullName,
      nationalId: this.query().nationalId,
      shiftState: this.query().userShiftState ?? '',
    }
  })
  protected readonly searchForm = form(this.draft)
  protected readonly shiftOptions = [
    { value: 'All', label: 'All shift states' },
    { value: 'HasShift', label: 'Has a shift' },
    { value: 'HasNotShift', label: 'Has no shift' },
  ]
  protected readonly columns = columns
  protected readonly rowId = (row: PersonRow) => String(row.id)
  protected readonly rowLabel = (row: PersonRow) => row.fullName ?? `Person ${row.id}`
  protected readonly rows = computed(() =>
    this.session.user() && this.api.companyId() === this.store.companyId()
      ? (this.store.page()?.items ?? noRows)
      : noRows,
  )
  protected readonly error = computed(() =>
    this.store.status() === 'denied'
      ? (this.config.deniedMessage ?? 'You do not have access to people in this company.')
      : (this.store.error()?.message ?? null),
  )
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
    effect(() => {
      this.api.companyId()
      this.session.version()
      const query = this.query()
      untracked(() => this.store.load(query))
    })
  }

  protected reload() {
    this.store.load(this.query())
  }

  protected search(event: Event) {
    event.preventDefault()
    const draft = this.draft()
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: {
        name: draft.fullName.trim() || null,
        nationalId: draft.nationalId.trim() || null,
        shift: draft.shiftState || null,
        page: 1,
      },
    })
  }

  protected changePage(page: { pageIndex: number; pageSize: number }) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: { page: page.pageIndex + 1, size: page.pageSize },
    })
  }

  protected select(row: PersonRow) {
    if (this.api.companyId() === this.store.companyId() && this.store.select(row.id)) {
      const selected = this.store.selected()
      if (selected) this.config.onSelect?.(selected)
    }
  }
}
