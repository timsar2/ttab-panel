import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core'
import { ShiftTimesStore } from '@org/transport-scheduling-data-access'
import { RouteCard } from '../driver-pwa-feature/driver.api'

@Component({
  selector: 'lib-driver-route-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="route-card" [class.inactive]="!isActive()">
      <div class="card-content">
        <header class="route-header">
          <button class="start-button" [disabled]="!isActive()" (click)="start.emit(route())">
            {{ fa() ? 'شروع مسیر' : 'Start route' }}
          </button>
          <div class="route-copy" [attr.dir]="fa() ? 'rtl' : 'ltr'">
            <h2>{{ routeTitle() }}</h2>
            <p>{{ routeSubtitle() }}</p>
          </div>
          <div class="route-marker" aria-hidden="true">
            <img src="/assets/images/feasible/routing.svg" alt="" />
          </div>
        </header>

        @if (shiftName() || shiftStartTime()) {
          <div class="shift-time-row" [attr.dir]="fa() ? 'rtl' : 'ltr'">
            <div class="shift-name">
              <svg class="shift-clock" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 11h5v-2h-4V6h-2v7Z"
                />
              </svg>
              <span>{{ shiftName() }}</span>
            </div>
            <div class="shift-departure" dir="ltr">
              <span>{{ shiftStartTime() }}</span>
              @if (shiftStartTime()) {
                <img
                  class="time-icon"
                  [src]="
                    isDaytime()
                      ? '/assets/images/feasible/sun.svg'
                      : '/assets/images/feasible/moon.svg'
                  "
                  alt=""
                  aria-hidden="true"
                />
              }
            </div>
          </div>
        }
      </div>
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
        border: 1px solid var(--border);
        border-radius: 1.25rem;
        background: var(--card);
        color: var(--card-foreground);
        box-shadow: var(--shadow-sm);
      }
      .card-content {
        padding: 18px;
      }
      .route-header {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 12px;
        direction: ltr;
      }
      .start-button {
        width: 32%;
        min-width: 112px;
        min-height: 48px;
        flex: 0 0 32%;
        border: 0;
        border-radius: 999px;
        background: #ff9800;
        color: #fff;
        font-size: 15px;
        font-weight: 650;
        white-space: nowrap;
      }
      .start-button:hover:not(:disabled) {
        background: #f28c00;
      }
      .start-button:disabled {
        background: #ffcc80;
        color: #fff;
      }
      .route-copy {
        min-width: 0;
        flex: 1 1 auto;
        text-align: right;
      }
      h2 {
        overflow: hidden;
        margin: 0;
        color: var(--heading);
        font-size: 19px;
        font-weight: 700;
        line-height: 1.5;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .route-copy p {
        overflow: hidden;
        margin: 5px 0 0;
        color: var(--muted-foreground);
        font-size: 14px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .route-marker {
        display: grid;
        width: 60px;
        height: 60px;
        flex: 0 0 60px;
        place-items: center;
        border-radius: 15px;
        background: #fff4df;
        box-shadow: 0 2px 3px rgb(0 0 0 / 12%);
      }
      .route-marker img {
        display: block;
        width: 38px;
        height: 38px;
        object-fit: contain;
      }
      .shift-time-row {
        display: flex;
        min-width: 0;
        align-items: center;
        justify-content: space-between;
        margin-top: 14px;
        padding-top: 13px;
        border-top: 1px solid var(--border);
        color: var(--card-foreground);
      }
      .shift-name,
      .shift-departure {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 6px;
        font-size: 18px;
        font-weight: 600;
        white-space: nowrap;
      }
      .shift-clock {
        width: 24px;
        height: 24px;
        flex: 0 0 24px;
        fill: #4caf50;
      }
      .shift-departure {
        gap: 5px;
        font-size: 19px;
        font-weight: 500;
      }
      .time-icon {
        display: block;
        width: 22px;
        height: 22px;
        flex: 0 0 22px;
        object-fit: contain;
      }
      .route-card.inactive .start-button {
        cursor: not-allowed;
      }
      @media (max-width: 380px) {
        .card-content {
          padding: 14px;
        }
        .route-header {
          gap: 8px;
        }
        .start-button {
          min-width: 96px;
          min-height: 44px;
          flex-basis: 31%;
          font-size: 13px;
        }
        .route-marker {
          width: 52px;
          height: 52px;
          flex-basis: 52px;
        }
        .route-marker img {
          width: 34px;
          height: 34px;
        }
        h2 {
          font-size: 17px;
        }
        .route-copy p {
          font-size: 12px;
        }
        .shift-name,
        .shift-departure {
          gap: 4px;
          font-size: 16px;
        }
        .shift-departure {
          font-size: 17px;
        }
      }
    `,
  ],
})
export class DriverRouteCard {
  private readonly shiftTimes = inject(ShiftTimesStore)
  readonly route = input.required<RouteCard>()
  readonly fa = input(false)
  readonly start = output<RouteCard>()

  protected routeTitle(): string {
    return this.route().directionName || this.route().lineName
  }

  protected routeSubtitle(): string {
    const { tripTypeName, lineName } = this.route()
    const route = [tripTypeName, lineName].filter(Boolean).join(' - ')
    return this.fa() ? `مسیر ${route}` : `Route ${route}`
  }

  protected shiftName(): string {
    return this.shiftTimes.byId().get(this.route().shiftTimeId)?.name || this.route().shiftTime
  }

  protected shiftStartTime(): string {
    return (
      this.shiftTimes.byId().get(this.route().shiftTimeId)?.shiftTime || this.route().departureTime
    )
  }

  protected isDaytime(): boolean {
    const hour = Number.parseInt(this.shiftStartTime().split(':')[0] ?? '', 10)
    return Number.isFinite(hour) && hour <= 12
  }

  protected isActive(): boolean {
    return !['inactive', 'false', '0', 'disabled'].includes(
      String(this.route().status ?? '').toLowerCase(),
    )
  }
}
