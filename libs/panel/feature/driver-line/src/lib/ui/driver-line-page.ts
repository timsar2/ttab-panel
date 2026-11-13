import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormField, form, required, submit } from '@angular/forms/signals'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { map, merge } from 'rxjs'
import { PeopleSearchStore, PersonRow, personId } from '@org/transport-people-data-access'
import { AutocompleteSearch, LookupSelect, type BilingualText } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { DRIVER_LINE_CONFIG } from '../driver-line.routes'
import { DriverLineState } from '../driver-line-state'

interface DriverLineRow {
  readonly id: number
  readonly fullName: string
  readonly nationalId?: string
  readonly companyId: number
  readonly companyName: string
  readonly lineId: number
  readonly lineName: string
  readonly driverId: number
  readonly directionId: number
  readonly directionName: string
  readonly fromDate: string
  readonly toDate: string
}
interface Direction {
  readonly id: number
  readonly name: string
}
interface Line {
  readonly id: number
  readonly name: string
  readonly directionName?: string
}
interface ApiEnvelope<T> {
  readonly result: T
  readonly code?: string
  readonly massage?: string
}
interface DriverLinePageResult {
  readonly list: readonly DriverLineRow[]
  readonly pagination: {
    readonly currentPage: number
    readonly totalPages: number
    readonly hasPreviousPage: boolean
    readonly hasNextPage: boolean
  }
}
interface Draft {
  driverId: number | null
  directionId: string
  lineId: string
  fromDate: string
  toDate: string
}
const emptyDraft = (): Draft => ({
  driverId: null,
  directionId: '',
  lineId: '',
  fromDate: '',
  toDate: '',
})

@Component({
  selector: 'lib-driver-line-page',
  imports: [AutocompleteSearch, FormField, HlmButton, HlmFieldImports, LookupSelect, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-muted-foreground text-sm">
            {{ language() === 'fa' ? 'تخصیص راننده' : 'Driver assignments' }}
          </p>
          <h1 class="text-2xl font-semibold">{{ title() }}</h1>
        </div>
        @if (isList() && canManage()) {
          <a hlmBtn class="min-h-11" routerLink="new">{{
            language() === 'fa' ? 'افزودن تخصیص' : 'Add assignment'
          }}</a>
        }
        @if (!isList()) {
          <a hlmBtn variant="outline" class="min-h-11" routerLink="..">{{
            language() === 'fa' ? 'بازگشت' : 'Back'
          }}</a>
        }
      </header>
      @if (!company()) {
        <p role="alert">{{ copy('denied') }}</p>
      } @else if (isList()) {
        <lib-autocomplete-search
          class="mb-5 block max-w-xl"
          id="driver-line-filter"
          [(query)]="driverQuery"
          [selectedOption]="selectedDriver()"
          [language]="language()"
          [label]="pair('driver')"
          [placeholder]="pair('findDriver')"
          [clearLabel]="pair('clear')"
          [loadingLabel]="pair('searching')"
          [minimumQueryLabel]="pair('minQuery')"
          [emptyLabel]="pair('noDrivers')"
          [options]="people.page()?.items ?? []"
          [loading]="people.loading()"
          [optionId]="driverId"
          [optionLabel]="driverLabel"
          [optionDescription]="driverDescription"
          (queryRequested)="searchPeople($event)"
          (optionSelected)="filterDriver($event)"
        />
        @if (error()) {
          <p class="text-destructive" role="alert">{{ copy('loadFailed') }}</p>
          <button hlmBtn variant="outline" (click)="loadList()">{{ copy('retry') }}</button>
        } @else if (loading()) {
          <p role="status">{{ copy('loading') }}</p>
        } @else if (!rows().length) {
          <p class="text-muted-foreground rounded-lg border p-6">{{ copy('empty') }}</p>
        } @else {
          <div class="overflow-x-auto rounded-lg border">
            <table class="w-full text-start text-sm">
              <thead class="bg-muted">
                <tr>
                  @for (heading of headings(); track heading) {
                    <th class="p-3">{{ heading }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr class="hover:bg-muted/40 border-t">
                    <td class="p-3">
                      <a
                        class="underline"
                        [routerLink]="['detail', row.id]"
                        [queryParams]="{ directionId: row.directionId }"
                        >{{ row.fullName }}</a
                      >
                    </td>
                    <td class="p-3">{{ row.companyName }}</td>
                    <td class="p-3">{{ row.directionName }}</td>
                    <td class="p-3">{{ row.lineName }}</td>
                    <td class="p-3">{{ date(row.fromDate) }}</td>
                    <td class="p-3">{{ date(row.toDate) }}</td>
                    <td class="p-3">
                      <a
                        class="underline"
                        [routerLink]="['detail', row.id]"
                        [queryParams]="{ directionId: row.directionId }"
                        >{{ copy('open') }}</a
                      >
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <nav
            class="mt-4 flex items-center justify-end gap-3"
            [attr.aria-label]="copy('pagination')"
          >
            <button
              hlmBtn
              variant="outline"
              class="min-h-11"
              type="button"
              [disabled]="!pagination().hasPreviousPage"
              (click)="changePage(pagination().currentPage - 1)"
            >
              {{ copy('previous') }}
            </button>
            <span aria-live="polite"
              >{{ pagination().currentPage }} / {{ pagination().totalPages }}</span
            >
            <button
              hlmBtn
              variant="outline"
              class="min-h-11"
              type="button"
              [disabled]="!pagination().hasNextPage"
              (click)="changePage(pagination().currentPage + 1)"
            >
              {{ copy('next') }}
            </button>
          </nav>
        }
      } @else {
        @if (isDetailRoute() && !id()) {
          <p class="text-destructive" role="alert">{{ copy('notFound') }}</p>
        }
        @if (loading()) {
          <p role="status">{{ copy('loading') }}</p>
        }
        @if (error()) {
          <p class="text-destructive" role="alert">{{ copy('loadFailed') }}</p>
        }
        @if (lookupError()) {
          <p class="text-destructive" role="alert">{{ copy('lookupFailed') }}</p>
        }
        @if (!canManage()) {
          <p role="alert">{{ copy('denied') }}</p>
        } @else if ((!isDetailRoute() || id()) && !loading() && (!id() || record())) {
          <form class="grid max-w-3xl gap-4 sm:grid-cols-2" (submit)="save($event)">
            <lib-autocomplete-search
              class="sm:col-span-2"
              id="driver-line-driver"
              [(query)]="driverQuery"
              [selectedOption]="selectedDriver()"
              [language]="language()"
              [label]="pair('driver')"
              [placeholder]="pair('findDriver')"
              [clearLabel]="pair('clear')"
              [loadingLabel]="pair('searching')"
              [minimumQueryLabel]="pair('minQuery')"
              [emptyLabel]="pair('noDrivers')"
              [options]="people.page()?.items ?? []"
              [loading]="people.loading()"
              [optionId]="driverId"
              [optionLabel]="driverLabel"
              [optionDescription]="driverDescription"
              (queryRequested)="searchPeople($event)"
              (optionSelected)="selectDriver($event)"
            />
            <lib-lookup-select
              id="driver-line-direction"
              [field]="assignmentForm.directionId"
              [label]="copy('route')"
              [placeholder]="copy('route')"
              [options]="directionOptions()"
              [language]="language()"
            />
            <lib-lookup-select
              id="driver-line-line"
              [field]="assignmentForm.lineId"
              [label]="copy('line')"
              [placeholder]="copy('line')"
              [options]="lineOptions()"
              [language]="language()"
            />
            <div hlmField>
              <label hlmFieldLabel for="assignment-from">{{ copy('from') }}</label
              ><input
                class="min-h-11 w-full"
                id="assignment-from"
                type="date"
                [formField]="assignmentForm.fromDate"
              />
            </div>
            <div hlmField>
              <label hlmFieldLabel for="assignment-to">{{ copy('to') }}</label
              ><input
                class="min-h-11 w-full"
                id="assignment-to"
                type="date"
                [formField]="assignmentForm.toDate"
              />
            </div>
            @if (error()) {
              <p class="text-destructive sm:col-span-2" role="alert">{{ copy('saveFailed') }}</p>
            }
            <div class="flex gap-2 sm:col-span-2">
              <button
                hlmBtn
                class="min-h-11"
                type="submit"
                [disabled]="saving() || assignmentForm().invalid()"
              >
                {{ saving() ? copy('saving') : copy('save') }}</button
              ><a hlmBtn variant="outline" class="min-h-11" routerLink="..">{{ copy('cancel') }}</a>
            </div>
          </form>
        }
      }
    </main>
  `,
})
export class DriverLinePage {
  protected readonly config = inject(DRIVER_LINE_CONFIG)
  protected readonly routeState = inject(DriverLineState)
  protected readonly people = inject(PeopleSearchStore)
  protected readonly language = this.config.language()
  protected readonly canManage = this.config.canManage()
  private readonly configuredCompany = this.config.company()
  protected readonly company = computed(() => {
    const routeCompany = this.routeState.clientId()
    const id = this.configuredCompany()
    return id !== null && routeCompany === id ? id : null
  })
  private readonly http = inject(HttpClient)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly params = toSignal(
    merge(...this.route.pathFromRoot.map(route => route.paramMap)).pipe(
      map(() => this.route.pathFromRoot.map(route => route.snapshot.paramMap)),
    ),
    { initialValue: this.route.pathFromRoot.map(route => route.snapshot.paramMap) },
  )
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  })
  protected readonly rows = signal<readonly DriverLineRow[]>([])
  protected readonly pagination = signal({
    currentPage: 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  })
  protected readonly record = signal<DriverLineRow | null>(null)
  protected readonly directions = signal<readonly Direction[]>([])
  protected readonly lines = signal<readonly Line[]>([])
  protected readonly loading = signal(false)
  protected readonly saving = signal(false)
  protected readonly error = signal(false)
  protected readonly lookupError = signal(false)
  protected readonly driverQuery = signal('')
  protected readonly selectedDriver = signal<PersonRow | null>(null)
  private readonly formHydrated = signal(false)
  protected readonly directionId = this.routeState.directionId
  protected readonly draft = signal<Draft>(emptyDraft())
  protected readonly assignmentForm = form(this.draft, schema => {
    required(schema.fromDate)
    required(schema.toDate)
    required(schema.lineId)
  })
  protected readonly directionOptions = computed(() =>
    this.directions().map(x => ({ value: String(x.id), label: x.name })),
  )
  protected readonly lineOptions = computed(() =>
    this.lines()
      .filter(
        x =>
          !x.directionName ||
          x.directionName === this.directions().find(d => d.id === this.directionId())?.name,
      )
      .map(x => ({ value: String(x.id), label: x.name })),
  )
  protected readonly id = this.routeState.driverLineId
  protected readonly isNew = computed(() => this.route.snapshot.routeConfig?.path === 'new')
  protected readonly isDetailRoute = computed(
    () =>
      this.route.snapshot.routeConfig?.path === 'detail/:id' ||
      this.route.snapshot.routeConfig?.path === 'detail/:id/edit',
  )
  protected readonly isEditing = this.isDetailRoute
  protected readonly isList = computed(() => !this.isNew() && !this.isDetailRoute())
  protected readonly title = computed(() =>
    this.isList()
      ? this.copy('title')
      : this.isNew()
        ? this.copy('newTitle')
        : this.copy('editTitle'),
  )
  protected readonly headings = computed(() =>
    this.language() === 'fa'
      ? ['راننده', 'شرکت', 'مسیر', 'خط', 'از تاریخ', 'تا تاریخ', 'عملیات']
      : ['Driver', 'Company', 'Route', 'Line', 'From', 'To', 'Action'],
  )
  protected readonly driverId = (row: PersonRow) => String(row.id)
  protected readonly driverLabel = (row: PersonRow) => ({
    en: row.fullName ?? `Driver ${row.id}`,
    fa: row.fullName ?? `راننده ${row.id}`,
  })
  protected readonly driverDescription = (row: PersonRow) =>
    row.nationalId ? { en: row.nationalId, fa: row.nationalId } : null

  constructor() {
    effect(() => {
      const params = this.params()
      const queryParams = this.queryParams()
      const clientId = this.readId(this.readRouteParam(params, 'companyId'))
      const driverLineId = this.readId(this.readRouteParam(params, 'id'))
      const directionId = this.readId(queryParams.get('directionId'))
      this.routeState.restoreFromRoute(clientId, driverLineId, directionId)
    })
    effect(() => {
      if (!this.formHydrated()) return
      const directionId = Number(this.draft().directionId) || null
      if (directionId !== this.routeState.directionId()) this.routeState.setDirectionId(directionId)
      const queryDirectionId = this.readId(this.queryParams().get('directionId'))
      if (queryDirectionId !== directionId) {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { directionId },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        })
      }
    })
    effect(() => {
      const directionId = this.directionId()
      const companyId = this.company()
      if (!directionId || !companyId || (!this.isNew() && !this.isEditing())) {
        untracked(() => this.lines.set([]))
        return
      }
      untracked(() =>
        this.http
          .post<ApiEnvelope<{ readonly list: readonly Line[] }>>(
            `${this.config.apiUrl}/v1/lines/search`,
            {
              companyId,
              directionId,
              pageNumber: 1,
              pageSize: 1000,
            },
          )
          .subscribe({
            next: value => this.lines.set(value?.result?.list ?? []),
            error: () => this.lookupError.set(true),
          }),
      )
    })
    effect(() => {
      const companyId = this.company()
      const id = this.id()
      const isList = this.isList()
      const isNew = this.isNew()
      const isDetail = this.isDetailRoute()
      const isEditing = this.isEditing()
      if (!companyId) return
      untracked(() => {
        if (isList) this.loadList()
        else if (isDetail || isEditing) {
          this.formHydrated.set(false)
          this.record.set(null)
          this.selectedDriver.set(null)
          this.draft.set(emptyDraft())
          if (id) {
            this.loadLookups()
            this.loadDetail()
          }
        } else if (isNew) {
          this.draft.set({
            ...emptyDraft(),
            directionId: String(this.routeState.directionId() ?? ''),
          })
          this.formHydrated.set(true)
          this.loadLookups()
        }
      })
    })
  }
  protected copy(key: string): string {
    const fa = this.language() === 'fa'
    const values: Record<string, [string, string]> = {
      title: ['Driver-Line assignments', 'تخصیص‌های راننده به خط'],
      detailTitle: ['Assignment details', 'جزئیات تخصیص'],
      newTitle: ['Add driver-line assignment', 'افزودن تخصیص راننده به خط'],
      editTitle: ['Edit driver-line assignment', 'ویرایش تخصیص راننده به خط'],
      driver: ['Driver', 'راننده'],
      findDriver: ['Search for a driver', 'جستجوی راننده'],
      clear: ['Clear', 'پاک‌کردن'],
      searching: ['Searching…', 'در حال جستجو…'],
      minQuery: ['Enter at least 2 characters', 'حداقل ۲ نویسه وارد کنید'],
      noDrivers: ['No drivers found', 'راننده‌ای یافت نشد'],
      denied: [
        'Access is limited to an authorized user in the selected company.',
        'دسترسی به کاربر مجاز در شرکت انتخاب‌شده محدود است.',
      ],
      loadFailed: ['Could not load driver-line assignments.', 'بارگذاری تخصیص‌ها ناموفق بود.'],
      lookupFailed: ['Could not load routes and lines.', 'بارگذاری مسیرها و خطوط ناموفق بود.'],
      saveFailed: ['Could not save the assignment.', 'ذخیره تخصیص ناموفق بود.'],
      notFound: ['Invalid driver-line assignment URL.', 'نشانی تخصیص راننده به خط معتبر نیست.'],
      empty: ['No assignments found.', 'تخصیصی یافت نشد.'],
      loading: ['Loading…', 'در حال بارگذاری…'],
      retry: ['Retry', 'تلاش مجدد'],
      open: ['Open', 'نمایش'],
      edit: ['Edit assignment', 'ویرایش تخصیص'],
      route: ['Route', 'مسیر'],
      line: ['Line', 'خط'],
      from: ['From date', 'از تاریخ'],
      to: ['To date', 'تا تاریخ'],
      saving: ['Saving…', 'در حال ذخیره…'],
      save: ['Save assignment', 'ذخیره تخصیص'],
      cancel: ['Cancel', 'انصراف'],
      clearSearch: ['Clear search', 'پاک‌کردن جستجو'],
      pagination: ['Assignment pages', 'صفحه‌های تخصیص'],
      previous: ['Previous', 'قبلی'],
      next: ['Next', 'بعدی'],
    }
    return values[key]?.[fa ? 1 : 0] ?? key
  }
  protected pair(key: string): BilingualText {
    const values: Record<string, BilingualText> = {
      driver: { en: 'Driver', fa: 'راننده' },
      findDriver: { en: 'Search for a driver', fa: 'جستجوی راننده' },
      clear: { en: 'Clear', fa: 'پاک‌کردن' },
      searching: { en: 'Searching…', fa: 'در حال جستجو…' },
      minQuery: { en: 'Enter at least 2 characters', fa: 'حداقل ۲ نویسه وارد کنید' },
      noDrivers: { en: 'No drivers found', fa: 'راننده‌ای یافت نشد' },
    }
    return values[key] ?? { en: key, fa: key }
  }
  protected date(value: string) {
    return value?.slice(0, 10) ?? ''
  }
  protected loadList() {
    const companyId = this.company()
    if (!companyId) return
    this.loading.set(true)
    this.error.set(false)
    const selectedDriver = this.selectedDriver()
    const body = {
      companyId,
      ...(selectedDriver ? { driverId: selectedDriver.id } : {}),
      pageNumber: Number(this.queryParams().get('page') ?? 1),
      pageSize: Number(this.queryParams().get('size') ?? 10),
    }
    this.http
      .post<ApiEnvelope<DriverLinePageResult>>(`${this.config.apiUrl}/v1/lines/search-driver`, body)
      .subscribe({
        next: value => {
          this.rows.set(value.result?.list ?? [])
          this.pagination.set(value.result?.pagination ?? this.pagination())
          this.loading.set(false)
        },
        error: () => {
          this.error.set(true)
          this.loading.set(false)
        },
      })
  }
  protected loadDetail() {
    const id = this.id()
    if (!id) {
      this.error.set(true)
      return
    }
    this.loading.set(true)
    this.error.set(false)
    this.http
      .get<ApiEnvelope<DriverLineRow>>(`${this.config.apiUrl}/v1/lines/driver/${id}`)
      .subscribe({
        next: value => {
          const row = value.result
          if (!row || row.id !== id || row.companyId !== this.company()) {
            this.error.set(true)
            this.loading.set(false)
            return
          }
          this.record.set(row)
          this.draft.set({
            driverId: row.driverId,
            directionId: String(row.directionId),
            lineId: String(row.lineId),
            fromDate: this.date(row.fromDate),
            toDate: this.date(row.toDate),
          })
          this.routeState.setDirectionId(row.directionId)
          this.selectedDriver.set({
            id: personId(row.driverId),
            fullName: row.fullName,
            nationalId: row.nationalId ?? null,
            profileImage: null,
          })
          this.driverQuery.set(row.fullName)
          this.formHydrated.set(true)
          this.loading.set(false)
        },
        error: () => {
          this.error.set(true)
          this.loading.set(false)
        },
      })
  }
  private loadLookups() {
    this.lookupError.set(false)
    this.http
      .post<ApiEnvelope<readonly Direction[]>>(`${this.config.apiUrl}/v1/directions/search`, {
        companyId: this.company(),
      })
      .subscribe({
        next: value => this.directions.set(value.result ?? []),
        error: () => this.lookupError.set(true),
      })
  }
  protected searchPeople(query: string) {
    this.driverQuery.set(query)
    if (query.trim().length < 2) {
      this.people.clear()
      if (this.isList()) {
        this.selectedDriver.set(null)
        this.goToFirstPage()
      } else {
        this.selectedDriver.set(null)
        this.draft.update(value => ({ ...value, driverId: null }))
      }
      return
    }
    const numeric = /^\d+$/.test(query.trim())
    this.people.load({
      fullName: numeric ? '' : query.trim(),
      nationalId: numeric ? query.trim() : '',
      userShiftState: null,
      pageIndex: 0,
      pageSize: 10,
    })
  }
  protected filterDriver(row: PersonRow) {
    this.selectedDriver.set(row)
    this.people.select(row.id)
    this.goToFirstPage()
  }
  private goToFirstPage() {
    if (this.queryParams().get('page') !== '1') {
      void this.router
        .navigate([], {
          relativeTo: this.route,
          queryParamsHandling: 'merge',
          queryParams: { page: 1 },
        })
        .then(() => this.loadList())
    } else this.loadList()
  }
  protected changePage(page: number) {
    void this.router
      .navigate([], { relativeTo: this.route, queryParamsHandling: 'merge', queryParams: { page } })
      .then(() => this.loadList())
  }
  protected selectDriver(row: PersonRow) {
    this.selectedDriver.set(row)
    this.people.select(row.id)
    this.draft.update(x => ({ ...x, driverId: row.id }))
    this.driverQuery.set(row.fullName ?? row.nationalId ?? String(row.id))
  }
  protected save(event: Event) {
    event.preventDefault()
    if (!this.canManage() || !this.company() || this.saving()) return
    void submit(this.assignmentForm, async () => {
      const draft = this.draft()
      const driver = this.selectedDriver()
      if (
        !driver ||
        driver.id !== draft.driverId ||
        !this.lineOptions().some(x => x.value === draft.lineId)
      )
        return
      this.saving.set(true)
      this.error.set(false)
      const payload = {
        ...(this.id() ? { id: this.id() } : {}),
        driverId: draft.driverId,
        lineId: Number(draft.lineId),
        fromDate: draft.fromDate,
        toDate: draft.toDate,
      }
      this.http.post(`${this.config.apiUrl}/v1/lines/driver`, payload).subscribe({
        next: () => {
          this.saving.set(false)
          void this.router.navigate(['..'], { relativeTo: this.route })
        },
        error: () => {
          this.saving.set(false)
          this.error.set(true)
        },
      })
    })
  }
  private readRouteParam(params: readonly import('@angular/router').ParamMap[], key: string) {
    return params.map(paramMap => paramMap.get(key)).find(value => value !== null) ?? null
  }
  private readId(value: string | null): number | null {
    if (!value || !/^[1-9]\d*$/.test(value)) return null
    const id = Number(value)
    return Number.isSafeInteger(id) ? id : null
  }
}
