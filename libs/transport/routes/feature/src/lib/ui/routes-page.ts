import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { DirectionRoute, RoutesApi, RoutesStore } from '@org/transport-routes-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { HlmButton } from '@spartan-ng/helm/button'
import { ROUTE_FEATURE, ROUTE_LANGUAGE, ROUTE_MANAGE } from '../route.routes'
import { ROUTE_TEXT, routeText } from '../route-text'

@Component({
  selector: 'lib-routes-page',
  imports: [DataTable, HlmButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-muted-foreground mb-1 text-sm">
            {{ language() === 'fa' ? 'مدیریت حمل‌ونقل' : 'Transport management' }}
          </p>
          <h1 class="text-2xl font-semibold">{{ text('routes') }}</h1>
          <p class="text-muted-foreground mt-2">
            {{
              language() === 'fa' ? 'مسیرهای شرکت انتخاب‌شده' : 'Routes for the selected company'
            }}
          </p>
        </div>
        <div class="flex gap-2">
          <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['show-map']">{{
            text('map')
          }}</a>
          @if (canManage()) {
            <a hlmBtn class="min-h-11" [routerLink]="['add']">{{ text('addRoute') }}</a>
          }
        </div>
      </header>
      @if (!hasCompany()) {
        <p role="alert" class="rounded-md border p-4">{{ deniedMessage() }}</p>
      } @else {
        <lib-data-table
          [rows]="store.routes() ?? emptyRoutes"
          [columns]="columns()"
          [rowId]="rowId"
          [rowLabel]="rowLabel"
          [caption]="text('routes')"
          [page]="page()"
          [showPagination]="false"
          [loading]="store.listLoading()"
          [error]="listError()"
          [rowActions]="menuTemplate()"
          [actionHeading]="text('actions')"
          [loadingLabel]="text('loading')"
          [emptyLabel]="text('empty')"
          [errorTitle]="text('failed')"
          [retryLabel]="text('retry')"
          (retry)="reload()"
        />
      }
    </main>
    <ng-template #routeMenu let-route>
      <details class="relative">
        <summary
          class="bg-secondary text-secondary-foreground flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-md border px-3"
          [attr.aria-label]="text('menu') + ': ' + route.name"
        >
          <span aria-hidden="true">•••</span>
        </summary>
        <nav
          class="bg-popover text-popover-foreground absolute end-0 z-20 mt-1 grid min-w-48 gap-1 rounded-lg border p-2 shadow-lg"
          [attr.aria-label]="text('actions') + ': ' + route.name"
        >
          <a
            class="hover:bg-accent min-h-11 rounded px-3 py-2"
            [routerLink]="['detail', route.id]"
            >{{ text('editRoute') }}</a
          >
          <a
            class="hover:bg-accent min-h-11 rounded px-3 py-2"
            [routerLink]="['detail', route.id, 'lines']"
            >{{ text('lines') }}</a
          >
          <a
            class="hover:bg-accent min-h-11 rounded px-3 py-2"
            [routerLink]="['detail', route.id, 'stations']"
            >{{ text('stations') }}</a
          >
        </nav>
      </details>
    </ng-template>
  `,
})
export class RoutesPage {
  protected readonly config = inject(ROUTE_FEATURE)
  protected readonly language = inject(ROUTE_LANGUAGE)
  protected readonly canManage = inject(ROUTE_MANAGE)
  protected readonly store = inject(RoutesStore)
  private readonly api = inject(RoutesApi)
  private readonly session = inject(SessionStore)
  protected readonly emptyRoutes: readonly DirectionRoute[] = []
  protected readonly rowId = (route: DirectionRoute) => String(route.id)
  protected readonly rowLabel = (route: DirectionRoute) => route.name
  protected readonly menuTemplate =
    viewChild.required<TemplateRef<{ $implicit: DirectionRoute }>>('routeMenu')
  protected readonly columns = computed<readonly DataTableColumn<DirectionRoute>[]>(() => [
    {
      accessorKey: 'departureTime',
      header: this.text('departureTime'),
      cell: cell => cell.getValue(),
    },
    {
      accessorKey: 'name',
      header: this.language() === 'fa' ? 'نام مسیر' : 'Route name',
      cell: cell => cell.getValue(),
    },
  ])
  protected readonly hasCompany = computed(
    () => this.session.user() !== null && this.api.companyId() !== null,
  )
  protected readonly listError = computed(() => {
    const error = this.store.listError()
    if (
      !this.hasCompany() ||
      error?.code === 'routes-access-denied' ||
      error?.status === 401 ||
      error?.status === 403
    )
      return this.deniedMessage()
    return error ? this.text('failed') : null
  })
  protected readonly deniedMessage = computed(
    () => this.config.deniedMessage?.[this.language()] ?? this.text('denied'),
  )
  protected readonly page = computed<DataTablePage>(() => ({
    pageIndex: 0,
    pageSize: Math.max(this.store.routes()?.length ?? 0, 1),
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  }))

  constructor() {
    effect(() => {
      this.api.companyId()
      this.session.version()
      untracked(() => this.store.loadList())
    })
  }

  protected text(key: keyof typeof ROUTE_TEXT) {
    return routeText(this.language(), key)
  }
  protected reload() {
    this.store.loadList()
  }
}
