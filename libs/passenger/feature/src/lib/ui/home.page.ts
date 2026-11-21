import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  isDevMode,
  signal,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { NgIcon, provideIcons } from '@ng-icons/core'
import {
  lucideLifeBuoy,
  lucideMaximize2,
  lucideMenu,
  lucideMinimize2,
  lucidePhone,
  lucideRoute,
} from '@ng-icons/lucide'
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
import {
  activeTripView,
  driverInitials,
  hasTripImage,
  isFreshTripStreamLocation,
  passengerTrackingStatus,
} from './home-trip-state'

@Component({
  selector: 'lib-passenger-home-page',
  imports: [RouterLink, HlmButtonImports, NeshanMapComponent, NgIcon],
  providers: [
    provideIcons({
      lucideLifeBuoy,
      lucideMaximize2,
      lucideMenu,
      lucideMinimize2,
      lucidePhone,
      lucideRoute,
    }),
  ],
  host: { '(document:keydown.escape)': 'closeExpandedMap()' },
  template: `
    @if (activeTripView(trip(), loading(), error()); as currentTrip) {
      <main class="active-trip" [attr.dir]="fa() ? 'rtl' : 'ltr'">
        <section
          id="trip-map-view"
          class="trip-map"
          [class.is-expanded]="mapExpanded()"
          [attr.aria-label]="fa() ? 'نقشه سفر' : 'Trip map'"
        >
          <lib-neshan-map
            [apiKey]="neshanMapApiKey"
            [serviceApiKey]="neshanServiceApiKey"
            [fitContainer]="true"
            [points]="mapPoints()"
            [routeGeoJson]="trip()?.routeGeoJson ?? null"
            [liveLocation]="liveDriverLocation()"
            [followLive]="true"
            [language]="config.language()"
          />
          <nav class="trip-map-actions" [attr.aria-label]="fa() ? 'دسترسی سریع' : 'Quick actions'">
            <a
              class="map-action"
              routerLink="/passenger/assignment"
              [attr.aria-label]="fa() ? 'برنامه سفر' : 'Trip menu'"
              ><ng-icon name="lucideMenu" aria-hidden="true"
            /></a>
            <a
              class="map-action"
              routerLink="/passenger/support"
              [attr.aria-label]="fa() ? 'پشتیبانی' : 'Support'"
              ><ng-icon name="lucideLifeBuoy" aria-hidden="true"
            /></a>
          </nav>
          <div class="trip-live-chip" role="status">
            <span class="live-dot" [class.connected]="trackingStatus() === 'live'"></span>
            <span>{{
              trackingStatus() === 'live'
                ? fa()
                  ? 'موقعیت راننده به‌روز است'
                  : 'Driver location is live'
                : trackingStatus() === 'unavailable'
                  ? fa()
                    ? 'اتصال موقعیت برقرار نیست'
                    : 'Location connection unavailable'
                  : trackingStatus() === 'last-known'
                    ? fa()
                      ? 'آخرین موقعیت ثبت‌شده'
                      : 'Showing last known location'
                    : fa()
                      ? 'در انتظار به‌روزرسانی زنده'
                      : 'Waiting for a live update'
            }}</span>
          </div>
          <button
            class="map-expand"
            type="button"
            [attr.aria-expanded]="mapExpanded()"
            aria-controls="trip-map-view"
            (click)="toggleExpandedMap()"
          >
            <ng-icon
              [name]="mapExpanded() ? 'lucideMinimize2' : 'lucideMaximize2'"
              aria-hidden="true"
            />
            {{
              mapExpanded()
                ? fa()
                  ? 'بستن نقشه'
                  : 'Close map'
                : fa()
                  ? 'بزرگ‌کردن نقشه'
                  : 'Expand map'
            }}
          </button>
        </section>
        <section class="trip-details">
          <header class="trip-heading">
            <div>
              <p class="eyebrow">{{ fa() ? 'سفر در حال انجام' : 'TRIP IN PROGRESS' }}</p>
              <h1>{{ fa() ? 'سفر شما' : 'Your ride' }}</h1>
            </div>
            <div class="arrival-status">
              <span class="arrival-mark" aria-hidden="true">⌖</span>
              <span>
                <strong>{{
                  trackingStatus() === 'live'
                    ? fa()
                      ? 'مسیریابی زنده'
                      : 'Live tracking'
                    : fa()
                      ? 'وضعیت موقعیت'
                      : 'Location status'
                }}</strong>
                <small>{{
                  trackingStatus() === 'live'
                    ? fa()
                      ? 'موقعیت همگام‌سازی شد'
                      : 'Location synced'
                    : trackingStatus() === 'last-known'
                      ? fa()
                        ? 'موقعیت زنده در دسترس نیست'
                        : 'Live location unavailable'
                      : trackingStatus() === 'waiting'
                        ? fa()
                          ? 'در انتظار موقعیت راننده'
                          : 'Waiting for driver location'
                        : fa()
                          ? 'اتصال موقعیت برقرار نیست'
                          : 'Tracking connection unavailable'
                }}</small>
              </span>
            </div>
          </header>
          <section
            class="journey-focus"
            [attr.aria-label]="fa() ? 'ایستگاه بعدی و ایستگاه شما' : 'Next stop and your stop'"
          >
            <div class="journey-caption">
              <ng-icon name="lucideRoute" aria-hidden="true" />
              <span>{{ fa() ? 'مسیر سفر' : 'YOUR JOURNEY' }}</span>
            </div>
            <div class="journey-stops">
              <div class="journey-stop next-stop">
                <span class="stop-kicker">{{ fa() ? 'ایستگاه بعدی' : 'NEXT STOP' }}</span>
                <strong>{{
                  nextStopName() ||
                    (fa() ? 'اطلاعات ایستگاه در دسترس نیست' : 'Stop details unavailable')
                }}</strong>
              </div>
              <span class="journey-connector" aria-hidden="true"></span>
              <div class="journey-stop passenger-stop">
                <span class="stop-kicker">{{ fa() ? 'ایستگاه شما' : 'YOUR STOP' }}</span>
                <strong>{{ passengerStopName() || (fa() ? 'ثبت نشده' : 'Not specified') }}</strong>
              </div>
            </div>
          </section>
          <div class="trip-content">
            <article class="driver-card">
              <div class="driver-row">
                @if (hasTripImage(currentTrip.driverImage, driverImageFailed())) {
                  <img
                    class="driver-avatar"
                    [src]="currentTrip.driverImage"
                    [alt]="currentTrip.fullName"
                    (error)="driverImageFailed.set(true)"
                  />
                } @else {
                  <span class="driver-avatar driver-initials" aria-hidden="true">{{
                    driverInitials(currentTrip.fullName)
                  }}</span>
                }
                <div class="driver-identity">
                  <span class="eyebrow">{{ fa() ? 'راننده شما' : 'YOUR DRIVER' }}</span>
                  <h2>{{ currentTrip.fullName || (fa() ? 'راننده' : 'Driver') }}</h2>
                </div>
                @if (currentTrip.mobileNumber) {
                  <a
                    class="call-driver"
                    [href]="'tel:' + currentTrip.mobileNumber"
                    [attr.aria-label]="fa() ? 'تماس با راننده' : 'Call driver'"
                    ><ng-icon name="lucidePhone" aria-hidden="true" /><span>{{
                      fa() ? 'تماس' : 'Call'
                    }}</span></a
                  >
                }
              </div>
              <div class="vehicle-row">
                @if (hasTripImage(currentTrip.carImage, vehicleImageFailed())) {
                  <img
                    class="vehicle-thumb"
                    [src]="currentTrip.carImage"
                    [alt]="currentTrip.carTypeName || (fa() ? 'خودرو' : 'Vehicle')"
                    (error)="vehicleImageFailed.set(true)"
                  />
                } @else {
                  <span class="vehicle-thumb vehicle-fallback" aria-hidden="true">—</span>
                }
                <div class="vehicle-copy">
                  <strong>{{
                    currentTrip.carTypeName ||
                      (fa() ? 'نوع خودرو ثبت نشده' : 'Vehicle details unavailable')
                  }}</strong>
                  <span>{{ fa() ? 'خودروی سفر' : 'Assigned vehicle' }}</span>
                </div>
                <div class="plate-block">
                  <span>{{ fa() ? 'پلاک' : 'PLATE' }}</span>
                  <strong dir="ltr" class="whitespace-nowrap [unicode-bidi:isolate-override]">
                    {{ currentTrip.carPlate || '—' }}
                  </strong>
                </div>
              </div>
            </article>
            <section class="route-card" aria-labelledby="route-title">
              <div class="route-title-row">
                <h2 id="route-title">{{ fa() ? 'ایستگاه‌های مسیر' : 'Route progress' }}</h2>
                @if (currentTrip.stations.length) {
                  <span>{{ currentTrip.stations.length }} {{ fa() ? 'ایستگاه' : 'stops' }}</span>
                }
              </div>
              @if (currentTrip.stations.length) {
                <ol class="station-timeline">
                  @for (
                    station of currentTrip.stations;
                    track station.id;
                    let index = $index;
                    let last = $last
                  ) {
                    <li
                      class="station-item"
                      [class.is-next]="station.id === currentTrip.nextStationId"
                      [class.is-passenger]="station.id === currentTrip.passengerStationId"
                      [class.is-last]="last"
                    >
                      <span class="station-marker" aria-hidden="true">{{
                        station.id === currentTrip.nextStationId ? '→' : index + 1
                      }}</span>
                      <div class="station-info">
                        <strong>{{ station.name }}</strong>
                        @if (station.address) {
                          <span>{{ station.address }}</span>
                        }
                      </div>
                      <div class="station-tags">
                        @if (station.id === currentTrip.passengerStationId) {
                          <span class="station-tag passenger-tag">{{
                            fa() ? 'ایستگاه شما' : 'Your stop'
                          }}</span>
                        }
                        @if (station.id === currentTrip.nextStationId) {
                          <span class="station-tag next-tag">{{
                            fa() ? 'ایستگاه بعدی' : 'Next stop'
                          }}</span>
                        }
                      </div>
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
            </section>
          </div>
          <a class="support-link" routerLink="/passenger/support"
            >{{ fa() ? 'نیاز به کمک دارید؟ تماس با پشتیبانی' : 'Need help? Contact support' }} ↗</a
          >
        </section>
      </main>
    } @else {
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
                <span
                  >{{ fa() ? 'شیفت' : 'Shift' }}: {{ shiftName() || '#' + person.shiftId }}</span
                >
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
                [fitContainer]="true"
                [points]="mapPoints()"
                [routeGeoJson]="currentTrip.routeGeoJson"
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
                [fitContainer]="true"
                [points]="mapPoints()"
                [routeGeoJson]="selectedDirection()?.routeGeoJson ?? null"
                [language]="config.language()"
              />
              @if (selectedStations().length) {
                <ol class="station-timeline">
                  @for (
                    station of selectedStations();
                    track station.id;
                    let index = $index;
                    let last = $last
                  ) {
                    <li
                      class="station-item"
                      [class.is-passenger]="station.id === person.stationId"
                      [class.is-last]="last"
                    >
                      <span class="station-marker" aria-hidden="true">{{ index + 1 }}</span>
                      <div class="station-info">
                        <strong>{{ station.name }}</strong>
                        @if (station.address) {
                          <span>{{ station.address }}</span>
                        }
                      </div>
                      <div class="station-tags">
                        @if (station.id === person.stationId) {
                          <span class="station-tag passenger-tag">{{
                            fa() ? 'ایستگاه شما' : 'Your stop'
                          }}</span>
                        }
                      </div>
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
    }
  `,
  styles: [
    `
      :host {
        --trip-primary: var(--primary);
        --trip-surface: var(--card);
        --trip-line: var(--border);
      }
      .active-trip {
        width: calc(100% + 2rem);
        margin: -2rem -1rem 0;
      }
      .trip-map {
        position: relative;
        min-height: 22rem;
        height: clamp(20rem, 38dvh, 28rem);
        background: var(--muted);
      }
      .trip-map.is-expanded {
        position: fixed;
        inset: 0;
        z-index: 2000;
        width: 100vw;
        height: 100dvh;
        min-height: 100dvh;
        overflow: hidden;
        background: var(--background);
      }
      .trip-map lib-neshan-map {
        display: block;
        height: 100%;
      }
      .trip-map-actions {
        position: absolute;
        inset-block-start: 1rem;
        inset-inline: 1rem;
        z-index: 2;
        display: flex;
        justify-content: space-between;
        pointer-events: none;
      }
      .map-action {
        display: grid;
        width: 2.8rem;
        height: 2.8rem;
        place-items: center;
        border: 1px solid var(--trip-line);
        border-radius: 50%;
        background: var(--trip-surface);
        color: var(--foreground);
        text-decoration: none;
        font-size: 1.25rem;
        box-shadow: 0 4px 18px #0002;
        pointer-events: auto;
      }
      .map-action ng-icon,
      .map-expand ng-icon,
      .call-driver ng-icon {
        width: 1.15rem;
        height: 1.15rem;
      }
      .map-action:hover {
        background: var(--muted);
      }
      .trip-live-chip {
        position: absolute;
        inset-block-start: 4.5rem;
        inset-inline-start: 1rem;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        max-width: calc(100% - 2rem);
        white-space: normal;
        line-height: 1.35;
        padding: 0.6rem 0.8rem;
        border: 1px solid var(--trip-line);
        border-radius: 2rem;
        background: var(--trip-surface);
        color: var(--foreground);
        font-size: 0.78rem;
        box-shadow: 0 4px 18px #0002;
      }
      .live-dot {
        flex: 0 0 auto;
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background: var(--muted-foreground);
      }
      .live-dot.connected {
        background: var(--trip-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--trip-primary) 18%, transparent);
      }
      .map-expand {
        position: absolute;
        inset-block-end: 1rem;
        inset-inline-end: 1rem;
        z-index: 2;
        display: flex;
        gap: 0.45rem;
        align-items: center;
        padding: 0.6rem 0.85rem;
        border: 1px solid var(--trip-line);
        border-radius: 2rem;
        background: var(--trip-surface);
        color: var(--foreground);
        font: inherit;
        font-size: 0.8rem;
        box-shadow: 0 4px 18px #0002;
        cursor: pointer;
      }
      .map-expand:hover {
        background: var(--muted);
      }
      .trip-details {
        position: relative;
        z-index: 1;
        width: min(100% - 2rem, 62rem);
        margin: -1.25rem auto 0;
        padding: 1.35rem clamp(1rem, 4vw, 2rem) 1.5rem;
        border: 1px solid var(--trip-line);
        border-block-end: 0;
        border-radius: 1.35rem 1.35rem 0 0;
        background: var(--trip-surface);
      }
      .trip-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding-block-end: 1.1rem;
        border-block-end: 1px solid var(--trip-line);
      }
      .eyebrow {
        margin: 0 0 0.25rem;
        color: var(--muted-foreground);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.08em;
      }
      .trip-heading h1 {
        margin: 0;
        font-size: clamp(1.35rem, 3vw, 1.8rem);
        letter-spacing: -0.03em;
      }
      .arrival-status {
        display: flex;
        align-items: center;
        gap: 0.65rem;
      }
      .arrival-status strong,
      .arrival-status small {
        display: block;
      }
      .arrival-status strong {
        font-size: 0.85rem;
      }
      .arrival-status small {
        margin-block-start: 0.2rem;
        color: var(--muted-foreground);
        font-size: 0.72rem;
      }
      .arrival-mark {
        display: grid;
        width: 2.5rem;
        height: 2.5rem;
        place-items: center;
        border-radius: 0.8rem;
        background: color-mix(in srgb, var(--trip-primary) 12%, var(--trip-surface));
        color: var(--trip-primary);
        font-size: 1.3rem;
      }
      .trip-content {
        display: grid;
        grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
        gap: 1.1rem;
        padding-block-start: 1rem;
      }
      .driver-card,
      .route-card {
        min-width: 0;
        padding: 1rem;
      }
      .driver-card {
        border-inline-start: 3px solid var(--trip-primary);
        border-radius: 0.35rem 0.9rem 0.9rem 0.35rem;
        background: color-mix(in srgb, var(--trip-primary) 5%, var(--trip-surface));
      }
      .route-card {
        border-block-start: 1px solid var(--trip-line);
      }
      .driver-row {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        min-width: 0;
      }
      .driver-avatar {
        flex: 0 0 auto;
        width: 3.25rem;
        height: 3.25rem;
        border-radius: 50%;
        object-fit: cover;
        background: var(--muted);
      }
      .driver-initials {
        display: grid;
        place-items: center;
        color: var(--primary-foreground);
        background: var(--trip-primary);
        font-weight: 700;
      }
      .driver-identity {
        min-width: 0;
        flex: 1;
      }
      .driver-identity h2 {
        overflow: hidden;
        margin: 0;
        text-overflow: ellipsis;
        font-size: 1rem;
      }
      .call-driver {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.55rem 0.7rem;
        border: 1px solid var(--trip-line);
        border-radius: 0.65rem;
        color: var(--foreground);
        text-decoration: none;
        font-size: 0.78rem;
      }
      .vehicle-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
        margin-block-start: 1rem;
        padding-block-start: 0.9rem;
        border-block-start: 1px solid var(--trip-line);
      }
      .vehicle-thumb {
        flex: 0 0 auto;
        width: 3.4rem;
        height: 2.75rem;
        border-radius: 0.55rem;
        object-fit: cover;
        background: var(--muted);
      }
      .vehicle-fallback {
        display: grid;
        place-items: center;
        font-size: 1.3rem;
      }
      .vehicle-copy {
        min-width: 0;
        flex: 1;
      }
      .vehicle-copy strong,
      .vehicle-copy span,
      .plate-block span,
      .plate-block strong {
        display: block;
      }
      .vehicle-copy strong {
        overflow: hidden;
        text-overflow: ellipsis;
        overflow-wrap: anywhere;
        font-size: 0.85rem;
      }
      .vehicle-copy span,
      .plate-block span {
        margin-block-start: 0.2rem;
        color: var(--muted-foreground);
        font-size: 0.68rem;
      }
      .plate-block {
        text-align: end;
      }
      .plate-block strong {
        padding: 0.35rem 0.5rem;
        border: 1px dashed var(--trip-line);
        border-radius: 0.4rem;
        font-size: 0.78rem;
        overflow-wrap: anywhere;
      }
      .route-title-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5rem;
      }
      .route-title-row h2 {
        margin: 0;
        font-size: 0.95rem;
      }
      .route-title-row > span {
        color: var(--muted-foreground);
        font-size: 0.72rem;
      }
      .station-timeline {
        margin: 1rem 0 0;
        padding: 0;
        list-style: none;
      }
      .stack > .panel > lib-neshan-map {
        display: block;
        height: clamp(20rem, 38dvh, 28rem);
        overflow: hidden;
        border-radius: 0.9rem;
      }
      .station-item {
        position: relative;
        display: grid;
        grid-template-columns: 1.65rem minmax(0, 1fr) auto;
        align-items: start;
        gap: 0.65rem;
        min-height: 3.4rem;
      }
      .station-item:not(.is-last)::before {
        position: absolute;
        inset-block-start: 1.55rem;
        inset-inline-start: 0.77rem;
        width: 1px;
        height: calc(100% - 0.35rem);
        background: var(--trip-line);
        content: '';
      }
      .station-marker {
        position: relative;
        z-index: 1;
        display: grid;
        width: 1.6rem;
        height: 1.6rem;
        place-items: center;
        border: 1px solid var(--trip-line);
        border-radius: 50%;
        background: var(--trip-surface);
        color: var(--muted-foreground);
        font-size: 0.67rem;
      }
      .is-next .station-marker,
      .is-passenger .station-marker {
        border-color: var(--trip-primary);
        background: var(--trip-primary);
        color: var(--primary-foreground);
      }
      .station-info strong,
      .station-info span {
        display: block;
      }
      .station-info strong {
        padding-block-start: 0.1rem;
        font-size: 0.8rem;
      }
      .station-info span {
        margin-block-start: 0.2rem;
        color: var(--muted-foreground);
        font-size: 0.7rem;
      }
      .station-tags {
        display: flex;
        flex-wrap: wrap;
        justify-content: end;
        gap: 0.25rem;
      }
      .station-tag {
        padding: 0.25rem 0.4rem;
        border-radius: 0.3rem;
        font-size: 0.62rem;
        white-space: nowrap;
      }
      .passenger-tag {
        background: color-mix(in srgb, var(--trip-primary) 12%, var(--trip-surface));
        color: var(--trip-primary);
      }
      .next-tag {
        background: var(--muted);
        color: var(--foreground);
      }
      .support-link {
        display: inline-flex;
        gap: 0.4rem;
        align-items: center;
        margin-block-start: 1rem;
        color: var(--muted-foreground);
        font-size: 0.78rem;
        text-decoration: none;
      }
      .support-link:hover {
        color: var(--foreground);
      }
      .journey-focus {
        margin-block-start: 1rem;
        padding: 1rem 1.15rem;
        border-inline-start: 3px solid var(--trip-primary);
        background: color-mix(in srgb, var(--trip-primary) 7%, var(--trip-surface));
      }
      .journey-caption {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        color: var(--muted-foreground);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.06em;
      }
      .journey-caption ng-icon {
        width: 1rem;
        height: 1rem;
        color: var(--trip-primary);
      }
      .journey-stops {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 3rem minmax(0, 1fr);
        align-items: center;
        gap: 0.75rem;
        margin-block-start: 0.6rem;
      }
      .journey-stop {
        min-width: 0;
      }
      .stop-kicker {
        display: block;
        margin-block-end: 0.2rem;
        color: var(--muted-foreground);
        font-size: 0.65rem;
      }
      .journey-stop strong {
        display: block;
        overflow-wrap: anywhere;
        font-size: clamp(0.95rem, 2vw, 1.2rem);
        line-height: 1.35;
      }
      .next-stop strong {
        color: var(--trip-primary);
      }
      .journey-connector {
        height: 1px;
        background: var(--trip-primary);
        opacity: 0.55;
      }
      @media (max-width: 700px) {
        .stack > .panel > lib-neshan-map {
          height: clamp(20rem, 32dvh, 22rem);
        }
        .active-trip {
          width: calc(100% + 2rem);
          margin: -1rem -1rem 0;
        }
        .trip-map {
          height: clamp(20rem, 32dvh, 22rem);
        }
        .trip-details {
          width: calc(100% - 1rem);
          padding: 1.15rem 0.85rem 1.25rem;
        }
        .trip-content {
          grid-template-columns: minmax(0, 1fr);
          gap: 0.75rem;
        }
        .journey-stops {
          grid-template-columns: minmax(0, 1fr) 1.5rem minmax(0, 1fr);
          gap: 0.45rem;
        }
        .trip-heading {
          align-items: flex-start;
        }
        .arrival-mark {
          width: 2.1rem;
          height: 2.1rem;
        }
        .arrival-status {
          gap: 0.45rem;
        }
      }
      @media (max-width: 380px) {
        .trip-heading {
          flex-direction: column;
        }
        .station-item {
          grid-template-columns: 1.65rem minmax(0, 1fr);
        }
        .station-tags {
          grid-column: 2;
          justify-content: start;
          padding-block-end: 0.5rem;
        }
        .vehicle-row {
          display: grid;
          grid-template-columns: 3.4rem minmax(0, 1fr);
        }
        .plate-block {
          grid-column: 2;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.45rem;
          text-align: start;
        }
        .plate-block span {
          margin: 0;
        }
        .journey-stops {
          grid-template-columns: minmax(0, 1fr);
          gap: 0.65rem;
        }
        .journey-connector {
          width: 1px;
          height: 0.8rem;
          margin-inline-start: 0.25rem;
        }
      }
      @media (max-height: 650px) and (max-width: 700px) {
        .trip-map:not(.is-expanded) {
          height: 20rem;
        }
        .trip-heading {
          padding-block-end: 0.75rem;
        }
        .trip-content {
          padding-block-start: 0.75rem;
        }
      }
      @media (prefers-reduced-motion: no-preference) {
        .trip-details {
          animation: trip-arrive 0.35s ease-out both;
        }
        @keyframes trip-arrive {
          from {
            opacity: 0.7;
            transform: translateY(0.5rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      }
    `,
  ],
  styleUrl: './passenger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerHomePage {
  private readonly api = inject(PassengerApi)
  protected readonly config = inject(PASSENGER_FEATURE_CONFIG)
  protected readonly activeTripView = activeTripView
  protected readonly hasTripImage = hasTripImage
  protected readonly driverInitials = driverInitials
  protected readonly tracking = inject(TrackingConnectionService)
  private readonly destroyRef = inject(DestroyRef)
  private lastHandledPassengerNotification = this.tracking.lastPassengerNotification()

  protected readonly fa = computed(() => this.config.language() === 'fa')
  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly passenger = signal<PassengerRecord | null>(null)
  protected readonly shifts = signal<Choice[]>([])
  protected readonly directions = signal<Choice[]>([])
  protected readonly selectedDirection = computed(
    () => this.directions().find(item => String(item.id) === this.selectedDirectionId()) ?? null,
  )
  protected readonly assignedStations = signal<Choice[]>([])
  protected readonly trip = signal<ActiveTrip | null>(null)
  protected readonly tripLoaded = signal(false)
  protected readonly driverLocation = signal<PassengerDriverLocation | null>(null)
  protected readonly selectedDirectionId = signal('')
  protected readonly selectedStations = signal<Choice[]>([])
  protected readonly directionLoading = signal(false)
  private readonly locationClock = signal(Date.now())
  protected readonly driverImageFailed = signal(false)
  protected readonly vehicleImageFailed = signal(false)
  protected readonly mapExpanded = signal(false)

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
  protected readonly nextStopName = computed(() => {
    const trip = this.trip()
    return trip?.stations.find(station => station.id === trip.nextStationId)?.name ?? null
  })
  protected readonly passengerStopName = computed(() => {
    const trip = this.trip()
    return trip?.stations.find(station => station.id === trip.passengerStationId)?.name ?? null
  })

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

  private readonly matchingStreamLocation = computed(() => {
    const trip = this.trip()
    const streamed = this.tracking.lastLocation()
    return trip && streamed?.tripId === trip.id && streamed.driverId === trip.driverId
      ? streamed
      : null
  })

  protected readonly trackingStatus = computed(() =>
    passengerTrackingStatus(
      this.tracking.connected(),
      isFreshTripStreamLocation(
        this.matchingStreamLocation(),
        this.trip()?.id ?? null,
        this.trip()?.driverId ?? null,
        this.locationClock(),
      ),
      this.driverMapLocation() !== null,
    ),
  )

  protected readonly driverMapLocation = computed<NeshanLiveLocation | null>(() => {
    const trip = this.trip()
    const notification = this.tracking.lastPassengerNotification()
    if (notification?.tripId === trip?.id && notification?.isTripActive === false) return null
    const loc = this.matchingStreamLocation() ?? this.driverLocation()
    if (!trip || !loc) return null
    if (loc.tripId !== trip.id || loc.driverId !== trip.driverId) return null
    if (isDevMode())
      console.info('[PassengerMap] Driver coordinates received', {
        tripId: loc.tripId,
        driverId: loc.driverId,
        lat: loc.lat,
        lng: loc.lng,
      })
    return {
      id: loc.driverId,
      lat: loc.lat,
      lng: loc.lng,
      heading: loc.heading,
      label: this.fa() ? 'راننده' : 'Driver',
      receivedAt: loc.receivedAt,
    }
  })

  protected readonly liveDriverLocation = this.driverMapLocation

  private bodyOverflowBeforeMap: string | null = null

  protected toggleExpandedMap(): void {
    if (this.mapExpanded()) {
      this.closeExpandedMap()
      return
    }
    this.bodyOverflowBeforeMap = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    this.mapExpanded.set(true)
  }

  protected closeExpandedMap(): void {
    if (!this.mapExpanded()) return
    this.mapExpanded.set(false)
    if (this.bodyOverflowBeforeMap !== null) {
      document.body.style.overflow = this.bodyOverflowBeforeMap
      this.bodyOverflowBeforeMap = null
    }
  }

  constructor() {
    afterNextRender(() => {
      void this.tracking.connectCookieStream()
      void this.load()
      const clock = window.setInterval(() => this.locationClock.set(Date.now()), 15_000)
      this.destroyRef.onDestroy(() => window.clearInterval(clock))
    })
    effect(() => {
      const notification = this.tracking.lastPassengerNotification()
      if (!notification || notification === this.lastHandledPassengerNotification) return
      this.lastHandledPassengerNotification = notification
      if (notification.isTripActive === false && this.trip()?.id === notification.tripId) {
        this.closeExpandedMap()
        this.trip.set(null)
        this.driverLocation.set(null)
        this.driverImageFailed.set(false)
        this.vehicleImageFailed.set(false)
        this.tripLoaded.set(true)
      } else if (notification.isTripActive === true && this.trip()?.id !== notification.tripId) {
        void this.load()
      }
    })
    this.destroyRef.onDestroy(() => {
      this.closeExpandedMap()
      void this.tracking.disconnect()
    })
  }

  protected async load(): Promise<void> {
    this.closeExpandedMap()
    this.loading.set(true)
    this.error.set(null)
    this.tripLoaded.set(false)
    try {
      const person = await this.api.passenger()
      const [loadedTrip, choices, stations] = await Promise.all([
        this.api.activeTrip(),
        Promise.all([this.api.shifts(), this.api.directions()]).catch(
          () => [[], []] as [Choice[], Choice[]],
        ),
        person.directionId
          ? this.api.stations(person.directionId).catch(() => [])
          : Promise.resolve([]),
      ])
      let trip = loadedTrip
      if (trip?.directionId) {
        try {
          const direction = await this.api.direction(trip.directionId)
          trip = { ...trip, routeGeoJson: direction.routeGeoJson ?? trip.routeGeoJson }
        } catch {
          // Keep the active trip visible if route detail is temporarily unavailable.
        }
      }
      this.passenger.set(person)
      this.trip.set(trip)
      this.driverImageFailed.set(false)
      this.vehicleImageFailed.set(false)
      this.mapExpanded.set(false)
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
