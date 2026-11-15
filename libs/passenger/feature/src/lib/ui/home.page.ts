import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import { ActiveTrip, Choice, PassengerApi, PassengerRecord } from '../passenger.api'
import { PASSENGER_FEATURE_CONFIG } from '../passenger.routes'

@Component({
  selector: 'lib-passenger-home-page',
  imports: [RouterLink, HlmButtonImports],
  template: `
    <div class="page-head">
      <h1>{{ fa() ? 'سفر شما' : 'Your commute' }}</h1>
      <p>
        {{
          fa()
            ? 'برنامه و وضعیت سفر ثبت‌شده برای حساب شما'
            : 'Your saved transport assignment and trip status'
        }}
      </p>
    </div>
    @if (loading()) {
      <div class="panel" role="status">
        {{ fa() ? 'در حال دریافت اطلاعات...' : 'Loading your transport details...' }}
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
    @if (!loading() && passenger(); as person) {
      <div class="stack">
        @if (!person.shiftId || !person.stationId) {
          <section class="panel stack">
            <h2>{{ fa() ? 'برنامه رفت‌وآمدی ثبت نشده است' : 'No transport assignment yet' }}</h2>
            <p>
              {{
                fa()
                  ? 'برای انتخاب شیفت و ایستگاه، اطلاعات مسیر خود را تنظیم کنید.'
                  : 'Choose your shift, route, and pickup station to set up your commute.'
              }}
            </p>
            <a class="primary" routerLink="/passenger/assignment">{{
              fa() ? 'تنظیم برنامه' : 'Set assignment'
            }}</a>
          </section>
        } @else {
          <section class="panel stack">
            <h2>{{ fa() ? 'برنامه فعلی' : 'Current assignment' }}</h2>
            <div class="assignment-current">
              <span>{{ fa() ? 'شیفت' : 'Shift' }}: {{ shiftName() || '#' + person.shiftId }}</span
              ><span
                >{{ fa() ? 'ایستگاه' : 'Station' }}:
                {{ assignedStationName() || '#' + person.stationId }}</span
              >
              @if (person.directionId) {
                <span
                  >{{ fa() ? 'مسیر' : 'Route' }}:
                  {{ directionName() || '#' + person.directionId }}</span
                >
              }
            </div>
            @if (!trip() && assignedStations().length) {
              <ol>
                @for (station of assignedStations(); track station.id) {
                  <li>
                    {{ station.name }}
                    @if (station.address) {
                      <span> · {{ station.address }}</span>
                    }
                  </li>
                }
              </ol>
            } @else if (!trip()) {
              <p class="notice">
                {{
                  fa()
                    ? 'جزئیات ایستگاه فعلی از سرویس مسیر دریافت نشد.'
                    : 'Station details were not returned by the route service.'
                }}
              </p>
            }
            <a routerLink="/passenger/assignment">{{
              fa() ? 'مشاهده برنامه' : 'View assignment options'
            }}</a>
          </section>
        }
        @if (trip(); as currentTrip) {
          <section class="panel stack">
            <h2>{{ fa() ? 'سفر فعال' : 'Active trip' }}</h2>
            <div class="person">
              @if (currentTrip.driverImage) {
                <img [src]="currentTrip.driverImage" alt="" />
              }
              <div>
                <strong>{{ currentTrip.fullName }}</strong>
                <div>{{ fa() ? 'راننده' : 'Driver' }}</div>
              </div>
              @if (currentTrip.mobileNumber) {
                <a class="secondary" [href]="'tel:' + currentTrip.mobileNumber">{{
                  fa() ? 'تماس با راننده' : 'Call driver'
                }}</a>
              }
            </div>
            @if (currentTrip.carImage) {
              <img class="vehicle-image" [src]="currentTrip.carImage" alt="" />
            }
            <p>
              {{
                currentTrip.carTypeName ||
                  (fa() ? 'نوع خودرو ثبت نشده' : 'Vehicle type unavailable')
              }}
              @if (currentTrip.carPlate) {
                · {{ currentTrip.carPlate }}
              }
            </p>
            @if (currentTrip.stations.length) {
              <ol>
                @for (station of currentTrip.stations; track station.id) {
                  <li>
                    {{ station.name }}
                    @if (station.address) {
                      <span> · {{ station.address }}</span>
                    }
                    @if (station.id === currentTrip.nextStationId) {
                      <strong> · {{ fa() ? 'ایستگاه بعدی' : 'Next station' }}</strong>
                    }
                  </li>
                }
              </ol>
            } @else {
              <p class="notice">
                {{
                  fa()
                    ? 'جزئیات ایستگاه‌های سفر در دسترس نیست.'
                    : 'Trip station details are unavailable.'
                }}
              </p>
            }
            <p class="notice">
              {{
                fa()
                  ? 'موقعیت زنده راننده در این نسخه در دسترس نیست.'
                  : 'Live driver location is unavailable in this version.'
              }}
            </p>
          </section>
        } @else if (tripLoaded()) {
          <section class="panel">
            <h2>{{ fa() ? 'سفر فعالی وجود ندارد' : 'No active trip' }}</h2>
            <p>
              {{
                fa()
                  ? 'در حال حاضر سفری برای شما ثبت نشده است.'
                  : 'There is no active trip for your account right now.'
              }}
            </p>
          </section>
        }
        <div class="actions">
          <a class="secondary" routerLink="/passenger/support">{{
            fa() ? 'پشتیبانی' : 'Get support'
          }}</a
          ><a class="secondary" routerLink="/passenger/profile">{{
            fa() ? 'حساب کاربری' : 'Profile'
          }}</a>
        </div>
      </div>
    }
  `,
  styleUrl: './passenger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerHomePage {
  private readonly api = inject(PassengerApi)
  private readonly config = inject(PASSENGER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')
  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly passenger = signal<PassengerRecord | null>(null)
  protected readonly shifts = signal<Choice[]>([])
  protected readonly directions = signal<Choice[]>([])
  protected readonly assignedStations = signal<Choice[]>([])
  protected readonly trip = signal<ActiveTrip | null>(null)
  protected readonly tripLoaded = signal(false)
  protected readonly shiftName = computed(
    () => this.shifts().find(item => item.id === this.passenger()?.shiftId)?.name ?? null,
  )
  protected readonly directionName = computed(
    () => this.directions().find(item => item.id === this.passenger()?.directionId)?.name ?? null,
  )
  protected readonly assignedStationName = computed(
    () =>
      this.assignedStations().find(item => item.id === this.passenger()?.stationId)?.name ?? null,
  )

  constructor() {
    afterNextRender(() => void this.load())
  }

  protected async load(): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    this.tripLoaded.set(false)
    try {
      const person = await this.api.passenger()
      const [trip, choices, stations] = await Promise.all([
        this.api.activeTrip(),
        Promise.all([this.api.shifts(), this.api.directions()]).catch(
          () => [[], []] as [Choice[], Choice[]],
        ),
        person.directionId
          ? this.api.stations(person.directionId).catch(() => [])
          : Promise.resolve([]),
      ])
      this.passenger.set(person)
      this.trip.set(trip)
      this.shifts.set(choices[0])
      this.directions.set(choices[1])
      this.assignedStations.set(stations)
      this.tripLoaded.set(true)
    } catch {
      this.error.set(
        this.fa()
          ? 'دریافت اطلاعات سفر ناموفق بود. اتصال یا دسترسی حساب را بررسی کنید.'
          : 'Could not load transport details. Check your connection or account access.',
      )
    } finally {
      this.loading.set(false)
    }
  }
}
