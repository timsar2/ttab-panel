import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { HlmButton } from '@spartan-ng/helm/button'
import { RouteCard } from '../driver-pwa-feature/driver.api'

@Component({
  selector: 'lib-driver-route-card',
  imports: [HlmButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="route-card" [class.inactive]="!isActive()" [attr.dir]="fa() ? 'rtl' : 'ltr'">
      <div class="card-content">
        <div class="badge-row">
          <span class="service-badge" [class.evening]="isEvening()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              @if (isEvening()) {
                <path d="M20.9 13A8 8 0 0 1 11 3.1 8 8 0 1 0 20.9 13Z" />
              } @else {
                <circle cx="12" cy="12" r="4" />
                <path
                  d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
                />
              }
            </svg>
            {{ serviceLabel() }}
          </span>
          <span class="status-badge" [class.status-inactive]="!isActive()">
            {{ statusLabel() }}
          </span>
        </div>

        <div class="route-heading">
          <div class="route-marker" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 19V5m0 0 4 4m-4-4L1 9m18 10V5m0 14-4-4m4 4 4-4" />
            </svg>
          </div>
          <div class="route-copy">
            <h2>{{ route().lineName }}</h2>
            <p>{{ directionLabel() }} <span aria-hidden="true">·</span> {{ routeIdLabel() }}</p>
          </div>
        </div>

        <div class="metadata">
          @if (route().departureTime || route().shiftTime) {
            <div class="metadata-item">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <div>
                <strong>{{ route().departureTime || route().shiftTime }}</strong
                ><span>{{ fa() ? 'زمان حرکت' : 'Departure' }}</span>
              </div>
            </div>
          }
          @if (route().tripTypeName) {
            <div class="metadata-item">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18M12 3l9 9-9 9" /></svg>
              <div>
                <strong>{{ route().tripTypeName }}</strong
                ><span>{{ fa() ? 'نوع سرویس' : 'Service type' }}</span>
              </div>
            </div>
          }
        </div>

        @if (
          route().driverName ||
          route().vehicleInfo ||
          route().passengerCount != null ||
          route().estimatedMinutes != null
        ) {
          <div class="optional-metadata">
            @if (route().driverName) {
              <span>{{ fa() ? 'راننده' : 'Driver' }}: {{ route().driverName }}</span>
            }
            @if (route().vehicleInfo) {
              <span>{{ fa() ? 'خودرو' : 'Vehicle' }}: {{ route().vehicleInfo }}</span>
            }
            @if (route().passengerCount != null) {
              <span>{{ route().passengerCount }} {{ fa() ? 'مسافر' : 'passengers' }}</span>
            }
            @if (route().estimatedMinutes != null) {
              <span>{{ route().estimatedMinutes }} {{ fa() ? 'دقیقه' : 'min' }}</span>
            }
          </div>
        }
      </div>

      <footer class="card-action">
        <button hlmBtn class="start-button" [disabled]="!isActive()" (click)="start.emit(route())">
          {{ fa() ? 'شروع سفر' : 'Start trip' }}
        </button>
      </footer>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .route-card {
        overflow: hidden;
        height: 100%;
        border: 1px solid var(--border);
        border-radius: 0.75rem;
        background: var(--card);
        color: var(--card-foreground);
        box-shadow: var(--shadow-sm);
      }
      .card-content {
        padding: 16px;
      }
      .badge-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .service-badge,
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 650;
      }
      .service-badge {
        color: var(--accent-foreground);
        background: var(--primary-soft);
      }
      .service-badge.evening {
        color: var(--secondary);
        background: var(--secondary-soft);
      }
      .status-badge {
        color: var(--success-foreground);
        background: var(--success-soft);
      }
      .status-inactive {
        color: var(--muted-foreground);
        background: var(--muted);
      }
      svg {
        width: 18px;
        height: 18px;
        flex: 0 0 auto;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .route-heading {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 18px;
      }
      .route-marker {
        display: grid;
        width: 42px;
        height: 42px;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 0.5rem;
        color: var(--secondary);
        background: var(--secondary-soft);
      }
      .route-marker svg {
        width: 22px;
        height: 22px;
      }
      .route-copy {
        min-width: 0;
      }
      h2 {
        overflow: hidden;
        margin: 0;
        color: var(--heading);
        font-size: 19px;
        font-weight: 700;
        line-height: 1.55;
        text-overflow: ellipsis;
      }
      .route-copy p {
        margin: 4px 0 0;
        color: var(--muted-foreground);
        font-size: 13px;
      }
      .metadata {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid var(--border);
      }
      .metadata-item {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 9px;
        color: var(--muted-foreground);
      }
      .metadata-item > div {
        display: grid;
        min-width: 0;
        gap: 2px;
      }
      .metadata-item strong {
        overflow: hidden;
        color: var(--card-foreground);
        font-size: 14px;
        font-weight: 650;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .metadata-item span {
        font-size: 11px;
      }
      .optional-metadata {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 14px;
        margin-top: 14px;
        color: var(--muted-foreground);
        font-size: 12px;
      }
      .card-action {
        padding: 12px 16px 16px;
        background: var(--surface-muted);
      }
      .start-button {
        width: 100%;
        min-height: 48px;
        border: 0;
        border-radius: 0.5rem;
        background: var(--primary);
        color: var(--primary-foreground);
        font-size: 15px;
        font-weight: 650;
      }
      .start-button:hover:not(:disabled) {
        background: var(--primary-hover);
      }
      .start-button:disabled {
        background: var(--muted);
        color: var(--muted-foreground);
      }
      .route-card.inactive {
        border-color: var(--border);
      }
      @media (max-width: 360px) {
        .card-content {
          padding: 13px;
        }
        h2 {
          font-size: 17px;
        }
      }
    `,
  ],
})
export class DriverRouteCard {
  readonly route = input.required<RouteCard>()
  readonly fa = input(false)
  readonly start = output<RouteCard>()

  protected isEvening(): boolean {
    const type = this.route().tripTypeName.toLowerCase()
    return type.includes('برگشت') || type.includes('evening') || type.includes('return')
  }

  protected serviceLabel(): string {
    if (this.isEvening()) return this.fa() ? 'سرویس برگشت' : 'Evening service'
    return this.fa() ? 'سرویس رفت' : 'Morning service'
  }

  protected directionLabel(): string {
    return this.fa()
      ? `جهت ${this.isEvening() ? 'برگشت' : 'رفت'}`
      : `${this.isEvening() ? 'Return' : 'Outbound'} direction`
  }

  protected routeIdLabel(): string {
    return `${this.fa() ? 'مسیر' : 'Route'} ${this.route().directionId}`
  }

  protected isActive(): boolean {
    return !['inactive', 'false', '0', 'disabled'].includes(
      String(this.route().status ?? '').toLowerCase(),
    )
  }

  protected statusLabel(): string {
    if (!this.route().status) return this.fa() ? 'تخصیص‌یافته' : 'Assigned'
    return this.isActive() ? (this.fa() ? 'فعال' : 'Active') : this.fa() ? 'غیرفعال' : 'Inactive'
  }
}
