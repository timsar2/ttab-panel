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
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { LineRow, LinesApi, LinesStore } from '@org/transport-lines-data-access'
import { RoutesStore } from '@org/transport-routes-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { HlmButton } from '@spartan-ng/helm/button'
import { LINE_FEATURE, LINE_LANGUAGE, LINE_MANAGE } from '../line.routes'
import { LINE_TEXT, lineText } from '../line-text'

export function linePageQuery(page: string | null, size: string | null) {
  const pageNumber = page && /^[1-9]\d*$/.test(page) ? Number(page) : 1
  return {
    pageIndex: Number.isSafeInteger(pageNumber) && pageNumber <= 2147483647 ? pageNumber - 1 : 0,
    pageSize: [10, 25, 50, 100].includes(Number(size)) ? Number(size) : 10,
  }
}

@Component({
  selector: 'lib-lines-page',
  imports: [DataTable, HlmButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-muted-foreground mb-1 text-sm">
            @if (routeStore.route(); as route) {
              {{ route.name }}
            } @else {
              {{ lineText(language(), 'route') }} #{{ directionId() ?? '-' }}
            }
          </p>
          <h1 class="text-2xl font-semibold">{{ lineText(language(), 'lines') }}</h1>
        </div>
        <div class="flex flex-wrap gap-2">
          @if (companyId() && directionId()) {
            <a
              hlmBtn
              variant="outline"
              class="min-h-11"
              [routerLink]="[
                '/client',
                companyId(),
                'direction',
                'detail',
                directionId(),
                'stations',
              ]"
              >{{ language() === 'fa' ? 'ایستگاه‌ها' : 'Stations' }}</a
            >
          }
          @if (canManage()) {
            <a hlmBtn class="min-h-11" [routerLink]="['add']">{{ lineText(language(), 'add') }}</a>
          }
        </div>
      </header>
      @if (!hasScope()) {
        <p role="alert" class="rounded-md border p-4">{{ deniedMessage() }}</p>
      } @else {
        <lib-data-table
          [rows]="store.page()?.items ?? emptyLines"
          [columns]="columns()"
          [rowId]="rowId"
          [rowLabel]="rowLabel"
          [caption]="lineText(language(), 'lines')"
          [page]="page()"
          [loading]="store.listLoading()"
          [error]="listError()"
          [rowActions]="actionsTemplate()"
          [actionHeading]="lineText(language(), 'actions')"
          [loadingLabel]="lineText(language(), 'loading')"
          [emptyLabel]="lineText(language(), 'empty')"
          [errorTitle]="lineText(language(), 'failed')"
          [retryLabel]="lineText(language(), 'retry')"
          [pagingLabel]="language() === 'fa' ? 'صفحه‌بندی خطوط' : 'Line pagination'"
          [pageLabel]="language() === 'fa' ? 'صفحه' : 'Page'"
          [previousLabel]="language() === 'fa' ? 'قبلی' : 'Previous'"
          [nextLabel]="language() === 'fa' ? 'بعدی' : 'Next'"
          (pageChange)="changePage($event)"
          (retry)="reload()"
        />
      }
    </main>
    <ng-template #actions let-line>
      <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['detail', line.id]">{{
        lineText(language(), 'edit')
      }}</a>
    </ng-template>
  `,
})
export class LinesPage {
  protected readonly feature = inject(LINE_FEATURE)
  protected readonly language = inject(LINE_LANGUAGE)
  protected readonly lineText = lineText
  protected readonly canManage = inject(LINE_MANAGE)
  protected readonly store = inject(LinesStore)
  protected readonly routeStore = inject(RoutesStore)
  private readonly api = inject(LinesApi)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly queryMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  })
  private readonly query = computed(() =>
    linePageQuery(this.queryMap().get('page'), this.queryMap().get('size')),
  )
  protected readonly emptyLines: readonly LineRow[] = []
  protected readonly companyId = this.store.companyId
  protected readonly directionId = this.store.directionId
  protected readonly actionsTemplate =
    viewChild.required<TemplateRef<{ $implicit: LineRow }>>('actions')
  protected readonly rowId = (line: LineRow) => String(line.id)
  protected readonly rowLabel = (line: LineRow) => line.name
  protected readonly columns = computed<readonly DataTableColumn<LineRow>[]>(() => [
    {
      accessorKey: 'name',
      header: lineText(this.language(), 'name'),
      cell: cell => cell.getValue(),
    },
    {
      accessorKey: 'entranceShiftTimeName',
      header: lineText(this.language(), 'outbound'),
      cell: cell => cell.getValue() ?? '-',
    },
    {
      accessorKey: 'returnShiftTimeName',
      header: lineText(this.language(), 'return'),
      cell: cell => cell.getValue() ?? '-',
    },
  ])
  protected readonly hasScope = computed(
    () => this.session.user() !== null && this.companyId() !== null && this.directionId() !== null,
  )
  protected readonly deniedMessage = computed(
    () => this.feature.deniedMessage?.[this.language()] ?? lineText(this.language(), 'denied'),
  )
  protected readonly listError = computed(() => {
    const error = this.store.listError()
    if (
      !this.hasScope() ||
      error?.code === 'lines-access-denied' ||
      error?.status === 401 ||
      error?.status === 403
    )
      return this.deniedMessage()
    return error ? lineText(this.language(), 'failed') : null
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
      const directionId = this.api.directionId()
      this.api.companyId()
      this.session.version()
      const query = this.query()
      untracked(() => {
        this.store.loadList(query)
        const route = this.routeStore.route()
        if (
          directionId &&
          (route?.id !== directionId || this.routeStore.detailStatus() !== 'ready')
        )
          this.routeStore.loadDetail(directionId)
      })
    })
  }

  protected reload() {
    this.store.loadList(this.query())
  }
  protected changePage(page: { pageIndex: number; pageSize: number }) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: { page: page.pageIndex + 1, size: page.pageSize },
    })
  }
}
