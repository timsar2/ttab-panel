import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormField, form } from '@angular/forms/signals'
import { ActivatedRoute, Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { SignalInput } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import {
  USER_CAN_MANAGE,
  USER_COMPANY_ID,
  USER_FEATURE,
  USER_LANGUAGE,
  UserRow,
  userHttp,
  userSearch,
} from './users.routes'

const emptyRows: readonly UserRow[] = []

@Component({
  selector: 'lib-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTable, FormField, SignalInput, HlmButton, HlmFieldImports],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="rtl() ? 'rtl' : 'ltr'">
      <header class="mb-6">
        <h1 class="text-2xl font-semibold">{{ heading() }}</h1>
        <p class="text-muted-foreground mt-1">
          {{
            rtl()
              ? 'مدیریت اطلاعات تماس کاربران شرکت'
              : 'Company-scoped personal and contact records'
          }}
        </p>
      </header>
      @if (!canManage()) {
        <p role="alert">
          {{ rtl() ? 'دسترسی مجاز نیست.' : 'You are not authorized to manage users.' }}
        </p>
      } @else {
        <form class="mb-6 grid items-end gap-3 sm:grid-cols-3" (submit)="search($event)">
          <div hlmField>
            <label hlmFieldLabel for="user-name">{{ rtl() ? 'نام کامل' : 'Full name' }}</label>
            <input
              libSignalInput
              id="user-name"
              type="search"
              class="min-h-11"
              [formField]="searchForm.fullName"
            />
          </div>
          <div hlmField>
            <label hlmFieldLabel for="user-national-id">{{
              rtl() ? 'کد ملی' : 'National ID'
            }}</label>
            <input
              libSignalInput
              id="user-national-id"
              type="search"
              class="min-h-11"
              [formField]="searchForm.nationalId"
            />
          </div>
          <button hlmBtn type="submit" variant="outline" class="min-h-11">
            {{ rtl() ? 'جستجو' : 'Search' }}
          </button>
        </form>
        <lib-data-table
          [rows]="rows()"
          [columns]="columns()"
          [rowId]="rowId"
          [rowLabel]="rowLabel"
          [caption]="heading()"
          [loading]="loading()"
          [error]="error()"
          [page]="page()"
          [actionLabel]="rtl() ? 'نمایش' : 'View details'"
          (rowAction)="open($event)"
          (pageChange)="changePage($event)"
          (retry)="load()"
          [loadingLabel]="rtl() ? 'در حال بارگذاری...' : 'Loading users...'"
          [emptyLabel]="rtl() ? 'کاربری یافت نشد.' : 'No users found.'"
        />
      }
    </main>
  `,
})
export class UsersPage {
  protected readonly config = inject(USER_FEATURE)
  private readonly companyId = inject(USER_COMPANY_ID)
  protected readonly canManage = inject(USER_CAN_MANAGE)
  private readonly language = inject(USER_LANGUAGE)
  private readonly http = userHttp()
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly draft = signal({ fullName: '', nationalId: '' })
  protected readonly searchForm = form(this.draft)
  protected readonly rows = signal<readonly UserRow[]>(emptyRows)
  protected readonly loading = signal(false)
  protected readonly error = signal<string | null>(null)
  private readonly pageIndex = signal(0)
  private readonly pageSize = signal(10)
  private readonly totalPages = signal(0)
  private readonly hasPreviousPage = signal(false)
  private readonly hasNextPage = signal(false)
  private request = 0
  protected readonly rtl = computed(() => this.language() === 'fa')
  protected readonly heading = computed(() =>
    this.rtl() ? 'کاربران' : (this.config.heading ?? 'Users'),
  )
  protected readonly columns = computed<readonly DataTableColumn<UserRow>[]>(() => [
    {
      accessorKey: 'fullName',
      header: this.rtl() ? 'نام' : 'Name',
      cell: cell => cell.getValue() ?? '-',
    },
    {
      accessorKey: 'nationalId',
      header: this.rtl() ? 'کد ملی' : 'National ID',
      cell: cell => cell.getValue() ?? '-',
    },
  ])
  protected readonly rowId = (row: UserRow) => String(row.id)
  protected readonly rowLabel = (row: UserRow) => row.fullName ?? `User ${row.id}`
  protected readonly page = computed<DataTablePage>(() => ({
    pageIndex: this.pageIndex(),
    pageSize: this.pageSize(),
    totalPages: this.totalPages(),
    hasPreviousPage: this.hasPreviousPage(),
    hasNextPage: this.hasNextPage(),
  }))

  constructor() {
    void this.load()
  }

  protected async load() {
    const companyId = this.companyId()
    const request = ++this.request
    if (!this.canManage() || companyId === null) {
      this.rows.set(emptyRows)
      this.error.set(this.rtl() ? 'دسترسی شرکت تأیید نشده است.' : 'Company access is unavailable.')
      return
    }
    this.loading.set(true)
    this.error.set(null)
    try {
      const response = await firstValueFrom(
        userSearch(this.http, this.config, {
          companyId,
          ...this.draft(),
          pageNumber: this.pageIndex() + 1,
          pageSize: this.pageSize(),
        }),
      )
      if (request !== this.request) return
      const result = response.result
      this.rows.set(result.list)
      this.totalPages.set(result.pagination.totalPages)
      this.hasPreviousPage.set(result.pagination.hasPreviousPage)
      this.hasNextPage.set(result.pagination.hasNextPage)
    } catch {
      if (request === this.request)
        this.error.set(this.rtl() ? 'بارگذاری کاربران ناموفق بود.' : 'Unable to load users.')
    } finally {
      if (request === this.request) this.loading.set(false)
    }
  }
  protected search(event: Event) {
    event.preventDefault()
    this.pageIndex.set(0)
    void this.load()
  }
  protected changePage(page: { pageIndex: number; pageSize: number }) {
    this.pageIndex.set(page.pageIndex)
    this.pageSize.set(page.pageSize)
    void this.load()
  }
  protected open(user: UserRow) {
    void this.router.navigate([user.id], { relativeTo: this.route })
  }
}
