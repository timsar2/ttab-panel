import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { TransportHttp, transportRecord, unwrapTransport } from '@org/transport-http'
import { AutocompleteSearch, type BilingualText } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { Subscription, finalize } from 'rxjs'
import {
  PassengerAssignment,
  PassengerOption,
  PassengerRow,
  passengerSearchPayload,
} from '../passengers.models'
import { PASSENGER_COMPANY, PASSENGER_FEATURE, PASSENGER_LANGUAGE } from '../passengers.routes'

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Invalid server response.')
  return value as Record<string, unknown>
}

function list<T>(value: unknown, decode: (row: unknown) => T): readonly T[] {
  const envelope = Array.isArray(value) ? null : record(value)
  const result =
    envelope && typeof envelope['code'] === 'string'
      ? unwrapTransport(value, response => response)
      : envelope && Object.prototype.hasOwnProperty.call(envelope, 'result')
        ? envelope['result']
        : value
  const rows = Array.isArray(result) ? result : record(result)['list']
  if (!Array.isArray(rows)) throw new Error('Invalid list response.')
  return rows.map(decode)
}

function decodePassenger(value: unknown): PassengerRow {
  const row = record(value)
  if (typeof row['id'] !== 'number') throw new Error('Invalid passenger row.')
  return {
    id: row['id'],
    fullName: typeof row['fullName'] === 'string' ? row['fullName'] : '',
    nationalId: typeof row['nationalId'] === 'string' ? row['nationalId'] : '',
    profileImage: typeof row['profileImage'] === 'string' ? row['profileImage'] : '',
  }
}

function decodeOption(value: unknown): PassengerOption {
  const row = transportRecord(value)
  if (typeof row['id'] !== 'number' || typeof row['name'] !== 'string')
    throw new Error('Invalid lookup row.')
  return { id: row['id'], name: row['name'] }
}

const copy = {
  fa: {
    title: 'مسافران',
    name: 'نام مسافر',
    date: 'تاریخ',
    direction: 'مسیر',
    shift: 'شیفت',
    station: 'نام ایستگاه',
    line: 'نام خط',
    register: 'ثبت',
    loading: 'در حال بارگذاری...',
    empty: 'مسافری یافت نشد',
    retry: 'بارگذاری مجدد',
    select: 'انتخاب',
  },
  en: {
    title: 'Passengers',
    name: 'Passenger name',
    date: 'Date',
    direction: 'Direction',
    shift: 'Shift',
    station: 'Station name',
    line: 'Line name',
    register: 'Register',
    loading: 'Loading...',
    empty: 'No passengers found',
    retry: 'Retry',
    select: 'Select',
  },
} as const
const searchCopy = {
  label: { en: 'Passenger name', fa: 'نام مسافر' },
  clear: { en: 'Clear', fa: 'پاک کردن' },
  loading: { en: 'Loading...', fa: 'در حال بارگذاری...' },
  minimum: { en: 'Enter at least two characters', fa: 'حداقل دو حرف وارد کنید' },
  empty: { en: 'No passengers found', fa: 'مسافری یافت نشد' },
} satisfies Record<string, BilingualText>

@Component({
  selector: 'lib-passenger-page',
  imports: [FormsModule, AutocompleteSearch, HlmButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <h1 class="mb-6 text-2xl font-semibold">{{ text().title }}</h1>
    <section
      class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
      aria-label="{{ text().title }}"
    >
      <lib-autocomplete-search
        id="passenger-name"
        [language]="language()"
        [label]="searchCopy.label"
        [placeholder]="searchCopy.label"
        [clearLabel]="searchCopy.clear"
        [loadingLabel]="searchCopy.loading"
        [minimumQueryLabel]="searchCopy.minimum"
        [emptyLabel]="searchCopy.empty"
        [query]="query()"
        [options]="suggestions()"
        [loading]="loading()"
        [optionId]="optionId"
        [optionLabel]="optionLabel"
        [optionDescription]="optionDescription"
        (queryRequested)="search($event)"
        (optionSelected)="selectSuggestion($event)"
      />
      <label class="grid gap-1 text-sm"
        >{{ text().date
        }}<input
          class="bg-background min-h-11 rounded-md border px-3"
          type="date"
          [(ngModel)]="fromDate"
      /></label>
      <label class="grid gap-1 text-sm"
        >{{ text().direction
        }}<select
          class="bg-background min-h-11 rounded-md border px-3"
          [ngModel]="directionId()"
          (ngModelChange)="selectDirection($event)"
        >
          <option [ngValue]="null">{{ text().select }}</option>
          @for (item of directions(); track item.id) {
            <option [ngValue]="item.id">{{ item.name }}</option>
          }
        </select></label
      >
      <label class="grid gap-1 text-sm"
        >{{ text().shift
        }}<select class="bg-background min-h-11 rounded-md border px-3" [(ngModel)]="shiftId">
          <option [ngValue]="null">{{ text().select }}</option>
          @for (item of shifts(); track item.id) {
            <option [ngValue]="item.id">{{ item.name }}</option>
          }
        </select></label
      >
      <label class="grid gap-1 text-sm"
        >{{ text().station
        }}<select
          class="bg-background min-h-11 rounded-md border px-3"
          [(ngModel)]="stationId"
          [disabled]="!directionId()"
        >
          <option [ngValue]="null">{{ text().select }}</option>
          @for (item of stations(); track item.id) {
            <option [ngValue]="item.id">{{ item.name }}</option>
          }
        </select></label
      >
      <label class="grid gap-1 text-sm"
        >{{ text().line
        }}<select
          class="bg-background min-h-11 rounded-md border px-3"
          [(ngModel)]="lineId"
          [disabled]="!directionId()"
        >
          <option [ngValue]="null">{{ text().select }}</option>
          @for (item of lines(); track item.id) {
            <option [ngValue]="item.id">{{ item.name }}</option>
          }
        </select></label
      >
    </section>
    @if (error()) {
      <div role="alert" class="border-destructive mb-4 rounded border p-3">
        {{ error() }}
        <button type="button" class="underline" (click)="loadPassengers()">
          {{ text().retry }}
        </button>
      </div>
    }
    @if (loading() && !rows().length) {
      <p role="status">{{ text().loading }}</p>
    }
    @if (!loading() && !rows().length && !error()) {
      <p>{{ text().empty }}</p>
    }
    @if (rows().length) {
      <div class="overflow-x-auto rounded-md border">
        <table class="w-full text-start text-sm">
          <thead>
            <tr class="border-b">
              <th class="p-3">
                <input
                  type="checkbox"
                  aria-label="Select all passengers"
                  [checked]="allSelected()"
                  (change)="selectAll($event)"
                />
              </th>
              <th class="p-3">{{ text().name }}</th>
              <th class="p-3">{{ language() === 'fa' ? 'کد ملی' : 'National ID' }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.id) {
              <tr class="border-b last:border-0">
                <td class="p-3">
                  <input
                    type="checkbox"
                    [attr.aria-label]="row.fullName"
                    [checked]="selected().has(row.id)"
                    (change)="toggle(row.id, $event)"
                  />
                </td>
                <td class="p-3">{{ row.fullName }}</td>
                <td class="p-3">{{ row.nationalId }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    <button
      hlmBtn
      type="button"
      class="mt-5 min-h-11"
      [disabled]="saving() || selected().size === 0 || !shiftId || !stationId || !fromDate"
      (click)="register()"
    >
      {{ text().register }}
    </button>
    @if (notice()) {
      <p role="status" class="mt-3">{{ notice() }}</p>
    }
  `,
})
export class PassengerPage {
  protected readonly config = inject(PASSENGER_FEATURE)
  private readonly companyId = inject(PASSENGER_COMPANY)
  protected readonly language = inject(PASSENGER_LANGUAGE)
  private readonly route = inject(ActivatedRoute)
  protected readonly http = inject(TransportHttp)
  protected readonly text = computed(() => copy[this.language()])
  protected readonly searchCopy = searchCopy
  protected readonly rows = signal<readonly PassengerRow[]>([])
  protected readonly directions = signal<readonly PassengerOption[]>([])
  protected readonly shifts = signal<readonly PassengerOption[]>([])
  protected readonly stations = signal<readonly PassengerOption[]>([])
  protected readonly lines = signal<readonly PassengerOption[]>([])
  protected readonly selected = signal<ReadonlySet<number>>(new Set())
  protected readonly directionId = signal<number | null>(null)
  protected readonly query = signal('')
  protected readonly loading = signal(false)
  protected readonly saving = signal(false)
  protected readonly error = signal('')
  protected readonly notice = signal('')
  protected readonly suggestions = computed(() =>
    this.rows().filter(row =>
      row.fullName.toLocaleLowerCase().includes(this.query().toLocaleLowerCase()),
    ),
  )
  protected readonly allSelected = computed(
    () => this.rows().length > 0 && this.rows().every(row => this.selected().has(row.id)),
  )
  protected shiftId: number | null = null
  protected stationId: number | null = null
  protected lineId: number | null = null
  protected fromDate = new Date().toISOString().slice(0, 10)
  private readonly assignedOnly = this.route.snapshot.data['assignmentMode'] !== 'add'
  private searchRequest = 0
  protected readonly optionId = (row: PassengerRow) => String(row.id)
  protected readonly optionLabel = (row: PassengerRow): BilingualText => ({
    en: row.fullName,
    fa: row.fullName,
  })
  protected readonly optionDescription = (row: PassengerRow): BilingualText | null =>
    row.nationalId ? { en: row.nationalId, fa: row.nationalId } : null

  constructor() {
    effect(onCleanup => {
      const companyId = this.companyId()
      const subscriptions = new Subscription()
      this.rows.set([])
      this.selected.set(new Set())
      this.directions.set([])
      this.shifts.set([])
      this.stations.set([])
      this.lines.set([])
      if (companyId !== null) {
        subscriptions.add(
          this.http
            .request('GET', this.config.endpoints.directions, value => list(value, decodeOption), {
              companyId,
            })
            .subscribe({
              next: value => {
                if (companyId === this.companyId()) this.directions.set(value)
              },
              error: error => {
                if (companyId === this.companyId()) this.fail(error)
              },
            }),
        )
        subscriptions.add(
          this.http
            .request('GET', this.config.endpoints.shifts, value => list(value, decodeOption), {
              companyId,
            })
            .subscribe({
              next: value => {
                if (companyId === this.companyId()) this.shifts.set(value)
              },
              error: error => {
                if (companyId === this.companyId()) this.fail(error)
              },
            }),
        )
        this.loadPassengers('')
      }
      onCleanup(() => {
        subscriptions.unsubscribe()
        this.searchRequest++
        this.loading.set(false)
      })
    })
  }

  protected search(query: string) {
    this.query.set(query)
    this.loadPassengers(query)
  }
  protected selectSuggestion(row: PassengerRow) {
    this.query.set(row.fullName)
    this.loadPassengers(row.fullName)
  }
  protected toggle(id: number, event: Event) {
    const selected = new Set(this.selected())
    if ((event.target as HTMLInputElement).checked) selected.add(id)
    else selected.delete(id)
    this.selected.set(selected)
  }
  protected selectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked
    this.selected.set(checked ? new Set(this.rows().map(row => row.id)) : new Set())
  }
  protected loadPassengers(fullName = this.query()) {
    const companyId = this.companyId()
    if (companyId === null) return
    const request = ++this.searchRequest
    this.loading.set(true)
    this.error.set('')
    this.http
      .request(
        'GET',
        this.config.endpoints.search,
        value => list(value, decodePassenger),
        passengerSearchPayload(companyId, this.assignedOnly, fullName),
      )
      .pipe(
        finalize(() => {
          if (request === this.searchRequest) this.loading.set(false)
        }),
      )
      .subscribe({
        next: rows => {
          if (request === this.searchRequest && companyId === this.companyId()) {
            this.rows.set(rows)
            this.selected.set(new Set())
          }
        },
        error: error => {
          if (request === this.searchRequest && companyId === this.companyId()) this.fail(error)
        },
      })
  }
  protected selectDirection(value: number | null) {
    this.directionId.set(value)
    this.stationId = null
    this.lineId = null
    this.stations.set([])
    this.lines.set([])
    if (value === null) return
    const companyId = this.companyId()
    if (companyId === null) return
    this.http
      .request('POST', this.config.endpoints.stations, value => list(value, decodeOption), {
        companyId,
        directionId: value,
        name: '',
      })
      .subscribe({
        next: result => {
          if (companyId === this.companyId() && value === this.directionId())
            this.stations.set(result)
        },
        error: error => this.fail(error),
      })
    this.http
      .request('POST', this.config.endpoints.lines, value => list(value, decodeOption), {
        directionId: value,
      })
      .subscribe({
        next: result => {
          if (companyId === this.companyId() && value === this.directionId()) this.lines.set(result)
        },
        error: error => this.fail(error),
      })
  }
  protected register() {
    const passengerIds = [...this.selected()]
    if (!passengerIds.length || !this.shiftId || !this.stationId || !this.fromDate || this.saving())
      return
    const payload: PassengerAssignment = {
      passengerIds,
      shiftId: this.shiftId,
      stationId: this.stationId,
      ...(this.lineId ? { lineId: this.lineId } : {}),
      fromDate: this.fromDate,
    }
    this.saving.set(true)
    this.http
      .request(
        'POST',
        this.config.endpoints.assign,
        value => unwrapTransport(value, result => result),
        payload,
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notice.set(
            this.language() === 'fa' ? 'ثبت با موفقیت انجام شد.' : 'Registration completed.',
          )
          this.selected.set(new Set())
          this.loadPassengers()
        },
        error: error => this.fail(error),
      })
  }
  private fail(error: unknown) {
    this.error.set(
      error instanceof Error
        ? error.message
        : this.language() === 'fa'
          ? 'خطا در دریافت اطلاعات.'
          : 'Unable to load data.',
    )
  }
}
