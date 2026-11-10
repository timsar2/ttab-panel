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
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import {
  DepartureTimeDto,
  DepartureTimesApi,
  DepartureTimesStore,
  DEPARTURE_TIME_ACCESS_DENIED,
} from '@org/transport-departure-times-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { SignalInput } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { DEPARTURE_TIME_FEATURE, DEPARTURE_TIME_MANAGE } from '../departure-time.routes'

const columns: readonly DataTableColumn<DepartureTimeDto>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'shiftTime', header: 'Stored time' },
]

@Component({
  selector: 'lib-departure-time-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTable, SignalInput, FormField, RouterLink, HlmButton, HlmFieldImports],
  providers: [DepartureTimesStore],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">{{ config.heading ?? 'Departure times' }}</h1>
      @if (canManage()) {
        <a hlmBtn class="min-h-11" [routerLink]="['new']">Create departure time</a>
      }
    </header>
    <p class="text-muted-foreground mb-4">
      Named travel-time slots, not work shifts or Route departure rules.
    </p>
    <form class="mb-6 flex flex-wrap items-end gap-3" (submit)="search($event)">
      <div hlmField class="min-w-0 flex-1">
        <label hlmFieldLabel for="departure-search">Departure-time name</label>
        <input
          libSignalInput
          id="departure-search"
          type="search"
          class="min-h-11"
          [formField]="searchForm.name"
        />
      </div>
      <button hlmBtn variant="outline" type="submit" class="min-h-11">Search</button>
    </form>
    <p class="text-muted-foreground mb-4" role="note">
      The server returns at most 1,000 matching records without a total count. This list is not
      guaranteed to be complete.
    </p>
    @if (store.list()?.atLimit) {
      <p role="status" class="mb-4">The 1,000-record limit was reached. Narrow the name filter.</p>
    }
    <lib-data-table
      [rows]="store.list()?.items ?? []"
      [columns]="columns"
      [rowId]="rowId"
      [rowLabel]="rowLabel"
      [caption]="config.heading ?? 'Departure times'"
      [loading]="store.loading()"
      [error]="error()"
      [page]="page"
      [showPagination]="false"
      [rowActions]="canManage() ? actions : null"
      (retry)="reload()"
    />
    <ng-template #actions let-item>
      <a
        hlmBtn
        variant="outline"
        class="min-h-11"
        [routerLink]="[item.id, 'edit']"
        [attr.aria-label]="'Edit departure time: ' + item.name"
        >Edit</a
      >
    </ng-template>
  `,
})
export class DepartureTimePage {
  protected readonly config = inject(DEPARTURE_TIME_FEATURE)
  protected readonly canManage = inject(DEPARTURE_TIME_MANAGE)
  protected readonly store = inject(DepartureTimesStore)
  private readonly api = inject(DepartureTimesApi)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  })
  private readonly query = computed(() => ({ name: this.params().get('name') ?? '' }))
  private readonly draft = linkedSignal(() => {
    this.api.companyId()
    this.session.version()
    return { ...this.query() }
  })
  protected readonly searchForm = form(this.draft)
  protected readonly columns = columns
  protected readonly rowId = (row: DepartureTimeDto) => String(row.id)
  protected readonly rowLabel = (row: DepartureTimeDto) => row.name
  protected readonly page: DataTablePage = {
    pageIndex: 0,
    pageSize: 1000,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  }
  protected readonly error = computed(() => {
    const error = this.store.error()
    return error &&
      (error.code === DEPARTURE_TIME_ACCESS_DENIED || error.status === 401 || error.status === 403)
      ? (this.config.deniedMessage ?? 'You do not have access to departure times in this company.')
      : (error?.message ?? null)
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
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { name: this.draft().name.trim() || null },
    })
  }
}
