import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
} from '@angular/core'
import { NeshanLiveLocation, NeshanMapComponent } from '@org/shared-maps'
import { TrackingConnectionService } from '@org/shared-tracking'
import { environment } from '@org/platform'
import { PreferencesStore } from '@org/platform'

@Component({
  selector: 'app-live-tracking-page',
  imports: [NeshanMapComponent],
  template: `
    <section class="page">
      <header class="head">
        <h1>{{ fa() ? 'ردیابی زنده رانندگان' : 'Live driver tracking' }}</h1>
        <p class="status" [class.ok]="tracking.connected()">
          {{
            tracking.connected()
              ? fa()
                ? 'اتصال زنده برقرار است'
                : 'Live tracking connected'
              : fa()
                ? 'در حال اتصال به جریان زنده...'
                : 'Connecting to live tracking...'
          }}
        </p>
      </header>

      @if (tracking.error(); as message) {
        <p class="err" role="status">{{ message }}</p>
      }
      @if (!locations().length) {
        <div class="empty">
          <p>
            {{
              fa()
                ? 'هنوز موقعیت زنده‌ای دریافت نشده است. با شروع سفر توسط راننده، موقعیت روی نقشه نمایش داده می‌شود.'
                : 'No live locations yet. A driver location will appear after a service direction starts.'
            }}
          </p>
        </div>
      }
      <lib-neshan-map
        [apiKey]="neshanMapApiKey"
        [serviceApiKey]="neshanServiceApiKey"
        [points]="[]"
        [liveLocations]="liveMarkers()"
        [followLive]="false"
        [language]="prefs.language()"
      />
      @if (locations().length) {
        <div class="meta">
          @for (location of locations(); track location.driverId) {
            <span>
              {{ fa() ? 'راننده' : 'Driver' }} #{{ location.driverId }} ·
              {{ fa() ? 'سفر' : 'Trip' }} #{{ location.tripId }} · {{ location.lat.toFixed(5) }},
              {{ location.lng.toFixed(5) }}
              @if (location.nextStationId !== null) {
                · {{ fa() ? 'ایستگاه بعدی' : 'Next station' }} #{{ location.nextStationId }}
              }
            </span>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .page {
        display: grid;
        gap: 1rem;
        padding: 1rem;
      }
      .head h1 {
        margin: 0;
        font-size: 1.25rem;
      }
      .status {
        margin: 0.25rem 0 0;
        color: var(--muted-foreground);
        font-size: 0.9rem;
      }
      .status.ok {
        color: var(--primary);
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem 1rem;
        font-size: 0.85rem;
        color: var(--muted-foreground);
      }
      .empty {
        border: 1px solid var(--border);
        border-radius: 0.75rem;
        padding: 1.25rem;
        background: var(--card);
      }
      .err {
        color: var(--destructive);
      }
      lib-neshan-map {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveTrackingPage {
  protected readonly tracking = inject(TrackingConnectionService)
  protected readonly prefs = inject(PreferencesStore)
  private readonly destroyRef = inject(DestroyRef)

  protected readonly fa = computed(() => this.prefs.isRtl())
  protected readonly neshanMapApiKey = environment.neshanMapApiKey ?? null
  protected readonly neshanServiceApiKey = environment.neshanServiceApiKey ?? null
  protected readonly locations = computed(() => [...this.tracking.driverLocations().values()])
  protected readonly liveMarkers = computed<NeshanLiveLocation[]>(() =>
    this.locations().map(location => ({
      id: location.driverId ?? undefined,
      lat: location.lat,
      lng: location.lng,
      label: `${this.fa() ? 'راننده' : 'Driver'} #${location.driverId}`,
    })),
  )

  constructor() {
    afterNextRender(() => void this.tracking.connectCookieStream())
    this.destroyRef.onDestroy(() => {
      void this.tracking.disconnect()
    })
  }
}
