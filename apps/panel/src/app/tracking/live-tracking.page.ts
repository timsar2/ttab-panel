import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core'
import { NeshanLiveLocation, NeshanMapComponent } from '@org/shared-maps'
import { TrackingConnectionService } from '@org/shared-tracking'
import { environment } from '@org/platform/config'
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
                ? 'اتصال SignalR برقرار است'
                : 'SignalR connected'
              : fa()
                ? 'در حال اتصال به هاب...'
                : 'Connecting to hub...'
          }}
        </p>
      </header>

      @if (live(); as loc) {
        <div class="meta">
          <span
            >{{ fa() ? 'آخرین موقعیت' : 'Last location' }}: {{ loc.lat.toFixed(5) }},
            {{ loc.lng.toFixed(5) }}</span
          >
          @if (tracking.lastLocation()?.tripId != null) {
            <span>{{ fa() ? 'سفر' : 'Trip' }}: {{ tracking.lastLocation()?.tripId }}</span>
          }
          @if (tracking.lastLocation()?.driverId != null) {
            <span>{{ fa() ? 'راننده' : 'Driver' }}: {{ tracking.lastLocation()?.driverId }}</span>
          }
          @if (tracking.lastLocation()?.nextStationId != null) {
            <span
              >{{ fa() ? 'ایستگاه بعدی' : 'Next station' }}:
              {{ tracking.lastLocation()?.nextStationId }}</span
            >
          }
        </div>
        <lib-neshan-map
          [apiKey]="neshanMapApiKey"
          [serviceApiKey]="neshanServiceApiKey"
          [points]="[]"
          [liveLocation]="liveMarker()"
          [followLive]="true"
          [language]="prefs.language()"
        />
      } @else {
        <div class="empty">
          <p>
            {{
              fa()
                ? 'هنوز موقعیت زنده‌ای دریافت نشده است. با شروع سفر توسط راننده، موقعیت روی نقشه نمایش داده می‌شود.'
                : 'No live location received yet. When a driver starts sharing during an active trip, their position will appear here.'
            }}
          </p>
          @if (tracking.error(); as err) {
            <p class="err">{{ err }}</p>
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

  protected readonly live = computed(() => this.tracking.lastLocation())
  protected readonly liveMarker = computed<NeshanLiveLocation | null>(() => {
    const loc = this.live()
    if (!loc) return null
    return { lat: loc.lat, lng: loc.lng, label: this.fa() ? 'راننده' : 'Driver' }
  })

  constructor() {
    void this.connect()
    this.destroyRef.onDestroy(() => {
      void this.tracking.disconnect()
    })
  }

  private async connect(): Promise<void> {
    try {
      const hubUrl = `${environment.baseUrl.replace(/\/$/, '')}/notifications`
      await this.tracking.configure({ hubUrl, withCredentials: false })
      await this.tracking.connect()
    } catch {
      /* retry handled by reconnect policy */
    }
  }
}
