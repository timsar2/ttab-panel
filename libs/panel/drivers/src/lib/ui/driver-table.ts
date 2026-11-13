import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { DriverRow } from '@org/transport-drivers-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { HlmButton } from '@spartan-ng/helm/button'
import { DRIVER_LANGUAGE } from '../driver.routes'
import { DRIVER_TEXT, driverText } from '../driver-text'
import type { BilingualText } from '@org/ui-forms'

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
      [caption]="localized(caption())"
      [loading]="loading()"
      [error]="error()"
      [page]="page()"
      [rowActions]="actionsTemplate()"
      [actionHeading]="text('actions')"
      [loadingLabel]="text('loadingRecords')"
      [emptyLabel]="text('noRecords')"
      [errorTitle]="text('unableLoadRecords')"
      [retryLabel]="text('retry')"
      [pagingLabel]="text('tablePages')"
      [pageLabel]="text('page')"
      [previousLabel]="text('previous')"
      [nextLabel]="text('next')"
      (pageChange)="pageChange.emit($event)"
      (retry)="retry.emit()"
    />
    <ng-template #name let-cell>
      @if (canManage()) {
        <a
          hlmBtn
          variant="link"
          class="min-h-11"
          [routerLink]="[cell.row.original.id]"
          queryParamsHandling="preserve"
          >{{ cell.row.original.fullName ?? text('driver') + ' ' + cell.row.original.id }}</a
        >
      } @else {
        <span>{{ cell.row.original.fullName ?? text('driver') + ' ' + cell.row.original.id }}</span>
      }
    </ng-template>
    <ng-template #driverActions let-driver>
      @if (canManage()) {
        <a
          hlmBtn
          variant="outline"
          class="min-h-11 min-w-11"
          [routerLink]="[driver.id]"
          queryParamsHandling="preserve"
          [attr.aria-label]="text('viewDetails') + ': ' + rowLabel(driver)"
          >{{ text('viewDetails') }}</a
        >
        <a
          hlmBtn
          variant="outline"
          class="min-h-11 min-w-11"
          [routerLink]="[driver.id, 'edit']"
          queryParamsHandling="preserve"
          [attr.aria-label]="text('editDriver') + ': ' + rowLabel(driver)"
          >{{ text('editDriver') }}</a
        >
      }
    </ng-template>
  `,
})
export class DriverTable {
  private readonly language = inject(DRIVER_LANGUAGE)
  readonly rows = input.required<readonly DriverRow[]>()
  readonly page = input.required<DataTablePage>()
  readonly caption = input<BilingualText>(DRIVER_TEXT.drivers)
  readonly loading = input(false)
  readonly error = input<string | null>(null)
  readonly canManage = input(false)
  readonly pageChange = output<{ pageIndex: number; pageSize: number }>()
  readonly retry = output<void>()

  protected readonly actionsTemplate =
    viewChild.required<TemplateRef<{ $implicit: DriverRow }>>('driverActions')
  protected readonly rowId = (row: DriverRow) => String(row.id)
  protected readonly rowLabel = (row: DriverRow) =>
    row.fullName ?? `${this.text('driver')} ${row.id}`
  private readonly nameCell =
    viewChild.required<TemplateRef<{ $implicit: { row: { original: DriverRow } } }>>('name')
  protected readonly columns = computed<readonly DataTableColumn<DriverRow>[]>(() => [
    { accessorKey: 'fullName', header: this.text('driver'), cell: () => this.nameCell() },
    {
      accessorKey: 'nationalId',
      header: this.text('nationalId'),
      cell: info => info.getValue() ?? '-',
    },
    {
      accessorKey: 'mobileNumber',
      header: this.text('mobile'),
      cell: info => info.getValue() ?? '-',
    },
    {
      accessorKey: 'driverLicenceLevelName',
      header: this.text('licenceServerLabel'),
      cell: info => info.getValue() ?? '-',
    },
  ])

  protected text(key: keyof typeof DRIVER_TEXT): string {
    return driverText(this.language(), key)
  }
  protected localized(value: BilingualText): string {
    return value[this.language()]
  }
}
