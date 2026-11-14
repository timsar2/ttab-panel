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
import {
  DEPARTURE_TIME_CREATE,
  DEPARTURE_TIME_FEATURE,
  DEPARTURE_TIME_LANGUAGE,
  DEPARTURE_TIME_UPDATE,
} from '../departure-time.routes'
import { departureTimeText, DepartureTimeTextKey } from '../departure-time-text'

function columns(language: 'en' | 'fa'): readonly DataTableColumn<DepartureTimeDto>[] {
  return [
    { accessorKey: 'name', header: departureTimeText(language, 'name') },
    { accessorKey: 'shiftTime', header: departureTimeText(language, 'time') },
  ]
}

@Component({
  selector: 'lib-departure-time-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTable, SignalInput, FormField, RouterLink, HlmButton, HlmFieldImports],
  providers: [DepartureTimesStore],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-semibold">{{ t('title') }}</h1>
        @if (canCreate()) {
          <a hlmBtn class="min-h-11" [routerLink]="['new']">{{ t('create') }}</a>
        }
      </header>
      <p class="text-muted-foreground mb-4">{{ t('description') }}</p>
      <form class="mb-6 flex flex-wrap items-end gap-3" (submit)="search($event)">
        <div hlmField class="min-w-0 flex-1">
          <label hlmFieldLabel for="departure-search">{{ t('searchName') }}</label>
          <input
            libSignalInput
            id="departure-search"
            type="search"
            class="min-h-11"
            [formField]="searchForm.name"
          />
        </div>
        <button hlmBtn variant="outline" type="submit" class="min-h-11">{{ t('search') }}</button>
      </form>
      <p class="text-muted-foreground mb-4" role="note">{{ t('limitNote') }}</p>
      @if (store.list()?.atLimit) {
        <p role="status" class="mb-4">{{ t('limitReached') }}</p>
      }
      <lib-data-table
        [rows]="store.list()?.items ?? []"
        [columns]="columns()"
        [rowId]="rowId"
        [rowLabel]="rowLabel"
        [caption]="t('listCaption')"
        [loading]="store.loading()"
        [error]="error()"
        [loadingLabel]="t('loading')"
        [emptyLabel]="t('empty')"
        [errorTitle]="t('loadFailed')"
        [retryLabel]="t('retry')"
        [actionHeading]="t('actions')"
        [pagingLabel]="t('paging')"
        [pageLabel]="t('page')"
        [previousLabel]="t('previous')"
        [nextLabel]="t('next')"
        [page]="page"
        [showPagination]="false"
        [rowActions]="actions"
        (retry)="reload()"
      />
      <ng-template #actions let-item>
        <a
          hlmBtn
          variant="outline"
          class="min-h-11"
          [routerLink]="[item.id]"
          [attr.aria-label]="t('viewNamed').replace('{name}', item.name)"
          >{{ t('view') }}</a
        >
        @if (canUpdate()) {
          <a
            hlmBtn
            variant="outline"
            class="min-h-11"
            [routerLink]="[item.id, 'edit']"
            [attr.aria-label]="t('editNamed').replace('{name}', item.name)"
            >{{ t('edit') }}</a
          >
        }
      </ng-template>
    </main>
  `,
})
export class DepartureTimePage {
  protected readonly config = inject(DEPARTURE_TIME_FEATURE)
  protected readonly language = inject(DEPARTURE_TIME_LANGUAGE)
  protected readonly canCreate = inject(DEPARTURE_TIME_CREATE)
  protected readonly canUpdate = inject(DEPARTURE_TIME_UPDATE)
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
  protected readonly columns = computed(() => columns(this.language()))
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
    if (!error) return null
    return error.code === DEPARTURE_TIME_ACCESS_DENIED ||
      error.status === 401 ||
      error.status === 403
      ? (this.config.deniedMessage?.[this.language()] ?? this.t('accessDenied'))
      : this.t('requestFailed')
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
  protected t(key: DepartureTimeTextKey) {
    return departureTimeText(this.language(), key)
  }
  protected search(event: Event) {
    event.preventDefault()
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { name: this.draft().name.trim() || null },
    })
  }
}
