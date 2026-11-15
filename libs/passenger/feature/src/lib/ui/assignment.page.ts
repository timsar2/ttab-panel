import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core'
import { Choice, PassengerApi, PassengerRecord } from '../passenger.api'
import { PASSENGER_FEATURE_CONFIG } from '../passenger.routes'
import { HlmButtonImports } from '@spartan-ng/helm/button'

@Component({
  selector: 'lib-passenger-assignment-page',
  imports: [HlmButtonImports],
  template: `
    <div class="page-head">
      <h1>{{ fa() ? 'شیفت و ایستگاه' : 'Shift and pickup station' }}</h1>
      <p>
        {{
          fa()
            ? 'انتخاب جدید تا زمان تأیید سرویس، برنامه ذخیره‌شده را تغییر نمی‌دهد.'
            : 'Your saved assignment stays in effect until the service confirms a change.'
        }}
      </p>
    </div>
    @if (loading()) {
      <div class="panel" role="status">
        {{ fa() ? 'در حال بارگذاری گزینه‌ها...' : 'Loading available choices...' }}
      </div>
    }
    @if (error()) {
      <div class="panel stack" role="alert">
        <p class="error">{{ error() }}</p>
        <button hlmBtn variant="outline" class="secondary" (click)="load()">
          {{ fa() ? 'تلاش دوباره' : 'Retry' }}
        </button>
      </div>
    }
    @if (!loading() && !error()) {
      <section class="panel stack">
        @if (person(); as current) {
          <div>
            <h2>{{ fa() ? 'برنامه ذخیره‌شده' : 'Saved assignment' }}</h2>
            <p>
              {{ fa() ? 'شیفت' : 'Shift' }}:
              {{ current.shiftId ?? (fa() ? 'ثبت نشده' : 'Not set') }} ·
              {{ fa() ? 'ایستگاه' : 'Station' }}:
              {{ current.stationId ?? (fa() ? 'ثبت نشده' : 'Not set') }}
            </p>
          </div>
        }
        <div class="grid">
          <label
            >{{ fa() ? 'شیفت' : 'Shift'
            }}<select [value]="shiftId()" (change)="shiftId.set($any($event.target).value)">
              <option value="">{{ fa() ? 'انتخاب شیفت' : 'Select shift' }}</option>
              @for (item of shifts(); track item.id) {
                <option [value]="item.id">
                  {{ item.name }}
                  @if (item.detail) {
                    · {{ item.detail }}
                  }
                </option>
              }
            </select></label
          >
          <label
            >{{ fa() ? 'مسیر' : 'Route'
            }}<select
              [value]="directionId()"
              (change)="selectDirection(+$any($event.target).value)"
            >
              <option value="">{{ fa() ? 'انتخاب مسیر' : 'Select route' }}</option>
              @for (item of directions(); track item.id) {
                <option [value]="item.id">
                  {{ item.name }}
                  @if (item.detail) {
                    · {{ item.detail }}
                  }
                </option>
              }
            </select></label
          >
          <label
            >{{ fa() ? 'ایستگاه' : 'Station'
            }}<select [value]="stationId()" (change)="stationId.set($any($event.target).value)">
              <option value="">{{ fa() ? 'انتخاب ایستگاه' : 'Select station' }}</option>
              @for (item of stations(); track item.id) {
                <option [value]="item.id">
                  {{ item.name }}
                  @if (item.detail) {
                    · {{ item.detail }}
                  }
                </option>
              }
            </select></label
          >
        </div>
        @if (!shifts().length || !directions().length) {
          <p class="notice">
            {{
              fa()
                ? 'گزینه‌ای برای انتخاب دریافت نشد.'
                : 'The service returned no available choices.'
            }}
          </p>
        }
        @if (directionId() && !stations().length && !selectionError()) {
          <p class="notice">
            {{
              fa()
                ? 'برای این مسیر ایستگاهی برگردانده نشد.'
                : 'The service returned no stations for this route.'
            }}
          </p>
        }
        <p class="notice">
          {{
            fa()
              ? 'ثبت تغییر برنامه برای نقش مسافر در سرویس مجاز نیست. تغییرات انتخاب‌شده ذخیره نمی‌شوند؛ برای تغییر برنامه با مدیر شرکت تماس بگیرید.'
              : 'The backend does not authorize Passenger accounts to write assignments. Your selection will not be saved; contact your company administrator to change it.'
          }}
        </p>
        @if (selectionError()) {
          <div class="actions" role="alert">
            <p class="error">{{ selectionError() }}</p>
            <button
              hlmBtn
              variant="outline"
              class="secondary"
              (click)="selectDirection(+$any(directionId()))"
            >
              {{ fa() ? 'تلاش دوباره برای ایستگاه‌ها' : 'Retry station lookup' }}
            </button>
          </div>
        }
        <div class="actions">
          <button hlmBtn class="primary" disabled>
            {{ fa() ? 'تغییر برنامه غیرفعال است' : 'Assignment changes disabled' }}
          </button>
        </div>
      </section>
    }
  `,
  styleUrl: './passenger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerAssignmentPage {
  private readonly api = inject(PassengerApi)
  private readonly config = inject(PASSENGER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')
  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly selectionError = signal<string | null>(null)
  protected readonly person = signal<PassengerRecord | null>(null)
  protected readonly shifts = signal<Choice[]>([])
  protected readonly directions = signal<Choice[]>([])
  protected readonly stations = signal<Choice[]>([])
  protected readonly shiftId = signal('')
  protected readonly directionId = signal('')
  protected readonly stationId = signal('')

  constructor() {
    afterNextRender(() => void this.load())
  }

  protected async load(): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    try {
      const [person, shifts, directions] = await Promise.all([
        this.api.passenger(),
        this.api.shifts(),
        this.api.directions(),
      ])
      this.person.set(person)
      this.shifts.set(shifts)
      this.directions.set(directions)
      this.shiftId.set(person.shiftId ? String(person.shiftId) : '')
      this.directionId.set(person.directionId ? String(person.directionId) : '')
      this.stationId.set(person.stationId ? String(person.stationId) : '')
      if (person.directionId) this.stations.set(await this.api.stations(person.directionId))
    } catch {
      this.error.set(
        this.fa()
          ? 'بارگذاری برنامه یا گزینه‌ها ناموفق بود.'
          : 'Could not load your assignment or available choices.',
      )
    } finally {
      this.loading.set(false)
    }
  }

  protected async selectDirection(value: number): Promise<void> {
    this.directionId.set(value ? String(value) : '')
    this.stationId.set('')
    this.stations.set([])
    this.selectionError.set(null)
    if (!value) return
    try {
      this.stations.set(await this.api.stations(value))
    } catch {
      this.selectionError.set(
        this.fa() ? 'بارگذاری ایستگاه‌ها ناموفق بود.' : 'Could not load stations for this route.',
      )
    }
  }
}
