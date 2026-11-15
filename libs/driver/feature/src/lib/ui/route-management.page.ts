import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { DriverApi, RouteCard } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import { HlmCardImports } from '@spartan-ng/helm/card'
import { HlmTabsImports } from '@spartan-ng/helm/tabs'
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmSelectImports } from '@spartan-ng/helm/select'
import { HlmInputImports } from '@spartan-ng/helm/input'
import { HlmLabelImports } from '@spartan-ng/helm/label'

type TabType = 'your-route' | 'new-route'

@Component({
  selector: 'lib-route-management-page',
  imports: [
    HlmButtonImports,
    HlmCardImports,
    HlmTabsImports,
    HlmSpinnerImports,
    HlmAlertImports,
    HlmSelectImports,
    HlmInputImports,
    HlmLabelImports,
  ],
  template: `
    <div class="page-container" [attr.dir]="fa() ? 'rtl' : 'ltr'">
      <header class="page-header">
        <h1>{{ fa() ? 'مدیریت مسیرها' : 'Route Management' }}</h1>
        <p class="page-subtitle">
          {{ fa() ? 'مسیرها را فیلتر و مدیریت کنید' : 'Filter and manage routes' }}
        </p>
      </header>

      <hlm-tabs defaultValue="your-route" class="route-tabs" (valueChange)="setTab($event)">
        <hlm-tabs-list>
          <hlm-tabs-trigger value="your-route">{{
            fa() ? 'مسیر شما' : 'Your Route'
          }}</hlm-tabs-trigger>
          <hlm-tabs-trigger value="new-route">{{
            fa() ? 'مسیر جدید' : 'New Route'
          }}</hlm-tabs-trigger>
        </hlm-tabs-list>

        @if (loading()) {
          <div class="loading-state" hlm-tabs-content>
            <hlm-spinner />
            <p>{{ fa() ? 'در حال بارگذاری...' : 'Loading...' }}</p>
          </div>
        } @else if (error()) {
          <hlm-alert class="error-alert" variant="destructive" hlm-tabs-content>
            <hlm-alert-title>{{ fa() ? 'خطا در بارگذاری' : 'Failed to load' }}</hlm-alert-title>
            <hlm-alert-description>{{ error() }}</hlm-alert-description>
            <button hlmBtn variant="outline" class="retry-btn" (click)="loadRoutes()">
              {{ fa() ? 'تلاش مجدد' : 'Retry' }}
            </button>
          </hlm-alert>
        } @else {
          <div hlm-tabs-content *hlmTabsContent="['your-route']">
            @if (yourRoutes().length > 0) {
              <div class="routes-grid">
                @for (route of yourRoutes(); track route.id) {
                  <hlm-card class="route-card" (click)="startRoute(route)">
                    <hlm-card-header>
                      <hlm-card-title>{{ route.lineName }}</hlm-card-title>
                      <hlm-card-description>{{ route.tripTypeName }}</hlm-card-description>
                    </hlm-card-header>
                    <hlm-card-content>
                      <div class="route-detail">
                        <span class="detail-item">
                          <svg
                            class="detail-icon"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {{ route.shiftTime }}
                        </span>
                        <span class="detail-item">
                          <svg
                            class="detail-icon"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {{ route.departureTime }}
                        </span>
                      </div>
                    </hlm-card-content>
                    <hlm-card-footer>
                      <button
                        hlmBtn
                        class="start-route-btn"
                        (click)="$event.stopPropagation(); startRoute(route)"
                      >
                        {{ fa() ? 'شروع سفر' : 'Start Trip' }}
                      </button>
                    </hlm-card-footer>
                  </hlm-card>
                }
              </div>
            } @else {
              <hlm-alert variant="default" class="empty-alert">
                <hlm-alert-title>{{
                  fa() ? 'مسیر فعال یافت نشد' : 'No active route'
                }}</hlm-alert-title>
                <hlm-alert-description>{{
                  fa()
                    ? 'هیچ مسیری به شما تخصیص نیافته است.'
                    : 'No route is currently assigned to you.'
                }}</hlm-alert-description>
              </hlm-alert>
            }
          </div>

          <div hlm-tabs-content *hlmTabsContent="['new-route']">
            <div class="filter-section">
              <div class="filter-row">
                <hlm-select
                  [(value)]="filterLine"
                  (valueChange)="applyFilters()"
                  placeholder="{{ fa() ? 'خط را انتخاب کنید' : 'Select line' }}"
                >
                  <hlm-select-trigger>
                    <hlm-select-value />
                  </hlm-select-trigger>
                  <hlm-select-content>
                    @for (line of availableLines(); track line.id) {
                      <hlm-select-item [value]="line.id">{{ line.name }}</hlm-select-item>
                    }
                  </hlm-select-content>
                </hlm-select>
                <hlm-select
                  [(value)]="filterTripType"
                  (valueChange)="applyFilters()"
                  placeholder="{{ fa() ? 'نوع سفر' : 'Trip type' }}"
                >
                  <hlm-select-trigger>
                    <hlm-select-value />
                  </hlm-select-trigger>
                  <hlm-select-content>
                    @for (type of availableTripTypes(); track type.id) {
                      <hlm-select-item [value]="type.id">{{ type.name }}</hlm-select-item>
                    }
                  </hlm-select-content>
                </hlm-select>
                <hlm-select
                  [(value)]="filterShift"
                  (valueChange)="applyFilters()"
                  placeholder="{{ fa() ? 'شیفت' : 'Shift' }}"
                >
                  <hlm-select-trigger>
                    <hlm-select-value />
                  </hlm-select-trigger>
                  <hlm-select-content>
                    @for (shift of availableShifts(); track shift.id) {
                      <hlm-select-item [value]="shift.id">{{ shift.name }}</hlm-select-item>
                    }
                  </hlm-select-content>
                </hlm-select>
              </div>
            </div>

            @if (filteredRoutes().length > 0) {
              <div class="routes-grid">
                @for (route of filteredRoutes(); track route.id) {
                  <hlm-card class="route-card" (click)="startRoute(route)">
                    <hlm-card-header>
                      <hlm-card-title>{{ route.lineName }}</hlm-card-title>
                      <hlm-card-description>{{ route.tripTypeName }}</hlm-card-description>
                    </hlm-card-header>
                    <hlm-card-content>
                      <div class="route-detail">
                        <span class="detail-item">
                          <svg
                            class="detail-icon"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {{ route.shiftTime }}
                        </span>
                        <span class="detail-item">
                          <svg
                            class="detail-icon"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {{ route.departureTime }}
                        </span>
                      </div>
                    </hlm-card-content>
                    <hlm-card-footer>
                      <button
                        hlmBtn
                        class="start-route-btn"
                        (click)="$event.stopPropagation(); startRoute(route)"
                      >
                        {{ fa() ? 'شروع سفر' : 'Start Trip' }}
                      </button>
                    </hlm-card-footer>
                  </hlm-card>
                }
              </div>
            } @else {
              <hlm-alert variant="default" class="empty-alert">
                <hlm-alert-title>{{ fa() ? 'مسیری یافت نشد' : 'No routes found' }}</hlm-alert-title>
                <hlm-alert-description>{{
                  fa()
                    ? 'هیچ مسیری با فیلترهای انتخاب شده مطابقت ندارد.'
                    : 'No routes match the selected filters.'
                }}</hlm-alert-description>
              </hlm-alert>
            }
          </div>
        }
      </hlm-tabs>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .page-container {
        padding: 1.5rem;
        max-width: 900px;
        margin: 0 auto;
      }
      .page-header {
        margin-bottom: 1.5rem;
      }
      .page-header h1 {
        font-size: 1.875rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
      }
      .page-subtitle {
        color: var(--muted-foreground);
        margin: 0;
      }
      .route-tabs {
        width: 100%;
      }
      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 3rem;
      }
      .error-alert,
      .empty-alert {
        margin-bottom: 1rem;
      }
      .filter-section {
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: var(--muted);
        border-radius: 0.75rem;
      }
      .filter-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }
      .filter-row hlm-select {
        flex: 1;
        min-width: 180px;
      }
      .routes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
      }
      .route-card {
        cursor: pointer;
        transition:
          box-shadow 0.2s,
          transform 0.2s;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .route-card:hover {
        box-shadow: var(--shadow-lg);
        transform: translateY(-2px);
      }
      .route-detail {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }
      .detail-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--muted-foreground);
      }
      .detail-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .start-route-btn {
        width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteManagementPage {
  private readonly api = inject(DriverApi)
  private readonly router = inject(Router)
  private readonly config = inject(DRIVER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')

  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly allRoutes = signal<RouteCard[]>([])
  protected readonly activeTab = signal<TabType>('your-route')
  protected readonly filterLine = signal<string>('')
  protected readonly filterTripType = signal<string>('')
  protected readonly filterShift = signal<string>('')

  protected readonly yourRoutes = computed(() => {
    // In a real implementation, this would filter for the driver's assigned routes
    return this.allRoutes()
  })

  protected readonly availableLines = computed(() => {
    const lines = new Map<string, { id: string; name: string }>()
    this.allRoutes().forEach(r => lines.set(r.lineName, { id: r.lineName, name: r.lineName }))
    return Array.from(lines.values())
  })

  protected readonly availableTripTypes = computed(() => {
    const types = new Map<string, { id: string; name: string }>()
    this.allRoutes().forEach(r =>
      types.set(r.tripTypeName, { id: r.tripTypeName, name: r.tripTypeName }),
    )
    return Array.from(types.values())
  })

  protected readonly availableShifts = computed(() => {
    const shifts = new Map<string, { id: string; name: string }>()
    this.allRoutes().forEach(r => shifts.set(r.shiftTime, { id: r.shiftTime, name: r.shiftTime }))
    return Array.from(shifts.values())
  })

  protected readonly filteredRoutes = computed(() => {
    let routes = this.allRoutes()
    if (this.filterLine()) routes = routes.filter(r => r.lineName === this.filterLine())
    if (this.filterTripType()) routes = routes.filter(r => r.tripTypeName === this.filterTripType())
    if (this.filterShift()) routes = routes.filter(r => r.shiftTime === this.filterShift())
    return routes
  })

  constructor() {
    this.loadRoutes()
  }

  protected async loadRoutes(): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    try {
      const routes = await this.api.availableRoutes()
      this.allRoutes.set(routes)
    } catch {
      this.error.set(
        this.fa()
          ? 'بارگذاری مسیرها ناموفق بود. لطفاً دوباره تلاش کنید.'
          : 'Failed to load routes. Please try again.',
      )
    } finally {
      this.loading.set(false)
    }
  }

  protected setTab(tab: TabType): void {
    this.activeTab.set(tab)
  }

  protected applyFilters(): void {
    // Filters are applied reactively via computed signal
  }

  protected async startRoute(route: RouteCard): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    try {
      await this.api.startTrip({
        driverLineId: route.driverLineId,
        shiftTimeId: route.shiftTimeId,
        tripTypeId: route.tripTypeId,
        directionId: route.directionId,
      })
      await this.router.navigateByUrl('/driver/live-map')
    } catch {
      this.error.set(
        this.fa()
          ? 'شروع سفر ناموفق بود. لطفاً دوباره تلاش کنید.'
          : 'Failed to start trip. Please try again.',
      )
    } finally {
      this.loading.set(false)
    }
  }
}
