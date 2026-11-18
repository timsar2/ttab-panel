import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { DriverApi, RouteCard } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@spartan-ng/helm/alert'
import { HlmButton } from '@spartan-ng/helm/button'
import { DriverRouteCard } from './driver-route-card'
import {
  HlmSelect,
  HlmSelectContent,
  HlmSelectItem,
  HlmSelectTrigger,
  HlmSelectValue,
} from '@spartan-ng/helm/select'
import { HlmSpinner } from '@spartan-ng/helm/spinner'
import { HlmTabs, HlmTabsContent, HlmTabsList, HlmTabsTrigger } from '@spartan-ng/helm/tabs'
import { HlmFieldImports } from '@spartan-ng/helm/field'

type TabType = 'your-route' | 'new-route'

@Component({
  selector: 'lib-route-management-page',
  imports: [
    HlmButton,
    DriverRouteCard,
    HlmTabs,
    HlmTabsContent,
    HlmTabsList,
    HlmTabsTrigger,
    HlmSpinner,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmSelect,
    HlmSelectContent,
    HlmSelectItem,
    HlmSelectTrigger,
    HlmSelectValue,
    HlmFieldImports,
  ],
  template: `
    <div class="page-container" [attr.dir]="fa() ? 'rtl' : 'ltr'">
      <header class="page-header">
        <h1>{{ fa() ? 'مدیریت مسیرها' : 'Route Management' }}</h1>
        <p class="page-subtitle">
          {{ fa() ? 'مسیرها را فیلتر و مدیریت کنید' : 'Filter and manage routes' }}
        </p>
      </header>

      <hlm-tabs [tab]="activeTab()" (tabActivated)="setTab($event)" class="route-tabs">
        <hlm-tabs-list>
          <button hlmTabsTrigger="your-route">{{ fa() ? 'مسیر شما' : 'Your Route' }}</button>
          <button hlmTabsTrigger="new-route">{{ fa() ? 'مسیر جدید' : 'New Route' }}</button>
        </hlm-tabs-list>

        @if (loading()) {
          <div class="loading-state" hlmTabsContent="your-route">
            <hlm-spinner />
            <p>{{ fa() ? 'در حال بارگذاری...' : 'Loading...' }}</p>
          </div>
        } @else if (error()) {
          <hlm-alert class="error-alert" variant="destructive" hlmTabsContent="your-route">
            <h2 hlmAlertTitle>{{ fa() ? 'خطا در بارگذاری' : 'Failed to load' }}</h2>
            <p hlmAlertDescription>{{ error() }}</p>
            <button hlmBtn variant="outline" class="retry-btn" (click)="loadRoutes()">
              {{ fa() ? 'تلاش مجدد' : 'Retry' }}
            </button>
          </hlm-alert>
        } @else {
          <div hlmTabsContent="your-route">
            @if (yourRoutes().length > 0) {
              <div class="routes-grid">
                @for (route of yourRoutes(); track route.id) {
                  <lib-driver-route-card [route]="route" [fa]="fa()" (start)="startRoute($event)" />
                }
              </div>
            } @else {
              <hlm-alert variant="default" class="empty-alert">
                <h2 hlmAlertTitle>{{ fa() ? 'مسیر فعال یافت نشد' : 'No active route' }}</h2>
                <p hlmAlertDescription>
                  {{
                    fa()
                      ? 'هیچ مسیری به شما تخصیص نیافته است.'
                      : 'No route is currently assigned to you.'
                  }}
                </p>
              </hlm-alert>
            }
            @if (pagination().totalPages > 1) {
              <nav class="pagination" [attr.aria-label]="fa() ? 'صفحه‌بندی مسیرها' : 'Route pages'">
                <button
                  hlmBtn
                  variant="outline"
                  [disabled]="!pagination().hasPreviousPage"
                  (click)="changePage(pagination().pageNumber - 1)"
                >
                  {{ fa() ? 'قبلی' : 'Previous' }}
                </button>
                <span>{{ pagination().pageNumber }} / {{ pagination().totalPages }}</span>
                <button
                  hlmBtn
                  variant="outline"
                  [disabled]="!pagination().hasNextPage"
                  (click)="changePage(pagination().pageNumber + 1)"
                >
                  {{ fa() ? 'بعدی' : 'Next' }}
                </button>
              </nav>
            }
          </div>

          <div hlmTabsContent="new-route">
            <div class="filter-section">
              <div class="filter-heading">
                <h2>{{ fa() ? 'پیدا کردن مسیر' : 'Find a route' }}</h2>
                <p>
                  {{
                    fa()
                      ? 'برای مشاهده مسیرهای موجود، گزینه‌ها را انتخاب کنید.'
                      : 'Choose your preferences to find available routes.'
                  }}
                </p>
              </div>
              <div class="filter-row">
                <div hlmField>
                  <label hlmFieldLabel for="route-line">{{ fa() ? 'خط' : 'Line' }}</label>
                  <hlm-select [(value)]="filterLine" (valueChange)="applyFilters()">
                    <hlm-select-trigger id="route-line">
                      <hlm-select-value [placeholder]="fa() ? 'همه خطوط' : 'All lines'" />
                    </hlm-select-trigger>
                    <hlm-select-content>
                      @for (line of availableLines(); track line.id) {
                        <hlm-select-item [value]="line.id">{{ line.name }}</hlm-select-item>
                      }
                    </hlm-select-content>
                  </hlm-select>
                </div>
                <div hlmField>
                  <label hlmFieldLabel for="route-trip-type">{{
                    fa() ? 'نوع سفر' : 'Trip type'
                  }}</label>
                  <hlm-select [(value)]="filterTripType" (valueChange)="applyFilters()">
                    <hlm-select-trigger id="route-trip-type">
                      <hlm-select-value [placeholder]="fa() ? 'همه انواع سفر' : 'All trip types'" />
                    </hlm-select-trigger>
                    <hlm-select-content>
                      @for (type of availableTripTypes(); track type.id) {
                        <hlm-select-item [value]="type.id">{{ type.name }}</hlm-select-item>
                      }
                    </hlm-select-content>
                  </hlm-select>
                </div>
                <div hlmField>
                  <label hlmFieldLabel for="route-shift">{{ fa() ? 'شیفت' : 'Shift' }}</label>
                  <hlm-select [(value)]="filterShift" (valueChange)="applyFilters()">
                    <hlm-select-trigger id="route-shift">
                      <hlm-select-value [placeholder]="fa() ? 'همه شیفت‌ها' : 'All shifts'" />
                    </hlm-select-trigger>
                    <hlm-select-content>
                      @for (shift of availableShifts(); track shift.id) {
                        <hlm-select-item [value]="shift.id">{{ shift.name }}</hlm-select-item>
                      }
                    </hlm-select-content>
                  </hlm-select>
                </div>
              </div>
            </div>

            @if (filteredRoutes().length > 0) {
              <div class="routes-grid">
                @for (route of filteredRoutes(); track route.id) {
                  <lib-driver-route-card [route]="route" [fa]="fa()" (start)="startRoute($event)" />
                }
              </div>
            } @else {
              <hlm-alert variant="default" class="empty-alert">
                <h2 hlmAlertTitle>{{ fa() ? 'مسیری یافت نشد' : 'No routes found' }}</h2>
                <p hlmAlertDescription>
                  {{
                    fa()
                      ? 'هیچ مسیری با فیلترهای انتخاب شده مطابقت ندارد.'
                      : 'No routes match the selected filters.'
                  }}
                </p>
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
        color: var(--foreground);
        font-family: 'Vazirmatn Variable', Vazirmatn, Poppins, sans-serif;
      }
      .page-header {
        margin-bottom: 1.5rem;
      }
      .page-header h1 {
        color: var(--heading);
        font-size: 1.75rem;
        font-weight: 700;
        line-height: 1.5;
        margin: 0 0 0.5rem;
      }
      .page-subtitle {
        color: var(--muted-foreground);
        font-size: 1rem;
        line-height: 1.7;
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
        padding: 1.25rem;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 1rem;
        box-shadow: 0 1px 3px color-mix(in srgb, var(--foreground) 6%, transparent);
      }
      .filter-heading {
        margin-bottom: 1.25rem;
      }
      .filter-heading h2 {
        color: var(--heading);
        font-size: 1.125rem;
        font-weight: 600;
        line-height: 1.5;
        margin: 0 0 0.25rem;
      }
      .filter-heading p {
        color: var(--muted-foreground);
        font-size: 0.875rem;
        line-height: 1.6;
        margin: 0;
      }
      .filter-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
      }
      .filter-row [hlmField] {
        min-width: 0;
      }
      .filter-row hlm-select,
      .filter-row hlm-select-trigger {
        width: 100%;
      }
      .routes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
      }
      .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        padding: 1.25rem 0;
      }
      @media (max-width: 640px) {
        .page-container {
          padding: 1rem;
        }
        .filter-section {
          padding: 1rem;
        }
        .filter-row {
          grid-template-columns: 1fr;
          gap: 0.875rem;
        }
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
  protected readonly pagination = signal({
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  })
  protected readonly activeTab = signal<TabType>('your-route')
  protected readonly filterLine = signal<string>('')
  protected readonly filterTripType = signal<string>('')
  protected readonly filterShift = signal<string>('')

  protected readonly yourRoutes = computed(() => this.allRoutes())

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
      const result = await this.api.availableRoutesPage(
        this.pagination().pageNumber,
        this.pagination().pageSize,
      )
      this.allRoutes.set(result.list)
      this.pagination.set(result.pagination)
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

  protected setTab(tab: string): void {
    if (tab === 'your-route' || tab === 'new-route') this.activeTab.set(tab)
  }

  protected applyFilters(): void {
    // Filters are applied reactively via computed signal
  }

  protected changePage(pageNumber: number): void {
    if (pageNumber < 1 || pageNumber > this.pagination().totalPages) return
    this.pagination.update(value => ({ ...value, pageNumber }))
    void this.loadRoutes()
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
