import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmTableImports } from '@spartan-ng/helm/table'
import {
  ColumnDef,
  FlexRender,
  injectTable,
  rowPaginationFeature,
  tableFeatures,
} from '@tanstack/angular-table'

export const serverTableFeatures = tableFeatures({ rowPaginationFeature })
export type DataTableColumn<T extends object> = ColumnDef<typeof serverTableFeatures, T>

export interface DataTablePage {
  readonly pageIndex: number
  readonly pageSize: number
  readonly totalPages: number
  readonly hasPreviousPage: boolean
  readonly hasNextPage: boolean
}

/** Server rows only: no local filtering, sorting, or implicit cross-page selection. */
@Component({
  selector: 'lib-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FlexRender, HlmTableImports, HlmButton, HlmAlertImports],
  host: { class: 'block min-w-0' },
  template: `
    @if (error(); as error) {
      <div hlmAlert variant="destructive" role="alert">
        <h3 hlmAlertTitle>{{ errorTitle() }}</h3>
        <p hlmAlertDescription>{{ error }}</p>
        <button
          hlmBtn
          variant="outline"
          type="button"
          class="min-h-11 min-w-11"
          (click)="retry.emit()"
        >
          {{ retryLabel() }}
        </button>
      </div>
    }
    <div
      hlmTableContainer
      role="region"
      [attr.aria-label]="caption()"
      tabindex="0"
      [attr.aria-busy]="loading()"
    >
      <table hlmTable>
        <caption hlmCaption>
          {{
            caption()
          }}
        </caption>
        <thead hlmTHead>
          @for (group of table.getHeaderGroups(); track group.id) {
            <tr hlmTr>
              @for (header of group.headers; track header.id) {
                <th hlmTh scope="col" [attr.colspan]="header.colSpan">
                  <ng-container *flexRenderHeader="header; let value">{{ value }}</ng-container>
                </th>
              }
              @if (actionLabel()) {
                <th hlmTh scope="col">{{ actionHeading() }}</th>
              }
            </tr>
          }
        </thead>
        <tbody hlmTBody>
          @if (loading()) {
            <tr hlmTr>
              <td hlmTd [attr.colspan]="columnCount()" role="status">{{ loadingLabel() }}</td>
            </tr>
          } @else if (!error()) {
            @for (row of table.getRowModel().rows; track row.id) {
              <tr hlmTr [attr.data-row-id]="row.id">
                @for (cell of row.getAllCells(); track cell.id) {
                  <td hlmTd>
                    <ng-container *flexRenderCell="cell; let value">{{ value }}</ng-container>
                  </td>
                }
                @if (actionLabel(); as label) {
                  <td hlmTd>
                    <button
                      hlmBtn
                      class="min-h-11 min-w-11"
                      variant="outline"
                      type="button"
                      [attr.aria-label]="label + ': ' + rowLabel()(row.original)"
                      (click)="rowAction.emit(row.original)"
                    >
                      {{ label }}
                    </button>
                  </td>
                }
              </tr>
            } @empty {
              <tr hlmTr>
                <td hlmTd [attr.colspan]="columnCount()" role="status">{{ emptyLabel() }}</td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
    <nav
      class="mt-4 flex flex-wrap items-center justify-end gap-3"
      [attr.aria-label]="pagingLabel()"
    >
      <span aria-live="polite">{{ pageLabel() }} {{ page().pageIndex + 1 }}</span>
      <button
        hlmBtn
        class="min-h-11 min-w-11"
        variant="outline"
        type="button"
        [disabled]="loading() || !!error() || !page().hasPreviousPage"
        (click)="pageChange.emit({ pageIndex: page().pageIndex - 1, pageSize: page().pageSize })"
      >
        {{ previousLabel() }}
      </button>
      <button
        hlmBtn
        class="min-h-11 min-w-11"
        variant="outline"
        type="button"
        [disabled]="loading() || !!error() || !page().hasNextPage"
        (click)="pageChange.emit({ pageIndex: page().pageIndex + 1, pageSize: page().pageSize })"
      >
        {{ nextLabel() }}
      </button>
    </nav>
  `,
})
export class DataTable<T extends object> {
  readonly rows = input.required<readonly T[]>()
  readonly columns = input.required<readonly DataTableColumn<T>[]>()
  readonly rowId = input.required<(row: T) => string>()
  readonly rowLabel = input<(row: T) => string>(() => '')
  readonly page = input.required<DataTablePage>()
  readonly caption = input.required<string>()
  readonly loading = input(false)
  readonly error = input<string | null>(null)
  readonly actionLabel = input<string | null>(null)
  readonly actionHeading = input('Actions')
  readonly loadingLabel = input('Loading records...')
  readonly emptyLabel = input('No records found.')
  readonly errorTitle = input('Unable to load records')
  readonly retryLabel = input('Retry')
  readonly pagingLabel = input('Table pages')
  readonly pageLabel = input('Page')
  readonly previousLabel = input('Previous')
  readonly nextLabel = input('Next')
  readonly pageChange = output<{ pageIndex: number; pageSize: number }>()
  readonly rowAction = output<T>()
  readonly retry = output<void>()
  protected readonly columnCount = computed(
    () => this.columns().length + (this.actionLabel() ? 1 : 0),
  )
  protected readonly table = injectTable(() => ({
    features: serverTableFeatures,
    columns: this.columns(),
    data: this.rows(),
    getRowId: row => this.rowId()(row),
    manualPagination: true,
    pageCount: this.page().totalPages,
    state: { pagination: { pageIndex: this.page().pageIndex, pageSize: this.page().pageSize } },
    onPaginationChange: next => {
      const current = { pageIndex: this.page().pageIndex, pageSize: this.page().pageSize }
      this.pageChange.emit(typeof next === 'function' ? next(current) : next)
    },
  }))
}
