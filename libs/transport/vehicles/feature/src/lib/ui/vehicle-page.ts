import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import {
  VehicleRow,
  VehicleSearch,
  VehiclesApi,
  VehiclesStore,
} from '@org/transport-vehicles-data-access'
import { DataTablePage } from '@org/ui-data-table'
import type { BilingualText } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { VEHICLE_FEATURE, VEHICLE_LANGUAGE, VEHICLE_MANAGE } from '../vehicle.routes'
import { VEHICLE_TEXT, vehicleText } from '../vehicle-text'
import { VehicleTable } from './vehicle-table'

export function vehiclePageQuery(page: string | null, size: string | null): VehicleSearch {
  const number = page && /^[1-9]\d*$/.test(page) ? Number(page) : 1
  return {
    pageIndex: Number.isSafeInteger(number) && number <= 2147483647 ? number - 1 : 0,
    pageSize: [10, 25, 50, 100].includes(Number(size)) ? Number(size) : 10,
  }
}

@Component({
  selector: 'lib-vehicle-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VehicleTable, RouterLink, HlmButton],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-muted-foreground mb-1 text-sm">
            {{ language() === 'fa' ? 'مدیریت ناوگان' : 'Fleet management' }}
          </p>
          <h1 class="text-2xl font-semibold">{{ text('vehicles') }}</h1>
          <p class="text-muted-foreground mt-2">
            {{
              language() === 'fa'
                ? 'خودروهای ثبت‌شده برای شرکت انتخاب‌شده.'
                : 'Vehicles recorded for the selected company.'
            }}
          </p>
        </div>
        @if (canManage()) {
          <a hlmBtn class="min-h-11" [routerLink]="['new']" queryParamsHandling="preserve">{{
            text('createVehicle')
          }}</a>
        }
      </header>
      @if (!hasCompany()) {
        <p role="alert" class="border-destructive/40 bg-destructive/5 rounded-md border p-4">
          {{ text('denied') }}
        </p>
      } @else {
        <lib-vehicle-table
          [rows]="store.page()?.items ?? emptyRows"
          [loading]="store.loading()"
          [error]="error()"
          [page]="page()"
          [canManage]="canManage()"
          (pageChange)="changePage($event)"
          (retry)="reload()"
        />
      }
    </main>
  `,
})
export class VehiclePage {
  protected readonly config = inject(VEHICLE_FEATURE)
  protected readonly language = inject(VEHICLE_LANGUAGE)
  protected readonly canManage = inject(VEHICLE_MANAGE)
  protected readonly store = inject(VehiclesStore)
  private readonly api = inject(VehiclesApi)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  })
  private readonly query = computed(() =>
    vehiclePageQuery(this.params().get('page'), this.params().get('size')),
  )
  protected readonly emptyRows: readonly VehicleRow[] = []
  protected readonly rowId = (row: VehicleRow) => String(row.id)
  protected readonly rowLabel = (row: VehicleRow): BilingualText => ({
    en: row.carPlate || `${vehicleText('en', 'vehicle')} ${row.id}`,
    fa: row.carPlate || `${vehicleText('fa', 'vehicle')} ${row.id}`,
  })
  protected readonly hasCompany = computed(
    () => this.session.user() !== null && this.api.companyId() !== null,
  )
  protected readonly error = computed(() => {
    const denied =
      this.config.deniedMessage?.[this.language()] ?? vehicleText(this.language(), 'denied')
    if (!this.hasCompany()) return denied
    const error = this.store.error()
    return error?.code === 'vehicles-access-denied' ||
      error?.status === 401 ||
      error?.status === 403
      ? denied
      : error
        ? vehicleText(this.language(), 'loadFailed')
        : null
  })
  protected readonly page = computed<DataTablePage>(() => ({
    pageIndex: this.query().pageIndex,
    pageSize: this.query().pageSize,
    totalPages: this.store.page()?.pagination.totalPages ?? 0,
    hasPreviousPage: this.store.page()?.pagination.hasPreviousPage ?? false,
    hasNextPage: this.store.page()?.pagination.hasNextPage ?? false,
  }))

  constructor() {
    effect(() => {
      this.api.companyId()
      this.session.version()
      const query = this.query()
      untracked(() => this.store.search(query))
    })
  }

  protected text(key: keyof typeof VEHICLE_TEXT) {
    return vehicleText(this.language(), key)
  }
  protected reload() {
    this.store.search(this.query())
  }
  protected changePage(page: { pageIndex: number; pageSize: number }) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: { page: page.pageIndex + 1, size: page.pageSize },
    })
  }
}
