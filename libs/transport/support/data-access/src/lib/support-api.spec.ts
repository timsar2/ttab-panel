import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { EnvironmentInjector, createEnvironmentInjector, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { EMPTY, Observable, Subject, filter, firstValueFrom, of, takeUntil } from 'rxjs'
import {
  SUPPORT_ACCESS_DENIED,
  SupportApi,
  SupportAuthorize,
  SupportCompanyId,
  SupportDataConfig,
  SupportSearch,
  SupportStore,
  provideSupportData,
  supportCompanyId,
  supportId,
} from '../index'

const row = {
  id: 7,
  companyId: 2,
  supportTypeId: 4,
  supportTypeName: null,
  personId: 70000,
  fullName: 'Name',
  mobileNumber: null,
  requestDate: '2026-11-10T12:30:00',
  subject: 'Subject',
  isAnswered: false,
}
const detail = { ...row, caseFile: [] }
const query: SupportSearch = { supportTypeId: 4, fullName: '', pageIndex: 0, pageSize: 10 }
const envelope = <T>(result: T) => ({ code: '2000', massage: null, result })
const page = (list: unknown[] = [row]) =>
  envelope({
    list,
    pagination: {
      currentPage: 1,
      pageSize: 10,
      totalPages: list.length ? 1 : 0,
      totalCount: list.length,
      hasPreviousPage: false,
      hasNextPage: false,
    },
  })
const collection = '/alternate/api/v1/support'
const searchPath = `${collection}/search`

describe('SupportApi and scoped read store', () => {
  let http: HttpTestingController
  let api: SupportApi
  let store: InstanceType<typeof SupportStore>
  let company: ReturnType<typeof signal<SupportCompanyId | null>>
  let user: ReturnType<typeof signal<{ id: string } | null>>
  let version: ReturnType<typeof signal<number>>
  let changes: Subject<number>
  let access: ReturnType<typeof vi.fn<SupportAuthorize>>
  let config: SupportDataConfig
  beforeEach(() => {
    company = signal<SupportCompanyId | null>(supportCompanyId(2))
    user = signal<{ id: string } | null>({ id: 'identity-is-not-person-id' })
    version = signal(1)
    changes = new Subject<number>()
    access = vi.fn<SupportAuthorize>(() => of(true))
    config = {
      apiUrl: '/alternate/api',
      endpoints: { collection: 'v1/support', search: 'v1/support/search' },
      company: () => company,
      access: () => access,
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionStore,
          useValue: {
            user,
            version,
            changes$: changes,
            untilChanged:
              (at: number) =>
              <T>(source: Observable<T>) =>
                source.pipe(takeUntil(changes.pipe(filter(() => version() !== at)))),
          },
        },
        provideSupportData(config),
        SupportStore,
      ],
    })
    http = TestBed.inject(HttpTestingController)
    api = TestBed.inject(SupportApi)
    store = TestBed.inject(SupportStore)
    TestBed.tick()
  })
  afterEach(() => http.verify())

  it.each([false, undefined, 'true', 1])(
    'fails closed for non-boolean approval %s',
    async value => {
      access.mockReturnValue(of(value as boolean))
      await expect(firstValueFrom(api.search(query))).rejects.toMatchObject({
        code: SUPPORT_ACCESS_DENIED,
      })
      http.expectNone(() => true)
    },
  )
  it('fails closed with empty, throwing and non-observable policies', async () => {
    access.mockReturnValue(EMPTY)
    await expect(firstValueFrom(api.search(query))).rejects.toMatchObject({
      code: SUPPORT_ACCESS_DENIED,
    })
    access.mockImplementation(() => {
      throw new Error('private diagnostics')
    })
    await expect(firstValueFrom(api.search(query))).rejects.toMatchObject({ kind: 'contract' })
    access.mockReturnValue(true as unknown as Observable<boolean>)
    await expect(firstValueFrom(api.search(query))).rejects.toMatchObject({ kind: 'contract' })
    http.expectNone(() => true)
  })
  it('requires company and authenticated session even for global-looking identities', async () => {
    company.set(null)
    await expect(firstValueFrom(api.detail(supportId(7)))).rejects.toMatchObject({
      code: SUPPORT_ACCESS_DENIED,
    })
    company.set(supportCompanyId(2))
    user.set(null)
    await expect(firstValueFrom(api.search(query))).rejects.toMatchObject({
      code: SUPPORT_ACCESS_DENIED,
    })
    expect(access).not.toHaveBeenCalled()
    http.expectNone(() => true)
  })
  it('uses configured POST search, explicit supported filters and private HTTP options', async () => {
    const mutable = {
      ...query,
      fullName: ' Name ',
      pageIndex: 1,
      sort: 'Subject DESC' as const,
      personId: 70000,
      isAnswered: false,
      invented: 'ignored',
    }
    const result = firstValueFrom(api.search(mutable))
    mutable.fullName = 'Changed'
    const request = http.expectOne(searchPath)
    expect(request.request.method).toBe('POST')
    expect(request.request.transferCache).toBe(false)
    expect(request.request.credentials).toBe('omit')
    expect(request.request.redirect).toBe('error')
    expect(request.request.body).toEqual({
      companyId: 2,
      supportTypeId: 4,
      fullName: 'Name',
      personId: 70000,
      isAnswered: false,
      pageNumber: 2,
      pageSize: 10,
      orderBy: ['Subject DESC'],
    })
    const response = page()
    response.result.pagination.currentPage = 2
    response.result.pagination.hasPreviousPage = true
    response.result.pagination.totalCount = 11
    response.result.pagination.totalPages = 2
    request.flush(response)
    expect((await result).items[0].id).toBe(7)
    expect(access).toHaveBeenCalledWith({ action: 'search', companyId: 2 })
  })
  it('snapshots before pending access decision and accepts only its first decision', async () => {
    const decision = new Subject<boolean>()
    access.mockReturnValue(decision)
    const mutable = { ...query, fullName: 'Original' }
    const result = firstValueFrom(api.search(mutable))
    mutable.fullName = 'Later'
    http.expectNone(() => true)
    decision.next(true)
    decision.next(true)
    const request = http.expectOne(searchPath)
    expect(request.request.body.fullName).toBe('Original')
    request.flush(page())
    expect((await result).items).toHaveLength(1)
  })
  it.each([
    { supportTypeId: 0 },
    { pageSize: 101 },
    { pageIndex: -1 },
    { sort: 'FullName' },
    { fullName: 'x'.repeat(101) },
  ])('rejects invalid search before HTTP %j', async patch => {
    await expect(
      firstValueFrom(api.search({ ...query, ...patch } as SupportSearch)),
    ).rejects.toBeDefined()
    http.expectNone(() => true)
  })
  it('rejects invalid detail IDs without making requests', async () => {
    await expect(
      firstValueFrom(api.detail(0 as ReturnType<typeof supportId>)),
    ).rejects.toBeDefined()
    http.expectNone(() => true)
  })
  it('uses requested support ID, validates company membership and decodes only real detail DTO', async () => {
    const result = firstValueFrom(api.detail(supportId(7)))
    const request = http.expectOne(`${collection}/7`)
    expect(request.request.method).toBe('GET')
    request.flush(envelope(detail))
    expect((await result)?.id).toBe(7)
    expect(access).toHaveBeenCalledWith({ action: 'detail', companyId: 2, id: 7 })
    for (const patch of [{ id: 8 }, { companyId: 3 }]) {
      const failure = firstValueFrom(api.detail(supportId(7)))
      const assertion = expect(failure).rejects.toMatchObject({ kind: 'contract' })
      http.expectOne(`${collection}/7`).flush(envelope({ ...detail, ...patch }))
      await assertion
    }
  })
  it.each([401, 403, 404, 422, 500])(
    'surfaces HTTP %s without automatic retry or mutation',
    async status => {
      const result = firstValueFrom(api.detail(supportId(7)))
      const failure = expect(result).rejects.toMatchObject({ status })
      http
        .expectOne(`${collection}/7`)
        .flush({ messages: ['Backend diagnostic'] }, { status, statusText: 'Failure' })
      await failure
      http.expectNone(() => true)
    },
  )
  it('handles null detail and structured envelope failures', async () => {
    const missing = firstValueFrom(api.detail(supportId(7)))
    http.expectOne(`${collection}/7`).flush(envelope(null))
    expect(await missing).toBeNull()
    const rejected = firstValueFrom(api.search(query))
    const failure = expect(rejected).rejects.toMatchObject({ kind: 'business', code: '4000' })
    http.expectOne(searchPath).flush({ code: '4000', massage: 'Read denied', result: null })
    await failure
  })
  it.each(['company', 'session'] as const)('cancels pending access on %s change', changed => {
    const decision = new Subject<boolean>()
    access.mockReturnValue(decision)
    const next = vi.fn()
    const error = vi.fn()
    api.search(query).subscribe({ next, error })
    if (changed === 'company') {
      company.set(supportCompanyId(3))
      TestBed.tick()
    } else {
      version.set(2)
      changes.next(2)
    }
    decision.next(true)
    expect(next).not.toHaveBeenCalled()
    http.expectNone(() => true)
  })
  it('cancels in-flight HTTP on company change and store destruction', () => {
    store.load(query)
    const request = http.expectOne(searchPath)
    company.set(supportCompanyId(3))
    TestBed.tick()
    expect(request.cancelled).toBe(true)
    store.loadDetail(supportId(7))
    const next = http.expectOne(`${collection}/7`)
    TestBed.resetTestingModule()
    expect(next.cancelled).toBe(true)
  })
  it.each(['success', 'error'] as const)(
    'suppresses stale %s before company effect flush',
    outcome => {
      store.load(query)
      const request = http.expectOne(searchPath)
      company.set(supportCompanyId(3))
      if (outcome === 'success') request.flush(page())
      else request.flush({}, { status: 500, statusText: 'Failure' })
      expect(store.page()).toBeNull()
      expect(store.searchError()).toBeNull()
      expect(store.searchStatus()).toBe('idle')
      TestBed.tick()
    },
  )
  it('clears session-sensitive records immediately on logout/version changes', () => {
    store.load(query)
    http.expectOne(searchPath).flush(page())
    store.loadDetail(supportId(7))
    http.expectOne(`${collection}/7`).flush(envelope(detail))
    expect(store.page()?.items).toHaveLength(1)
    expect(store.detail()?.id).toBe(7)
    version.set(2)
    expect(store.page()).toBeNull()
    expect(store.query()).toBeNull()
    expect(store.detail()).toBeNull()
    changes.next(2)
    user.set(null)
    expect(store.detailId()).toBeNull()
  })
  it.each(['success', 'error'] as const)(
    'suppresses stale detail %s before company effect flush',
    outcome => {
      store.loadDetail(supportId(7))
      const request = http.expectOne(`${collection}/7`)
      company.set(supportCompanyId(3))
      if (outcome === 'success') request.flush(envelope(detail))
      else request.flush({}, { status: 403, statusText: 'Forbidden' })
      expect(store.detail()).toBeNull()
      expect(store.detailError()).toBeNull()
      expect(store.detailStatus()).toBe('idle')
      TestBed.tick()
    },
  )
  it('cancels reads on session events and rejects responses before an event is delivered', () => {
    store.load(query)
    const search = http.expectOne(searchPath)
    version.set(2)
    changes.next(2)
    expect(search.cancelled).toBe(true)
    store.loadDetail(supportId(7))
    const request = http.expectOne(`${collection}/7`)
    version.set(3)
    request.flush(envelope(detail))
    expect(store.detail()).toBeNull()
    expect(store.detailError()).toBeNull()
    changes.next(3)
  })
  it('hides already loaded company-sensitive records synchronously, before effects run', () => {
    store.load(query)
    http.expectOne(searchPath).flush(page())
    store.loadDetail(supportId(7))
    http.expectOne(`${collection}/7`).flush(envelope(detail))
    company.set(supportCompanyId(3))
    expect(store.page()).toBeNull()
    expect(store.detail()).toBeNull()
    expect(store.query()).toBeNull()
    expect(store.detailId()).toBeNull()
    TestBed.tick()
    company.set(supportCompanyId(2))
    expect(store.page()).toBeNull()
  })
  it('supersedes search and detail independently without detail-to-list pollution', () => {
    store.load(query)
    const old = http.expectOne(searchPath)
    store.load({ ...query, fullName: 'Changed' })
    expect(old.cancelled).toBe(true)
    http.expectOne(searchPath).flush(page())
    const original = store.page()
    store.loadDetail(supportId(7))
    const first = http.expectOne(`${collection}/7`)
    store.loadDetail(supportId(8))
    expect(first.cancelled).toBe(true)
    http.expectOne(`${collection}/8`).flush(envelope({ ...detail, id: 8 }))
    expect(store.detail()?.id).toBe(8)
    expect(store.page()).toBe(original)
    expect(store.page()?.pagination.totalCount).toBe(1)
    expect(store.page()?.items.map(item => item.id)).toEqual([7])
  })
  it('represents loading, empty, denied, error and not-found separately', () => {
    expect(store.searchStatus()).toBe('idle')
    store.load(query)
    expect(store.searchStatus()).toBe('loading')
    http.expectOne(searchPath).flush(page([]))
    expect(store.searchStatus()).toBe('ready')
    expect(store.page()?.items).toEqual([])
    access.mockReturnValue(of(false))
    store.load(query)
    expect(store.searchStatus()).toBe('denied')
    expect(store.page()).toBeNull()
    access.mockReturnValue(of(true))
    store.load(query)
    http.expectOne(searchPath).flush({}, { status: 500, statusText: 'Failure' })
    expect(store.searchStatus()).toBe('error')
    store.loadDetail(supportId(7))
    http.expectOne(`${collection}/7`).flush(envelope(null))
    expect(store.detailStatus()).toBe('not-found')
    store.loadDetail(supportId(8))
    http.expectOne(`${collection}/8`).flush({}, { status: 404, statusText: 'Not Found' })
    expect(store.detailStatus()).toBe('not-found')
    store.clear()
    expect(store.searchStatus()).toBe('idle')
    expect(store.searchError()).toBeNull()
    expect(store.detailId()).toBeNull()
  })
  it('configures an alternate injector/endpoints/company without a singleton store/cache', async () => {
    const alternateCompany = signal<SupportCompanyId | null>(supportCompanyId(3))
    const alternateAccess = vi.fn<SupportAuthorize>(() => of(true))
    const child = createEnvironmentInjector(
      [
        provideSupportData({
          apiUrl: '/other/api',
          endpoints: { collection: 'tickets', search: 'tickets/find' },
          company: () => alternateCompany,
          access: () => alternateAccess,
        }),
        SupportStore,
      ],
      TestBed.inject(EnvironmentInjector),
    )
    const other = child.get(SupportApi)
    const result = firstValueFrom(other.search(query))
    const request = http.expectOne('/other/api/tickets/find')
    expect(request.request.body.companyId).toBe(3)
    request.flush(page([{ ...row, companyId: 3 }]))
    expect((await result).items[0].companyId).toBe(3)
    expect(child.get(SupportStore)).not.toBe(store)
    expect(access).not.toHaveBeenCalled()
    child.destroy()
  })
  it('uses an alternate consumer scoped HttpClient chain without replacing or inheriting credentials', async () => {
    const child = createEnvironmentInjector(
      [
        provideHttpClient(
          withInterceptors([
            (request, next) => next(request.clone({ setHeaders: { 'X-Consumer': 'isolated' } })),
          ]),
        ),
        provideHttpClientTesting(),
        provideSupportData({ ...config, apiUrl: '/isolated/api' }),
      ],
      TestBed.inject(EnvironmentInjector),
    )
    const childHttp = child.get(HttpTestingController)
    const result = firstValueFrom(child.get(SupportApi).detail(supportId(7)))
    http.expectNone(() => true)
    const request = childHttp.expectOne('/isolated/api/v1/support/7')
    expect(request.request.headers.get('X-Consumer')).toBe('isolated')
    request.flush(envelope(detail))
    expect((await result)?.id).toBe(7)
    childHttp.verify()
    child.destroy()
  })
  it.each(['../support', '/support', 'v1/support?token=x', 'https://example.test', 'v1\\support'])(
    'rejects unsafe configured endpoint %s',
    path => {
      expect(() =>
        provideSupportData({
          ...config,
          endpoints: { collection: path, search: 'v1/support/search' },
        }),
      ).toThrow()
    },
  )
})
