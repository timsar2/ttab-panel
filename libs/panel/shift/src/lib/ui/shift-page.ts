import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core'
import { RouterLink } from '@angular/router'
import { SchedulingApi, SchedulingStore, Shift } from '@org/transport-scheduling-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { HlmButton } from '@spartan-ng/helm/button'
import { SHIFT_LANGUAGE, SHIFT_MANAGE } from '../shift.routes'

const columns: readonly DataTableColumn<Shift>[] = [
  { accessorKey: 'name', header: 'Shift' },
  { accessorKey: 'shiftGroupName', header: 'Shift group' },
  { accessorKey: 'startTime', header: 'Start time' },
  { accessorKey: 'endTime', header: 'End time' },
]

@Component({
  selector: 'lib-shift-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTable, RouterLink, HlmButton],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold">{{ language() === 'fa' ? 'شیفت‌ها' : 'Shifts' }}</h1>
          <p class="text-muted-foreground mt-2">
            {{
              language() === 'fa'
                ? 'شیفت‌های تعریف‌شده برای شرکت انتخاب‌شده.'
                : 'Work shifts configured for the selected company.'
            }}
          </p>
        </div>
        @if (canManage()) {
          <a hlmBtn class="min-h-11" routerLink="add">{{
            language() === 'fa' ? 'افزودن شیفت' : 'Add shift'
          }}</a>
        }
      </header>
      @if (groups().length) {
        <section class="mb-5 flex flex-wrap gap-2" aria-label="Shift groups">
          @for (group of groups(); track group.id) {
            <span class="rounded-full border px-3 py-1 text-sm">{{ group.name }}</span>
          }
        </section>
      }
      <p class="text-muted-foreground mb-4" role="note">
        {{
          language() === 'fa'
            ? 'فهرست سرور حداکثر ۱۰۰۰ مورد دارد و تعداد کل را گزارش نمی‌کند.'
            : 'The server list is capped at 1,000 records and does not report a total count.'
        }}
      </p>
      <lib-data-table
        [rows]="rows()"
        [columns]="columns"
        [rowId]="rowId"
        [rowLabel]="rowLabel"
        [caption]="language() === 'fa' ? 'فهرست شیفت‌ها' : 'Shift list'"
        [loading]="loading()"
        [error]="error()"
        [page]="page"
        [showPagination]="false"
        [rowActions]="canManage() ? actions : null"
        (retry)="reload()"
      />
      <ng-template #actions let-item>
        <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['detail', item.id]">
          {{ language() === 'fa' ? 'جزئیات' : 'Details' }}
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
  protected readonly groups = this.store.groups
  protected readonly loading = this.store.loading
  protected readonly error = this.store.error
  protected readonly columns = columns
  protected readonly rowId = (row: Shift) => String(row.id)
  protected readonly rowLabel = (row: Shift) => row.name
  protected readonly page: DataTablePage = {
    pageIndex: 0,
    pageSize: 1000,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  }

  constructor() {
    effect(() => {
      this.api.companyId()
      untracked(() => this.store.load())
    })
  }

  protected reload() {
    this.store.load()
  }
}
