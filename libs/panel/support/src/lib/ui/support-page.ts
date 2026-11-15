import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import {
  SupportApi,
  SupportRow,
  SupportSearch,
  SupportSort,
  SupportStore,
} from '@org/transport-support-data-access'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import { HlmButton } from '@spartan-ng/helm/button'
import { SUPPORT_LANGUAGE } from '../support.routes'
import { supportText, type SupportTextKey } from '../support-text'

function numericParam(value: string | null, fallback: number): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return fallback
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : fallback
}

function parseQuery(params: URLSearchParams): SupportSearch {
  const requestedType = numericParam(params.get('type'), 2)
  const type = [1, 2, 3, 4].includes(requestedType) ? requestedType : 2
  const requestedPage = numericParam(params.get('page'), 1)
  const page = requestedPage <= 32767 ? requestedPage : 1
  const size = numericParam(params.get('size'), 10)
  const answered = params.get('answered')
  const sort = params.get('sort')
  const supportedSorts: readonly SupportSort[] = [
    'Id',
    'Id DESC',
    'Subject',
    'Subject DESC',
    'RequestDate',
    'RequestDate DESC',
  ]
  return {
    supportTypeId: type,
    fullName: params.get('q') ?? '',
    isAnswered: answered === 'true' ? true : answered === 'false' ? false : null,
    pageIndex: page - 1,
    pageSize: [10, 25, 50].includes(size) ? size : 10,
    sort: supportedSorts.includes(sort as SupportSort) ? (sort as SupportSort) : 'RequestDate DESC',
  }
}

@Component({
  selector: 'lib-support-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButton, DataTable],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <header class="mb-6">
      <h1 class="text-2xl font-semibold">{{ t('title') }}</h1>
      <p class="text-muted-foreground mt-2">{{ t('description') }}</p>
    </header>
    <form class="mb-6 grid gap-4 rounded-xl border p-4 md:grid-cols-4" (submit)="apply($event)">
      <label class="grid gap-2 text-sm">
        {{ t('type') }}
        <select
          class="bg-background min-h-11 rounded-md border px-3"
          [value]="type()"
          (change)="type.set(+$any($event.target).value)"
        >
          <option value="1">{{ t('type1') }}</option>
          <option value="2">{{ t('type2') }}</option>
          <option value="3">{{ t('type3') }}</option>
          <option value="4">{{ t('type4') }}</option>
        </select>
      </label>
      <label class="grid gap-2 text-sm">
        {{ t('answered') }}
        <select
          class="bg-background min-h-11 rounded-md border px-3"
          [value]="answered()"
          (change)="answered.set($any($event.target).value)"
        >
          <option value="">{{ t('allResponses') }}</option>
          <option value="true">{{ t('answeredOnly') }}</option>
          <option value="false">{{ t('unansweredOnly') }}</option>
        </select>
      </label>
      <label class="grid gap-2 text-sm md:col-span-2">
        {{ t('requester') }}
        <input
          class="bg-background min-h-11 rounded-md border px-3"
          maxlength="100"
          [attr.aria-label]="t('search')"
          [value]="queryText()"
          (input)="queryText.set($any($event.target).value)"
        />
      </label>
      <button hlmBtn class="min-h-11 md:col-span-4 md:justify-self-end" type="submit">
        {{ t('apply') }}
      </button>
    </form>
    @if (store.searchStatus() === 'denied') {
      <p role="alert">{{ t('denied') }}</p>
    } @else {
      <lib-data-table
        [rows]="rows()"
        [columns]="columns()"
        [rowId]="rowId"
        [rowLabel]="rowLabel"
        [caption]="t('title')"
        [loading]="store.searchStatus() === 'loading'"
        [error]="tableError()"
        [page]="tablePage()"
        [rowActions]="actionsTemplate()"
        [actionHeading]="t('open')"
        [loadingLabel]="t('loading')"
        [emptyLabel]="t('empty')"
        [errorTitle]="t('failed')"
        [retryLabel]="t('retry')"
        [pagingLabel]="t('title')"
        [pageLabel]="t('page')"
        [previousLabel]="t('previous')"
        [nextLabel]="t('next')"
        (pageChange)="changePage($event.pageIndex)"
        (retry)="reload()"
      />
      <ng-template #supportActions let-row>
        <a hlmBtn variant="outline" class="min-h-11" [routerLink]="[row.id]">{{ t('open') }}</a>
      </ng-template>
    }
  `,
})
export class SupportPage {
  protected readonly language = inject(SUPPORT_LANGUAGE)
  protected readonly store = inject(SupportStore)
  private readonly api = inject(SupportApi)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  })
  protected readonly query = computed(() => {
    const query = new URLSearchParams()
    for (const key of this.params().keys) {
      const value = this.params().get(key)
      if (value !== null) query.set(key, value)
    }
    return parseQuery(query)
  })
  protected readonly type = signal(2)
  protected readonly answered = signal('')
  protected readonly queryText = signal('')
  protected readonly rows = computed(() => this.store.page()?.items ?? [])
  protected readonly columns = computed<readonly DataTableColumn<SupportRow>[]>(() => [
    { accessorKey: 'subject', header: this.t('subject') },
    { accessorKey: 'fullName', header: this.t('requester'), cell: info => info.getValue() ?? '-' },
    {
      accessorKey: 'requestDate',
      header: this.t('requestDate'),
      cell: info => info.getValue() ?? '-',
    },
    {
      accessorKey: 'isAnswered',
      header: this.t('status'),
      cell: info => (info.getValue() ? this.t('answeredOnly') : this.t('unansweredOnly')),
    },
  ])
  protected readonly rowId = (row: SupportRow) => String(row.id)
  protected readonly rowLabel = (row: SupportRow) => row.subject
  protected readonly tablePage = computed<DataTablePage>(() => {
    const pagination = this.store.page()?.pagination
    return {
      pageIndex: this.query().pageIndex,
      pageSize: this.query().pageSize,
      totalPages: pagination?.totalPages ?? 0,
      hasPreviousPage: pagination?.hasPreviousPage ?? false,
      hasNextPage: pagination?.hasNextPage ?? false,
    }
  })
  protected readonly tableError = computed(() =>
    this.store.searchStatus() === 'error' ? this.t('failed') : null,
  )
  protected readonly actionsTemplate =
    viewChild.required<TemplateRef<{ $implicit: SupportRow }>>('supportActions')
  private readonly roleLanguage = this.language

  constructor() {
    effect(() => {
      this.api.companyId()
      const current = this.query()
      this.type.set(current.supportTypeId)
      this.answered.set(current.isAnswered == null ? '' : String(current.isAnswered))
      this.queryText.set(current.fullName)
      untracked(() => this.store.load(current))
    })
  }

  protected t(key: SupportTextKey): string {
    return supportText(this.roleLanguage(), key)
  }
  protected apply(event: Event) {
    event.preventDefault()
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: {
        type: this.type(),
        answered: this.answered() || null,
        q: this.queryText().trim() || null,
        page: 1,
      },
    })
  }
  protected changePage(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: { page: page + 1 },
    })
  }
  protected reload() {
    this.store.load(this.query())
  }
}
