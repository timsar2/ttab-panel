import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { DriverApi, Station, Passenger } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@spartan-ng/helm/alert'
import { HlmButton } from '@spartan-ng/helm/button'
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle,
} from '@spartan-ng/helm/card'
import { HlmSeparator } from '@spartan-ng/helm/separator'
import { HlmSpinner } from '@spartan-ng/helm/spinner'

@Component({
  selector: 'lib-station-operations-page',
  imports: [
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmCardDescription,
    HlmCardHeader,
    HlmCardTitle,
    HlmSpinner,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmSeparator,
  ],
  template: `
    <div class="page-container" [attr.dir]="fa() ? 'rtl' : 'ltr'">
      @if (loading()) {
        <div class="loading-state">
          <hlm-spinner />
          <p>{{ fa() ? 'در حال بارگذاری ایستگاه...' : 'Loading station...' }}</p>
        </div>
      } @else if (error()) {
        <hlm-alert variant="destructive" class="error-alert">
          <hlm-alert-title>{{ fa() ? 'خطا' : 'Error' }}</hlm-alert-title>
          <hlm-alert-description>{{ error() }}</hlm-alert-description>
          <button hlmBtn variant="outline" (click)="loadStation()">
            {{ fa() ? 'تلاش مجدد' : 'Retry' }}
          </button>
        </hlm-alert>
      } @else if (station()) {
        <header class="page-header">
          <button hlmBtn variant="ghost" size="icon" class="back-btn" (click)="goBack()">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div class="header-content">
            <h1>{{ station()!.name }}</h1>
            @if (station()!.address) {
              <p class="station-address">{{ station()!.address }}</p>
            }
          </div>
        </header>

        <hlm-card class="passengers-card">
          <hlm-card-header>
            <hlm-card-title>{{ fa() ? 'لیست مسافران' : 'Passengers' }}</hlm-card-title>
            <hlm-card-description
              >{{ station()!.passengers.length }} {{ fa() ? 'مسافر' : 'passenger'
              }}{{ station()!.passengers.length !== 1 ? 's' : '' }}</hlm-card-description
            >
          </hlm-card-header>
          <hlm-card-content>
            @if (station()!.passengers.length > 0) {
              <div class="passengers-list">
                @for (passenger of station()!.passengers; track passenger.id) {
                  <div
                    class="passenger-item"
                    [class.absent]="passenger.isAbsent"
                    [class.selected]="selectedAbsentIds().includes(passenger.id)"
                  >
                    <div class="passenger-info">
                      <p class="passenger-name">{{ passenger.fullName }}</p>
                      <p class="passenger-phone">
                        <a [href]="'tel:' + passenger.mobileNumber">{{ passenger.mobileNumber }}</a>
                      </p>
                    </div>
                    <div class="passenger-actions">
                      <button
                        hlmBtn
                        variant="ghost"
                        size="icon"
                        class="call-btn"
                        (click)="callPassenger(passenger)"
                        [attr.aria-label]="fa() ? 'تماس با مسافر' : 'Call passenger'"
                      >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                      </button>
                      <button
                        hlmBtn
                        variant="outline"
                        size="sm"
                        class="absent-btn"
                        [class.absent]="passenger.isAbsent"
                        (click)="toggleAbsent(passenger)"
                      >
                        {{
                          passenger.isAbsent
                            ? fa()
                              ? 'حضور دارد'
                              : 'Present'
                            : fa()
                              ? 'غایب'
                              : 'Absent'
                        }}
                      </button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="no-passengers">
                {{
                  fa()
                    ? 'مسافری برای این ایستگاه ثبت نشده است.'
                    : 'No passengers assigned to this station.'
                }}
              </p>
            }
          </hlm-card-content>
        </hlm-card>

        <hlm-separator class="section-separator" />

        <div class="arrival-section">
          <h2>{{ fa() ? 'رسیدن به ایستگاه' : 'Station Arrival' }}</h2>
          <p class="arrival-description">
            {{
              fa()
                ? 'مسافران غایب را تأیید و رسیدن به ایستگاه را ثبت کنید.'
                : 'Confirm absent passengers and register station arrival.'
            }}
          </p>

          @if (selectedAbsentIds().length > 0) {
            <div class="selected-absent">
              <p>{{ fa() ? 'مسافران غایب انتخاب شده:' : 'Selected absent passengers:' }}</p>
              <ul>
                @for (id of selectedAbsentIds(); track id) {
                  @let passenger = station()!.passengers.find(p => p.id === id);
                  @if (passenger) {
                    <li>{{ passenger.fullName }}</li>
                  }
                }
              </ul>
            </div>
          }

          <div class="arrival-actions">
            <button hlmBtn variant="outline" (click)="goBack()">
              {{ fa() ? 'انصراف' : 'Cancel' }}
            </button>
            <button hlmBtn [disabled]="submitting()" (click)="submitArrival()">
              {{
                submitting()
                  ? fa()
                    ? 'در حال ثبت...'
                    : 'Submitting...'
                  : fa()
                    ? 'تأیید و ثبت رسیدن'
                    : 'Confirm Arrival'
              }}
            </button>
          </div>

          @if (submissionError()) {
            <hlm-alert variant="destructive" class="submission-error">
              <hlm-alert-title>{{ fa() ? 'خطا در ثبت' : 'Submission failed' }}</hlm-alert-title>
              <hlm-alert-description>{{ submissionError() }}</hlm-alert-description>
            </hlm-alert>
          }
          @if (submissionSuccess()) {
            <hlm-alert variant="default" class="submission-success">
              <hlm-alert-title>{{ fa() ? 'موفقیت' : 'Success' }}</hlm-alert-title>
              <hlm-alert-description>{{
                fa()
                  ? 'رسیدن به ایستگاه با موفقیت ثبت شد.'
                  : 'Station arrival confirmed successfully.'
              }}</hlm-alert-description>
            </hlm-alert>
          }
        </div>
      } @else {
        <hlm-alert variant="default">
          <hlm-alert-title>{{ fa() ? 'ایستگاه یافت نشد' : 'Station not found' }}</hlm-alert-title>
          <hlm-alert-description>{{
            fa() ? 'اطلاعات ایستگاه در دسترس نیست.' : 'Station information is not available.'
          }}</hlm-alert-description>
          <button hlmBtn (click)="goBack()">{{ fa() ? 'بازگشت' : 'Back' }}</button>
        </hlm-alert>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .page-container {
        padding: 1.5rem;
        max-width: 600px;
        margin: 0 auto;
      }
      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 3rem;
      }
      .error-alert {
        margin-bottom: 1rem;
      }
      .page-header {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .back-btn {
        flex-shrink: 0;
        margin-top: 0.25rem;
      }
      .header-content h1 {
        margin: 0 0 0.25rem;
        font-size: 1.5rem;
        font-weight: 600;
      }
      .station-address {
        margin: 0;
        color: var(--muted-foreground);
        font-size: 0.875rem;
      }
      .passengers-card {
        margin-bottom: 1rem;
      }
      .passengers-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .passenger-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem;
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        background: var(--card);
        transition: all 0.2s;
      }
      .passenger-item.absent {
        opacity: 0.6;
        background: var(--muted);
      }
      .passenger-item.selected {
        border-color: var(--primary);
        background: color-mix(in srgb, var(--primary) 5%, transparent);
      }
      .passenger-info {
        flex: 1;
        min-width: 0;
      }
      .passenger-name {
        margin: 0 0 0.25rem;
        font-weight: 500;
      }
      .passenger-phone {
        margin: 0;
        font-size: 0.875rem;
        color: var(--muted-foreground);
      }
      .passenger-phone a {
        color: inherit;
        text-decoration: none;
      }
      .passenger-phone a:hover {
        text-decoration: underline;
      }
      .passenger-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }
      .call-btn {
        color: var(--primary);
      }
      .call-btn:hover {
        background: color-mix(in srgb, var(--primary) 10%, transparent);
      }
      .absent-btn.absent {
        background: var(--primary);
        color: var(--primary-foreground);
        border-color: var(--primary);
      }
      .section-separator {
        margin: 1.5rem 0;
      }
      .arrival-section {
        padding: 1rem 0;
      }
      .arrival-section h2 {
        margin: 0 0 0.5rem;
        font-size: 1.125rem;
        font-weight: 600;
      }
      .arrival-description {
        margin: 0 0 1.5rem;
        color: var(--muted-foreground);
        font-size: 0.875rem;
      }
      .selected-absent {
        padding: 1rem;
        background: var(--muted);
        border-radius: 0.5rem;
        margin-bottom: 1rem;
      }
      .selected-absent p {
        margin: 0 0 0.5rem;
        font-weight: 500;
        font-size: 0.875rem;
      }
      .selected-absent ul {
        margin: 0;
        padding-inline-start: 1.5rem;
      }
      .selected-absent li {
        font-size: 0.875rem;
      }
      .arrival-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
      }
      .submission-error,
      .submission-success {
        margin-top: 1rem;
      }
      .no-passengers {
        margin: 0;
        color: var(--muted-foreground);
        text-align: center;
        padding: 2rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationOperationsPage {
  private readonly api = inject(DriverApi)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly config = inject(DRIVER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')

  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly station = signal<Station | null>(null)
  protected readonly selectedAbsentIds = signal<number[]>([])
  protected readonly submitting = signal(false)
  protected readonly submissionError = signal<string | null>(null)
  protected readonly submissionSuccess = signal(false)

  constructor() {
    const stationId = Number(this.route.snapshot.paramMap.get('stationId'))
    if (stationId) {
      this.loadStation(stationId)
    } else {
      this.loading.set(false)
      this.error.set(this.fa() ? 'شناسه ایستگاه معتبر نیست.' : 'Invalid station ID.')
    }
  }

  protected async loadStation(stationId?: number): Promise<void> {
    const id = stationId ?? Number(this.route.snapshot.paramMap.get('stationId'))
    this.loading.set(true)
    this.error.set(null)
    try {
      const trip = await this.api.activeTrip()
      if (trip) {
        const station = trip.stations.find(s => s.id === id)
        if (station) {
          this.station.set(station)
        } else {
          this.error.set(this.fa() ? 'ایستگاه یافت نشد.' : 'Station not found.')
        }
      } else {
        this.error.set(this.fa() ? 'سفر فعالی یافت نشد.' : 'No active trip found.')
      }
    } catch {
      this.error.set(
        this.fa() ? 'بارگذاری اطلاعات ایستگاه ناموفق بود.' : 'Failed to load station data.',
      )
    } finally {
      this.loading.set(false)
    }
  }

  protected toggleAbsent(passenger: Passenger): void {
    this.selectedAbsentIds.update(ids =>
      ids.includes(passenger.id) ? ids.filter(i => i !== passenger.id) : [...ids, passenger.id],
    )
  }

  protected async submitArrival(): Promise<void> {
    const trip = await this.api.activeTrip()
    if (!trip || !this.station()) return

    this.submitting.set(true)
    this.submissionError.set(null)
    this.submissionSuccess.set(false)

    try {
      await this.api.submitStationArrival({
        tripId: trip.id,
        stationId: this.station()!.id,
        absentPassengerIds: this.selectedAbsentIds(),
      })
      this.submissionSuccess.set(true)
      // Reset selections after successful submission
      this.selectedAbsentIds.set([])
      // Reload station to reflect server state
      setTimeout(() => this.loadStation(), 1500)
    } catch {
      this.submissionError.set(
        this.fa()
          ? 'ثبت رسیدن به ایستگاه ناموفق بود. لطفاً دوباره تلاش کنید.'
          : 'Failed to confirm station arrival. Please try again.',
      )
    } finally {
      this.submitting.set(false)
    }
  }

  protected callPassenger(passenger: Passenger): void {
    window.open(`tel:${passenger.mobileNumber}`, '_self')
  }

  protected goBack(): void {
    this.router.navigateByUrl('/driver/live-map')
  }
}
