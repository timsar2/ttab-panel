import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import { NeshanLiveLocation, NeshanMapComponent, NeshanMapPoint } from '@org/shared-maps'
import { TrackingConnectionService } from '@org/shared-tracking'
import { environment } from '@org/platform/config'
import { ActiveTrip, Choice, PassengerApi, PassengerRecord } from '../passenger.api'
import { PASSENGER_FEATURE_CONFIG } from '../passenger.routes'

@Component({
  selector: 'lib-passenger-home-page',
  imports: [RouterLink, HlmButtonImports, NeshanMapComponent],
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
              <span>{{ fa() ? 'شیفت' : 'Shift' }}: {{ shiftName() || '#' + person.shiftId }}</span>
              <span
                >{{ fa() ? 'ایستگاه' : 'Station' }}:
                {{ assignedStationName() || '#' + person.stationId }}</span
              >
              @if (person.directionId) {
                <span
                  >{{ fa() ? 'مسیر/جهت' : 'Direction' }}:
                  {{ directionName() || '#' + person.directionId }}</span
                >
              }
            </div>
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

            <div class="tracking-status">
              <span [class.ok]="tracking.connected()">{{
                tracking.connected()
                  ? fa()
                    ? 'اتصال زنده فعال'
                    : 'Live connection active'
                  : fa()
                    ? 'در انتظار اتصال زنده...'
                    : 'Waiting for live connection...'
              }}</span>
              @if (liveDriverLocation()) {
                <span>{{ fa() ? 'موقعیت راننده دریافت شد' : 'Driver location received' }}</span>
              }
            </div>

            @if (mapPoints().length || liveDriverLocation()) {
              <lib-neshan-map
                [apiKey]="neshanMapApiKey"
                [serviceApiKey]="neshanServiceApiKey"
                [points]="mapPoints()"
                [liveLocation]="liveDriverLocation()"
                [followLive]="true"
                [language]="config.language()"
              />
            }

            @if (currentTrip.stations.length) {
              <div>
                <h3>{{ fa() ? 'ایستگاه‌های مسیر/جهت' : 'Direction stations' }}</h3>
                <ol>
                  @for (station of currentTrip.stations; track station.id) {
                    <li
                      [class.next-station]="station.id === currentTrip.nextStationId"
                      [class.my-station]="station.id === currentTrip.passengerStationId"
                    >
                      {{ station.name }}
                      @if (station.address) {
                        <span> · {{ station.address }}</span>
                      }
                      @if (station.id === currentTrip.passengerStationId) {
                        <strong> · {{ fa() ? 'ایستگاه شما' : 'Your station' }}</strong>
                      }
                      @if (station.id === currentTrip.nextStationId) {
                        <strong> · {{ fa() ? 'ایستگاه بعدی' : 'Next station' }}</strong>
                      }
                    </li>
                  }
                </ol>
              </div>
            } @else {
              <p class="notice">
                {{
                  fa()
                    ? 'جزئیات ایستگاه‌های سفر در دسترس نیست.'
                    : 'Trip station details are unavailable.'
                }}
              </p>
            }
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
          }}</a>
          <a class="secondary" routerLink="/passenger/profile">{{
            fa() ? 'حساب کاربری' : 'Profile'
          }}</a>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .tracking-status {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        font-size: 0.85rem;
        color: var(--muted-foreground);
      }
      .tracking-status .ok {
        color: var(--primary);
        font-weight: 500;
      }
      .next-station {
        font-weight: 600;
      }
      .my-station {
        text-decoration: underline;
        text-decoration-color: var(--primary);
      }
    `,
  ],
  styleUrl: './passenger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerHomePage {
  private readonly api = inject(PassengerApi)
  protected readonly config = inject(PASSENGER_FEATURE_CONFIG)
  protected readonly tracking = inject(TrackingConnectionService)
  private readonly destroyRef = inject(DestroyRef)

  protected readonly fa = computed(() => this.config.language() === 'fa')
  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly passenger = signal<PassengerRecord | null>(null)
  protected readonly shifts = signal<Choice[]>([])
  protected readonly directions = signal<Choice[]>([])
  protected readonly assignedStations = signal<Choice[]>([])
  protected readonly trip = signal<ActiveTrip | null>(null)
  protected readonly tripLoaded = signal(false)

  protected readonly neshanMapApiKey = environment.neshanMapApiKey ?? null
  protected readonly neshanServiceApiKey = environment.neshanServiceApiKey ?? null

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

  protected readonly mapPoints = computed<NeshanMapPoint[]>(() =>
    (this.trip()?.stations ?? [])
      .filter(s => typeof s.lat === 'number' && typeof s.lng === 'number')
      .map((s, i) => ({
        id: s.id,
        order: i + 1,
        name: s.name,
        lat: s.lat ?? null,
        lng: s.lng ?? null,
      })),
  )

  protected readonly liveDriverLocation = computed<NeshanLiveLocation | null>(() => {
    const trip = this.trip()
    const loc = this.tracking.lastLocation()
    if (!trip || !loc) return null
    if (loc.tripId != null && loc.tripId !== trip.id) return null
    if (loc.driverId != null && loc.driverId !== trip.driverId) return null
    return { lat: loc.lat, lng: loc.lng, label: this.fa() ? 'راننده' : 'Driver' }
  })

  constructor() {
    afterNextRender(() => void this.load())
    effect(() => {
      const trip = this.trip()
      if (trip) void this.ensureTrackingConnected()
    })
    this.destroyRef.onDestroy(() => {
      void this.tracking.disconnect()
    })
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

  private async ensureTrackingConnected(): Promise<void> {
    try {
      const hubUrl = `${environment.baseUrl.replace(/\/$/, '')}/notifications`
      await this.tracking.configure({ hubUrl, withCredentials: false })
      await this.tracking.connect()
    } catch {
      /* live updates are best-effort */
    }
  }
}
