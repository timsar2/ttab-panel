import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { DriverRow } from '@org/transport-drivers-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { HlmButton } from '@spartan-ng/helm/button'

/** Reusable driver table wrapper. Paging remains server-owned by the caller. */
@Component({
  selector: 'lib-driver-table',
  imports: [DataTable, HlmButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-data-table
      [rows]="rows()"
      [columns]="columns()"
      [rowId]="rowId"
      [rowLabel]="rowLabel"
      [caption]="caption()"
      [loading]="loading()"
      [error]="error()"
      [page]="page()"
      [rowActions]="actionsTemplate()"
      (pageChange)="pageChange.emit($event)"
      (retry)="retry.emit()"
    />
    <ng-template #name let-cell>
      <a
        hlmBtn
        variant="link"
        class="min-h-11"
        [routerLink]="[cell.row.original.id]"
        queryParamsHandling="preserve"
        >{{ cell.row.original.fullName ?? 'Driver ' + cell.row.original.id }}</a
      >
    </ng-template>
    <ng-template #driverActions let-driver>
      <a
        hlmBtn
        variant="outline"
        class="min-h-11 min-w-11"
        [routerLink]="[driver.id]"
        queryParamsHandling="preserve"
        [attr.aria-label]="viewLabel() + ': ' + rowLabel(driver)"
        >{{ viewLabel() }}</a
      >
      @if (canManage()) {
        <a
          hlmBtn
          variant="outline"
          class="min-h-11 min-w-11"
          [routerLink]="[driver.id, 'edit']"
          queryParamsHandling="preserve"
          [attr.aria-label]="editLabel() + ': ' + rowLabel(driver)"
          >{{ editLabel() }}</a
        >
      }
    </ng-template>
  `,
})
export class DriverTable {
  readonly rows = input.required<readonly DriverRow[]>()
  readonly page = input.required<DataTablePage>()
  readonly caption = input('Drivers')
  readonly loading = input(false)
  readonly error = input<string | null>(null)
  readonly canManage = input(false)
  readonly viewLabel = input('View details')
  readonly editLabel = input('Edit driver')
  readonly pageChange = output<{ pageIndex: number; pageSize: number }>()
  readonly retry = output<void>()

  protected readonly actionsTemplate =
    viewChild.required<TemplateRef<{ $implicit: DriverRow }>>('driverActions')
  protected readonly rowId = (row: DriverRow) => String(row.id)
  protected readonly rowLabel = (row: DriverRow) => row.fullName ?? `Driver ${row.id}`
  private readonly nameCell =
    viewChild.required<TemplateRef<{ $implicit: { row: { original: DriverRow } } }>>('name')
  protected readonly columns = computed<readonly DataTableColumn<DriverRow>[]>(() => [
    { accessorKey: 'fullName', header: 'Driver', cell: () => this.nameCell() },
    { accessorKey: 'nationalId', header: 'National ID', cell: info => info.getValue() ?? '-' },
    { accessorKey: 'mobileNumber', header: 'Mobile', cell: info => info.getValue() ?? '-' },
    {
      accessorKey: 'driverLicenceLevelName',
      header: 'Licence (server label)',
      cell: info => info.getValue() ?? '-',
    },
  ])
}
