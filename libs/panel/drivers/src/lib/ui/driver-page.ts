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
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import {
  DriversApi,
  DriversStore,
  DriverRow,
  DriverSearch,
} from '@org/transport-drivers-data-access'
import { DataTablePage } from '@org/ui-data-table'
import { AutocompleteSearch, type BilingualText } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { DRIVER_FEATURE, DRIVER_LANGUAGE, DRIVER_MANAGE } from '../driver.routes'
import { DRIVER_TEXT, driverText, safeDriverError, type DriverTextKey } from '../driver-text'
import { DriverTable } from './driver-table'

export function driverQuery(text: string, page: string | null, size: string | null): DriverSearch {
  const number = page && /^[1-9]\d*$/.test(page) ? Number(page) : 1
  return {
    fullName: /^\d+$/.test(text.trim()) ? '' : text.trim(),
    nationalId: /^\d+$/.test(text.trim()) ? text.trim() : '',
    pageIndex: Number.isSafeInteger(number) && number <= 2147483647 ? number - 1 : 0,
    pageSize: [10, 25, 50, 100].includes(Number(size)) ? Number(size) : 10,
  }
}
@Component({
  selector: 'lib-driver-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AutocompleteSearch, DriverTable, RouterLink, HlmButton],
  providers: [DriversStore],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-muted-foreground mb-1 text-sm">{{ text('peopleAndTransport') }}</p>
        <h1 class="text-2xl font-semibold">{{ text('drivers') }}</h1>
        <p class="text-muted-foreground mt-2">
          {{ text('driverListDescription') }}
        </p>
      </div>
      @if (canManage()) {
        <a hlmBtn class="min-h-11" [routerLink]="['new']" queryParamsHandling="preserve">{{
          text('addDriver')
        }}</a>
      }
    </header>
    <lib-autocomplete-search
      class="mb-6"
      id="driver-search"
      [language]="language()"
      [label]="DRIVER_TEXT.driverNameOrNationalId"
      [placeholder]="DRIVER_TEXT.driverSearchHint"
      [clearLabel]="DRIVER_TEXT.clearDriverSearch"
      [loadingLabel]="DRIVER_TEXT.searching"
      [minimumQueryLabel]="DRIVER_TEXT.minimumSearch"
      [emptyLabel]="DRIVER_TEXT.noMatchingDrivers"
      [query]="searchText()"
      [options]="suggestions()"
      [loading]="suggestionLoading()"
      [optionId]="rowId"
      [optionLabel]="rowLabel"
      [optionDescription]="optionDescription"
      (queryRequested)="search($event)"
      (optionSelected)="selectSuggestion($event)"
    />
    <lib-driver-table
      [rows]="store.page()?.items ?? []"
      [caption]="DRIVER_TEXT.drivers"
      [loading]="store.loading()"
      [error]="error()"
      [page]="page()"
      [canManage]="canManage()"
      (pageChange)="changePage($event)"
      (retry)="reload()"
    />
  `,
})
export class DriverPage {
  protected readonly config = inject(DRIVER_FEATURE)
  protected readonly canManage = inject(DRIVER_MANAGE)
  protected readonly language = inject(DRIVER_LANGUAGE)
  protected readonly DRIVER_TEXT = DRIVER_TEXT
  protected readonly store = inject(DriversStore)
  private readonly api = inject(DriversApi)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  })
  private readonly query = computed(() =>
    driverQuery(this.params().get('q') ?? '', this.params().get('page'), this.params().get('size')),
  )
  protected readonly searchText = linkedSignal(() => {
    this.api.companyId()
    this.session.version()
    return this.params().get('q') ?? ''
  })
  protected readonly rowId = (row: DriverRow) => String(row.id)
  protected readonly rowLabel = (row: DriverRow): BilingualText => ({
    en: row.fullName ?? `${driverText('en', 'driver')} ${row.id}`,
    fa: row.fullName ?? `${driverText('fa', 'driver')} ${row.id}`,
  })
  protected readonly optionDescription = (row: DriverRow): BilingualText | null =>
    row.nationalId === null ? null : { en: row.nationalId, fa: row.nationalId }
  protected readonly suggestions = computed(() => {
    const text = this.searchText().trim()
    const current = this.store.query()
    const expected = driverQuery(text, null, null)
    if (
      text.length < 2 ||
      !current ||
      current.fullName !== expected.fullName ||
      current.nationalId !== expected.nationalId
    )
      return []
    return this.store.page()?.items ?? []
  })
  protected readonly suggestionLoading = computed(() => {
    const text = this.searchText().trim()
    if (text.length < 2) return false
    const current = this.store.query()
    const expected = driverQuery(text, null, null)
    return (
      !current ||
      current.fullName !== expected.fullName ||
      current.nationalId !== expected.nationalId ||
      this.store.loading()
    )
  })
  protected readonly error = computed(() => {
    const denied = this.config.deniedMessage
      ? this.config.deniedMessage[this.language()]
      : this.text('accessManageDenied')
    if (!this.session.user() || this.api.companyId() === null) return denied
    const error = this.store.error()
    return error?.code === 'drivers-access-denied' || error?.status === 401 || error?.status === 403
      ? denied
      : error
        ? safeDriverError(error, this.language(), 'detailFailedGeneric')
        : null
  })
  protected readonly page = computed<DataTablePage>(() => ({
    pageIndex: this.query().pageIndex,
    pageSize: this.query().pageSize,
    totalPages: this.store.page()?.pagination.totalPages ?? 0,
    hasPreviousPage: this.store.page()?.pagination.hasPreviousPage ?? false,
    hasNextPage: this.store.page()?.pagination.hasNextPage ?? false,
  }))
  constructor() {
    effect(() => {
      this.api.companyId()
      this.session.version()
      const query = this.query()
      untracked(() => this.store.search(query))
    })
  }
  protected reload() {
    this.store.search(this.query())
  }
  protected text(key: DriverTextKey): string {
    return driverText(this.language(), key)
  }
  protected search(value: string) {
    this.searchText.set(value)
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: { q: value.trim() || null, page: 1 },
    })
  }
  protected selectSuggestion(row: DriverRow) {
    this.search(row.nationalId || row.fullName || '')
  }
  protected changePage(page: { pageIndex: number; pageSize: number }) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: { page: page.pageIndex + 1, size: page.pageSize },
    })
  }
}
