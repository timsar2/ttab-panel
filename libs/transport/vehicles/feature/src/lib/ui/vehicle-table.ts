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
import { VehicleRow } from '@org/transport-vehicles-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { HlmButton } from '@spartan-ng/helm/button'
import { VEHICLE_LANGUAGE } from '../vehicle.routes'
import { VEHICLE_TEXT, vehicleText } from '../vehicle-text'

@Component({
  selector: 'lib-vehicle-table',
  imports: [DataTable, HlmButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-data-table
      [rows]="rows()"
      [columns]="columns()"
      [rowId]="rowId"
      [rowLabel]="rowLabel"
      [caption]="text('vehicles')"
      [loading]="loading()"
      [error]="error()"
      [page]="page()"
      [rowActions]="actionsTemplate()"
      [actionHeading]="language() === 'fa' ? 'عملیات' : 'Actions'"
      [loadingLabel]="text('loading')"
      [emptyLabel]="text('noVehicles')"
      [errorTitle]="text('loadFailed')"
      [retryLabel]="text('retry')"
      [pagingLabel]="language() === 'fa' ? 'صفحه‌بندی خودروها' : 'Vehicle pagination'"
      [pageLabel]="language() === 'fa' ? 'صفحه' : 'Page'"
      [previousLabel]="language() === 'fa' ? 'قبلی' : 'Previous'"
      [nextLabel]="language() === 'fa' ? 'بعدی' : 'Next'"
      (pageChange)="pageChange.emit($event)"
      (retry)="retry.emit()"
    />
    <ng-template #plate let-cell>
      <div class="flex min-w-0 items-center gap-3">
        @if (cell.row.original.carImage; as image) {
          <img
            class="h-12 w-16 shrink-0 rounded-md border object-cover"
            [src]="image"
            alt=""
            loading="lazy"
            referrerpolicy="no-referrer"
          />
        } @else {
          <span
            class="bg-muted text-muted-foreground flex h-12 w-16 shrink-0 items-center justify-center rounded-md border text-xs"
            aria-hidden="true"
            >{{ text('vehicle') }}</span
          >
        }
        @if (canManage()) {
          <a
            hlmBtn
            variant="link"
            class="min-h-11 min-w-0 px-1 text-start"
            [routerLink]="[cell.row.original.id]"
            queryParamsHandling="preserve"
            >{{ cell.row.original.carPlate }}</a
          >
        } @else {
          <span>{{ cell.row.original.carPlate }}</span>
        }
      </div>
    </ng-template>
    <ng-template #actions let-vehicle>
      <div class="flex flex-wrap gap-2">
        <a
          hlmBtn
          variant="outline"
          class="min-h-11"
          [routerLink]="[vehicle.id]"
          queryParamsHandling="preserve"
          >{{ language() === 'fa' ? 'جزئیات' : 'Details' }}</a
        >
        @if (canManage()) {
          <a
            hlmBtn
            variant="outline"
            class="min-h-11"
            [routerLink]="[vehicle.id, 'edit']"
            queryParamsHandling="preserve"
            >{{ text('editCar') }}</a
          >
        }
      </div>
    </ng-template>
  `,
})
export class VehicleTable {
  protected readonly language = inject(VEHICLE_LANGUAGE)
  readonly rows = input.required<readonly VehicleRow[]>()
  readonly page = input.required<DataTablePage>()
  readonly loading = input(false)
  readonly error = input<string | null>(null)
  readonly canManage = input(false)
  readonly pageChange = output<{ pageIndex: number; pageSize: number }>()
  readonly retry = output<void>()
  protected readonly actionsTemplate =
    viewChild.required<TemplateRef<{ $implicit: VehicleRow }>>('actions')
  private readonly plateCell =
    viewChild.required<TemplateRef<{ $implicit: { row: { original: VehicleRow } } }>>('plate')
  protected readonly rowId = (row: VehicleRow) => String(row.id)
  protected readonly rowLabel = (row: VehicleRow) => row.carPlate
  protected readonly columns = computed<readonly DataTableColumn<VehicleRow>[]>(() => [
    { accessorKey: 'carPlate', header: this.text('carPlate'), cell: () => this.plateCell() },
    { accessorKey: 'fullName', header: this.text('driver'), cell: cell => cell.getValue() ?? '-' },
    {
      accessorKey: 'carTypeName',
      header: this.text('vehicleType'),
      cell: cell => cell.getValue() ?? '-',
    },
    {
      accessorKey: 'produnctionYear',
      header: this.text('produnctionYear'),
      cell: cell => cell.getValue() ?? '-',
    },
    {
      accessorKey: 'capacity',
      header: this.text('capacity'),
      cell: cell => cell.getValue() ?? '-',
    },
    {
      accessorKey: 'companyName',
      header: this.language() === 'fa' ? 'شرکت' : 'Company',
      cell: cell => cell.getValue() ?? '-',
    },
  ])

  protected text(key: keyof typeof VEHICLE_TEXT): string {
    return vehicleText(this.language(), key)
  }
}
