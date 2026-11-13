import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import {
  SchedulingApi,
  SchedulingStore,
  ShiftListItem,
} from '@org/transport-scheduling-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { HlmButton } from '@spartan-ng/helm/button'
import { SHIFT_LANGUAGE, SHIFT_MANAGE } from '../shift.routes'
import { ShiftLanguage, shiftText } from '../shift-i18n'

export function shiftTableColumns(
  language: ShiftLanguage,
): readonly DataTableColumn<ShiftListItem>[] {
  const t = (key: Parameters<typeof shiftText>[1]) => shiftText(language, key)
  return [
    { accessorKey: 'name', header: t('name') },
    { accessorKey: 'shiftGroupName', header: t('group') },
    { accessorKey: 'startTime', header: t('startTime') },
    { accessorKey: 'entranceShiftTimeName', header: t('outbound') },
    { accessorKey: 'returnShiftTimeName', header: t('return') },
    { accessorKey: 'endTime', header: t('endTime') },
    { accessorKey: 'orderNo', header: t('order') },
  ]
}

@Component({
  selector: 'lib-shift-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTable, RouterLink, HlmButton],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold">{{ t('title') }}</h1>
          <p class="text-muted-foreground mt-2">
            {{ t('description') }}
          </p>
        </div>
        @if (canManage()) {
          <a hlmBtn class="min-h-11" routerLink="add">{{ t('addShift') }}</a>
        }
      </header>
      <lib-data-table
        [rows]="rows()"
        [columns]="columns()"
        [rowId]="rowId"
        [rowLabel]="rowLabel"
        [caption]="t('listCaption')"
        [loading]="loading()"
        [error]="tableError()"
        [loadingLabel]="t('loading')"
        [emptyLabel]="t('empty')"
        [errorTitle]="t('loadFailed')"
        [retryLabel]="t('retry')"
        [actionHeading]="t('actionHeading')"
        [pagingLabel]="t('paging')"
        [pageLabel]="t('page')"
        [previousLabel]="t('previous')"
        [nextLabel]="t('next')"
        [page]="page()"
        [showPagination]="false"
        [rowActions]="canManage() ? actions : null"
        (retry)="reload()"
      />
      <ng-template #actions let-item>
        <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['detail', item.id]">
          {{ t('details') }}
        </a>
      </ng-template>
    </main>
  `,
})
export class ShiftPage {
  protected readonly language = inject(SHIFT_LANGUAGE)
  protected readonly canManage = inject(SHIFT_MANAGE)
  protected readonly store = inject(SchedulingStore)
  private readonly api = inject(SchedulingApi)
  protected readonly rows = this.store.shifts
  protected readonly loading = this.store.loading
  protected readonly tableError = computed(() =>
    this.store.error() ? this.t('requestFailed') : null,
  )
  protected readonly columns = computed(() => shiftTableColumns(this.language()))
  protected readonly rowId = (row: ShiftListItem) => String(row.id)
  protected readonly rowLabel = (row: ShiftListItem) => row.name
  protected readonly page = computed<DataTablePage>(() => ({
    pageIndex: 0,
    pageSize: Math.max(1, this.rows().length),
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  }))

  constructor() {
    effect(() => {
      this.api.companyId()
      untracked(() => this.store.load())
    })
  }

  protected reload() {
    this.store.load()
  }

  protected t(key: Parameters<typeof shiftText>[1]) {
    return shiftText(this.language(), key)
  }
}
