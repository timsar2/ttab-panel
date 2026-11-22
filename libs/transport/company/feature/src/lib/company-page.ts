import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormField, form } from '@angular/forms/signals'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { CompanyApi, CompanyRow, CompanySearchStore } from '@org/transport-company-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { SignalInput } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { COMPANY_FEATURE, COMPANY_LANGUAGE } from './company.routes'

const noRows: readonly CompanyRow[] = []
function pageNumber(value: string | null) {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : 1
}

@Component({
  selector: 'lib-company-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTable, FormField, SignalInput, RouterLink, HlmButton, HlmFieldImports],
  providers: [CompanyApi, CompanySearchStore],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-muted-foreground mb-1 text-sm">
            {{ language() === 'fa' ? 'مدیریت حمل‌ونقل' : 'Transport management' }}
          </p>
          <h1 class="text-2xl font-semibold">{{ config.heading ?? 'Companies' }}</h1>
          <p class="text-muted-foreground mt-2">
            {{
              language() === 'fa'
                ? 'فهرست شرکت‌ها و مجموعه‌های ثبت‌شده'
                : 'Search and manage registered companies'
            }}
          </p>
        </div>
        @if (canCreate()) {
          <a hlmBtn class="min-h-11" [routerLink]="['/' + config.path, 'new']">
            {{ language() === 'fa' ? 'افزودن شرکت' : 'Create company' }}
          </a>
        }
      </header>
      <form class="mb-6 flex flex-wrap items-end gap-3" (submit)="search($event)">
        <div hlmField class="w-full min-w-0 md:max-w-md md:flex-none">
          <label hlmFieldLabel for="company-search">{{
            language() === 'fa' ? 'نام شرکت' : 'Company name'
          }}</label>
          <input
            libSignalInput
            id="company-search"
            type="search"
            class="min-h-11"
            [formField]="searchForm.name"
          />
        </div>
        <button hlmBtn variant="outline" type="submit" class="min-h-11 min-w-11">
          {{ language() === 'fa' ? 'جستجو' : 'Search' }}
        </button>
      </form>
      <lib-data-table
        [direction]="language() === 'fa' ? 'rtl' : 'ltr'"
        [rowActions]="config.editor ? editorActions : null"
        [rows]="rows()"
        [columns]="columns()"
        [rowId]="rowId"
        [rowLabel]="rowLabel"
        [caption]="config.heading ?? 'Companies'"
        [loading]="store.loading()"
        [error]="error()"
        [page]="page()"
        [actionHeading]="language() === 'fa' ? 'عملیات' : 'Actions'"
        [loadingLabel]="language() === 'fa' ? 'در حال بارگذاری...' : 'Loading records...'"
        [emptyLabel]="language() === 'fa' ? 'شرکتی یافت نشد.' : 'No records found.'"
        [actionLabel]="
          config.onAction || config.actionCommands
            ? (config.actionLabel ?? (language() === 'fa' ? 'انتخاب' : 'Open'))
            : null
        "
        (rowAction)="openCompany($event)"
        (pageChange)="changePage($event)"
        (retry)="store.load(query())"
      />
    </main>
    <ng-template #editorActions let-company>
      @if (canEdit(company.id)) {
        <a
          hlmBtn
          variant="outline"
          class="min-h-11"
          [routerLink]="['/' + config.path, company.id, 'edit']"
          [attr.aria-label]="
            (language() === 'fa' ? 'ویرایش شرکت: ' : 'Edit company: ') + company.name
          "
          >{{ language() === 'fa' ? 'ویرایش' : 'Edit' }}</a
        >
      }
    </ng-template>
  `,
})
export class CompanyPage {
  protected readonly config = inject(COMPANY_FEATURE)
  protected readonly language = inject(COMPANY_LANGUAGE)
  protected readonly store = inject(CompanySearchStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly session = inject(SessionStore)
  protected readonly canCreate = computed(
    () => this.config.editor?.canCreate(this.session.user()?.roles ?? []) ?? false,
  )
  protected canEdit(id: number) {
    return this.config.editor?.canEdit(this.session.user()?.roles ?? [], id) ?? false
  }
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  })
  protected readonly query = computed(() => {
    const params = this.params()
    const requestedSize = Number(params.get('size'))
    return {
      name: params.get('name') ?? '',
      pageIndex: pageNumber(params.get('page')) - 1,
      pageSize: [10, 25, 50, 100].includes(requestedSize) ? requestedSize : 10,
    }
  })
  private readonly searchName = computed(() => this.query().name)
  private readonly draft = linkedSignal(() => ({ name: this.searchName() }))
  protected readonly searchForm = form(this.draft)
  protected readonly columns = computed<readonly DataTableColumn<CompanyRow>[]>(() => {
    const fa = this.language() === 'fa'
    return [
      { accessorKey: 'name', header: fa ? 'نام شرکت' : 'Company' },
      {
        accessorKey: 'companyTypeName',
        header: fa ? 'نوع' : 'Type',
        cell: cell => cell.getValue() ?? '-',
      },
      {
        accessorKey: 'provinceName',
        header: fa ? 'استان' : 'Province',
        cell: cell => cell.getValue() ?? '-',
      },
      {
        accessorKey: 'cityName',
        header: fa ? 'شهر' : 'City',
        cell: cell => cell.getValue() ?? '-',
      },
    ]
  })
  protected readonly rowId = (row: CompanyRow) => String(row.id)
  protected readonly rowLabel = (row: CompanyRow) => row.name
  protected readonly rows = computed(() => this.store.page()?.items ?? noRows)
  protected readonly error = computed(() => {
    const error = this.store.error()
    return error?.status === 401 || error?.status === 403
      ? 'You do not have access to company search.'
      : (error?.message ?? null)
  })
  protected readonly page = computed<DataTablePage>(() => {
    const pagination = this.store.page()?.pagination
    return {
      pageIndex: this.query().pageIndex,
      pageSize: this.query().pageSize,
      totalPages: pagination?.totalPages ?? 0,
      hasPreviousPage: pagination?.hasPreviousPage ?? false,
      hasNextPage: pagination?.hasNextPage ?? false,
    }
  })

  constructor() {
    effect(() => this.store.load(this.query()))
  }

  protected search(event: Event) {
    event.preventDefault()
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { name: this.draft().name.trim() || null, page: 1 },
      queryParamsHandling: 'merge',
    })
  }

  protected changePage(page: { pageIndex: number; pageSize: number }) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page.pageIndex + 1, size: page.pageSize },
      queryParamsHandling: 'merge',
    })
  }

  protected openCompany(company: CompanyRow) {
    this.config.onAction?.(company)
    const commands = this.config.actionCommands?.(company)
    if (commands) void this.router.navigate([...commands])
  }
}
