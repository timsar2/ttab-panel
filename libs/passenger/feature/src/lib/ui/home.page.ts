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
import {
  ActiveTrip,
  Choice,
  PassengerApi,
  PassengerDriverLocation,
  PassengerRecord,
} from '../passenger.api'
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
              <span [class.ok]="liveDriverLocation()">{{
                liveDriverLocation()
                  ? fa()
                    ? 'موقعیت زنده دریافت شد'
                    : 'Live driver location received'
                  : fa()
                    ? 'در انتظار موقعیت راننده...'
                    : "Waiting for the driver's first location..."
              }}</span>
              @if (liveDriverLocation()) {
                <span>
                  {{ fa() ? 'آخرین همگام‌سازی' : 'Last synced' }}:
                  {{ liveDriverLocation()!.receivedAt || (fa() ? 'اکنون' : 'just now') }}
                </span>
              }
              @if (tracking.error(); as streamError) {
                <span role="status">{{ streamError }}</span>
              }
            </div>

            <lib-neshan-map
              [apiKey]="neshanMapApiKey"
              [serviceApiKey]="neshanServiceApiKey"
              [points]="mapPoints()"
              [liveLocation]="liveDriverLocation()"
              [followLive]="true"
              [language]="config.language()"
            />

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

        @if (!trip()) {
          <section class="panel stack">
            <h2>{{ fa() ? 'مسیر رفت‌وآمد' : 'Commute route' }}</h2>
            <label for="passenger-direction">
              {{ fa() ? 'جهت مسیر' : 'Route direction' }}
            </label>
            <select
              id="passenger-direction"
              [value]="selectedDirectionId()"
              [disabled]="!directions().length || directionLoading()"
              (change)="selectDirection($event)"
            >
              <option value="">{{ fa() ? 'انتخاب جهت' : 'Select a direction' }}</option>
              @for (direction of directions(); track direction.id) {
                <option [value]="direction.id">{{ direction.name }}</option>
              }
            </select>
            @if (directionLoading()) {
              <p role="status">
                {{ fa() ? 'در حال دریافت ایستگاه‌ها...' : 'Loading stations...' }}
              </p>
            }
            <lib-neshan-map
              [apiKey]="neshanMapApiKey"
              [serviceApiKey]="neshanServiceApiKey"
              [points]="mapPoints()"
              [language]="config.language()"
            />
            @if (selectedStations().length) {
              <ol>
                @for (station of selectedStations(); track station.id; let index = $index) {
                  <li>
                    {{ index + 1 }}. {{ station.name }}
                    @if (station.address) {
                      · {{ station.address }}
                    }
                  </li>
                }
              </ol>
            } @else if (selectedDirectionId() && !directionLoading()) {
              <p class="notice">
                {{
                  fa()
                    ? 'موقعیت ایستگاه‌های این جهت در دسترس نیست.'
                    : 'No mapped stations are available for this direction.'
                }}
              </p>
            }
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
  private lastHandledPassengerNotification = this.tracking.lastPassengerNotification()

  protected readonly fa = computed(() => this.config.language() === 'fa')
  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly passenger = signal<PassengerRecord | null>(null)
  protected readonly shifts = signal<Choice[]>([])
  protected readonly directions = signal<Choice[]>([])
  protected readonly assignedStations = signal<Choice[]>([])
  protected readonly trip = signal<ActiveTrip | null>(null)
  protected readonly tripLoaded = signal(false)
  protected readonly driverLocation = signal<PassengerDriverLocation | null>(null)
  protected readonly selectedDirectionId = signal('')
  protected readonly selectedStations = signal<Choice[]>([])
  protected readonly directionLoading = signal(false)

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
    (this.trip()?.stations ?? this.selectedStations())
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
    const notification = this.tracking.lastPassengerNotification()
    if (notification?.tripId === trip?.id && notification?.isTripActive === false) return null
    const streamed = this.tracking.lastLocation()
    const loc =
      trip && streamed?.tripId === trip.id && streamed.driverId === trip.driverId
        ? streamed
        : this.driverLocation()
    if (!trip || !loc) return null
    if (loc.tripId !== trip.id || loc.driverId !== trip.driverId) return null
    return {
      id: loc.driverId,
      lat: loc.lat,
      lng: loc.lng,
      heading: loc.heading,
      label: this.fa() ? 'راننده' : 'Driver',
      receivedAt: loc.receivedAt,
    }
  })

  constructor() {
    afterNextRender(() => {
      void this.tracking.connectCookieStream()
      void this.load()
    })
    effect(() => {
      const notification = this.tracking.lastPassengerNotification()
      if (!notification || notification === this.lastHandledPassengerNotification) return
      this.lastHandledPassengerNotification = notification
      if (notification.isTripActive === false && this.trip()?.id === notification.tripId) {
        this.trip.set(null)
        this.driverLocation.set(null)
        this.tripLoaded.set(true)
      } else if (notification.isTripActive === true && this.trip()?.id !== notification.tripId) {
        void this.load()
      }
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
      this.selectedDirectionId.set(person.directionId ? String(person.directionId) : '')
      this.selectedStations.set(
        trip
          ? []
          : stations.map(station => ({
              ...station,
              lat: station.lat,
              lng: station.lng,
            })),
      )
      this.driverLocation.set(null)
      if (trip) {
        void this.api.driverLocation(trip.driverId).then(
          location => {
            if (this.trip()?.id === trip.id) this.driverLocation.set(location)
          },
          () => undefined,
        )
      }
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

  protected async selectDirection(event: Event): Promise<void> {
    const target = event.target
    if (!(target instanceof HTMLSelectElement)) return
    this.selectedDirectionId.set(target.value)
    this.selectedStations.set([])
    const directionId = Number(target.value)
    if (!Number.isSafeInteger(directionId) || directionId <= 0) return
    this.directionLoading.set(true)
    try {
      this.selectedStations.set(await this.api.stations(directionId))
    } catch {
      this.selectedStations.set([])
    } finally {
      this.directionLoading.set(false)
    }
  }
}
