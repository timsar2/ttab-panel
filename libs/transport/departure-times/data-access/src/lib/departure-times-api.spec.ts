import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { EnvironmentInjector, createEnvironmentInjector, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { EMPTY, Observable, Subject, filter, firstValueFrom, of, takeUntil } from 'rxjs'
import {
  DEPARTURE_TIME_ACCESS_DENIED,
  DepartureCompanyId,
  DepartureTimeAuthorize,
  DepartureTimeDraft,
  DepartureTimesApi,
  DepartureTimesStore,
  departureCompanyId,
  departureTimeId,
  provideDepartureTimesData,
} from '../index'

const row = { id: 7, companyId: 2, name: 'Morning', shiftTime: '08:30:00.1234567' }
const envelope = (result: unknown) => ({ code: '2000', massage: null, result })
const draft: DepartureTimeDraft = { name: ' Morning ', shiftTime: '08:30' }
const collection = '/alternate/api/v1/shiftTimes'
const savePath = `${collection}/set-shift-time`

describe('DepartureTimesApi and route-scoped lookup workflow', () => {
  let http: HttpTestingController
  let api: DepartureTimesApi
  let store: InstanceType<typeof DepartureTimesStore>
  let company: ReturnType<typeof signal<DepartureCompanyId | null>>
  let user: ReturnType<typeof signal<{ id: string } | null>>
  let version: ReturnType<typeof signal<number>>
  let changes: Subject<number>
  let access: ReturnType<typeof vi.fn<DepartureTimeAuthorize>>

  beforeEach(() => {
    company = signal<DepartureCompanyId | null>(departureCompanyId(2))
    user = signal<{ id: string } | null>({ id: 'identity-not-company' })
    version = signal(1)
    changes = new Subject<number>()
    access = vi.fn<DepartureTimeAuthorize>(() => of(true))
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
        provideDepartureTimesData({
          apiUrl: '/alternate/api',
          endpoints: { collection: 'v1/shiftTimes', save: 'v1/shiftTimes/set-shift-time' },
          company: () => company,
          access: () => access,
        }),
        DepartureTimesStore,
      ],
    })
    http = TestBed.inject(HttpTestingController)
    api = TestBed.inject(DepartureTimesApi)
    store = TestBed.inject(DepartureTimesStore)
    TestBed.tick()
  })
  afterEach(() => http.verify())

  it.each([false, undefined, 'true'])('fails closed for non-approved access %s', async decision => {
    access.mockReturnValue(of(decision as boolean))
    await expect(firstValueFrom(api.list())).rejects.toMatchObject({
      code: DEPARTURE_TIME_ACCESS_DENIED,
    })
    http.expectNone(() => true)
  })
  it('fails closed for empty policies, absent company, or absent session', async () => {
    access.mockReturnValue(EMPTY)
    await expect(firstValueFrom(api.list())).rejects.toMatchObject({
      code: DEPARTURE_TIME_ACCESS_DENIED,
    })
    company.set(null)
    await expect(firstValueFrom(api.list())).rejects.toMatchObject({
      code: DEPARTURE_TIME_ACCESS_DENIED,
    })
    company.set(departureCompanyId(2))
    user.set(null)
    await expect(firstValueFrom(api.list())).rejects.toMatchObject({
      code: DEPARTURE_TIME_ACCESS_DENIED,
    })
    http.expectNone(() => true)
  })
  it('sends only company/name using POST, snapshots query and disables private transfer cache', async () => {
    const query = { name: ' Morning ', page: 9, sort: 'guessed' }
    const result = firstValueFrom(api.list(query))
    query.name = 'Changed'
    const request = http.expectOne(collection)
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({ companyId: 2, name: 'Morning' })
    expect(request.request.transferCache).toBe(false)
    request.flush(envelope([row]))
    expect((await result).completeness).toBe('unknown')
    expect(access).toHaveBeenCalledWith({ action: 'list', companyId: 2 })
  })
  it('supports nullable detail and checks response identity/company rather than trusting selected company', async () => {
    const missing = firstValueFrom(api.detail(departureTimeId(7)))
    http.expectOne(`${collection}/7`).flush(envelope(null))
    expect(await missing).toBeNull()
    for (const invalid of [
      { ...row, id: 8 },
      { ...row, companyId: 3 },
    ]) {
      const result = firstValueFrom(api.detail(departureTimeId(7)))
      const failure = expect(result).rejects.toMatchObject({ kind: 'contract' })
      http.expectOne(`${collection}/7`).flush(envelope(invalid))
      await failure
    }
  })
  it('snapshots draft before pending access and uses source POST upsert, never the unsupported legacy PUT', async () => {
    const decision = new Subject<boolean>()
    access.mockReturnValue(decision)
    const mutable = { ...draft }
    const result = firstValueFrom(api.update(departureTimeId(7), mutable))
    mutable.name = 'Changed later'
    decision.next(true)
    const request = http.expectOne(savePath)
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      id: 7,
      companyId: 2,
      name: 'Morning',
      shiftTime: '08:30:00',
    })
    expect(access).toHaveBeenCalledWith({ action: 'update', companyId: 2, id: 7 })
    request.flush(envelope(row))
    expect((await result)?.id).toBe(7)
  })
  it('denies pending authorization after a scope switch before effects flush', async () => {
    const decision = new Subject<boolean>()
    access.mockReturnValue(decision)
    const result = firstValueFrom(api.list())
    const failure = expect(result).rejects.toMatchObject({ code: DEPARTURE_TIME_ACCESS_DENIED })
    company.set(departureCompanyId(3))
    decision.next(true)
    await failure
    http.expectNone(() => true)
  })
  it('rejects a stale HTTP response before company effects flush', async () => {
    const result = firstValueFrom(api.list())
    const failure = expect(result).rejects.toMatchObject({ code: DEPARTURE_TIME_ACCESS_DENIED })
    const request = http.expectOne(collection)
    company.set(departureCompanyId(3))
    request.flush(envelope([row]))
    await failure
  })
  it('cancels in-flight reads on company change and logout', () => {
    api.list().subscribe()
    const first = http.expectOne(collection)
    company.set(departureCompanyId(3))
    TestBed.tick()
    expect(first.cancelled).toBe(true)
    api.list().subscribe()
    const second = http.expectOne(collection)
    version.set(2)
    user.set(null)
    changes.next(2)
    expect(second.cancelled).toBe(true)
  })
  it('cancels superseded filter reads, but never adds pagination or local full-dataset claims', () => {
    store.load({ name: 'First' })
    const first = http.expectOne(collection)
    store.load({ name: 'Second' })
    expect(first.cancelled).toBe(true)
    const second = http.expectOne(collection)
    expect(second.request.body).toEqual({ companyId: 2, name: 'Second' })
    second.flush(envelope([row]))
    expect(store.lookupOptions()).toEqual([
      { value: 7, label: 'Morning', shiftTime: row.shiftTime },
    ])
    expect(store.list()?.completeness).toBe('unknown')
  })
  it('hides records synchronously on company/session changes before cleanup effects', () => {
    store.load()
    http.expectOne(collection).flush(envelope([row]))
    expect(store.lookupOptions()).toHaveLength(1)
    company.set(departureCompanyId(3))
    expect(store.list()).toBeNull()
    expect(store.lookupOptions()).toEqual([])
    TestBed.tick()
    company.set(departureCompanyId(2))
    expect(store.list()).toBeNull()
    store.load()
    http.expectOne(collection).flush(envelope([row]))
    version.set(2)
    expect(store.lookupOptions()).toEqual([])
    changes.next(2)
    expect(store.list()).toBeNull()
  })
  it.each([403, 500])('never publishes old-company failure %s before effect cleanup', status => {
    store.load()
    const request = http.expectOne(collection)
    company.set(departureCompanyId(3))
    request.flush({ messages: ['Old company detail'] }, { status, statusText: 'Failure' })
    expect(store.error()).toBeNull()
    expect(store.loading()).toBe(false)
    expect(store.list()).toBeNull()
  })
  it('prevents duplicate saves and invalidates only its scoped list after confirmed save', () => {
    store.load()
    http.expectOne(collection).flush(envelope([row]))
    expect(store.save(draft)).toBe(true)
    expect(store.save(draft)).toBe(false)
    expect(store.saving()).toBe(true)
    const request = http.expectOne(savePath)
    expect(request.request.body).not.toHaveProperty('id')
    request.flush(envelope(row))
    expect(store.saveOutcome()).toBe('confirmed')
    expect(store.saved()?.id).toBe(7)
    expect(store.list()).toBeNull()
    expect(store.saving()).toBe(false)
    http.expectNone(() => true)
  })
  it('does not convert null upsert reread into a confirmed saved record or auto-retry', () => {
    store.save(draft)
    http.expectOne(savePath).flush(envelope(null))
    expect(store.saveOutcome()).toBe('unconfirmed')
    expect(store.saved()).toBeNull()
    expect(store.saving()).toBe(false)
    http.expectNone(() => true)
  })
  it('retains caller draft and scoped list on validation failure, maps fields, and permits deliberate retry', () => {
    store.load()
    http.expectOne(collection).flush(envelope([row]))
    const mutable = { ...draft }
    store.save(mutable, departureTimeId(7))
    http
      .expectOne(savePath)
      .flush({ errors: { ShiftTime: ['Invalid'] } }, { status: 400, statusText: 'Bad Request' })
    expect(store.error()?.fieldErrors).toEqual({ shiftTime: ['Invalid'] })
    expect(store.list()?.items).toHaveLength(1)
    expect(mutable).toEqual(draft)
    expect(store.saveOutcome()).toBe('none')
    expect(store.save(mutable, departureTimeId(7))).toBe(true)
    http.expectOne(savePath).flush(envelope(row))
  })
  it('never accepts a stale mutation or preserves its success/error state across a scope switch', () => {
    store.save(draft)
    const request = http.expectOne(savePath)
    company.set(departureCompanyId(3))
    request.flush(envelope(row))
    expect(store.saved()).toBeNull()
    expect(store.error()).toBeNull()
    expect(store.saveOutcome()).toBe('none')
  })
  it('rejects invalid drafts without HTTP and never exposes a deletion policy', async () => {
    await expect(firstValueFrom(api.create({ name: '', shiftTime: '' }))).rejects.toMatchObject({
      kind: 'validation',
    })
    expect(api).not.toHaveProperty('delete')
    http.expectNone(() => true)
  })

  it.each([{ code: '400', massage: 'Rejected', result: null }, { result: [row] }, [row]])(
    'rejects business failure and non-contract envelopes',
    async response => {
      const result = firstValueFrom(api.list())
      const failure = expect(result).rejects.toBeDefined()
      http.expectOne(collection).flush(response)
      await failure
    },
  )

  it('cancels pending policy on session change and never sends the write afterward', () => {
    const decision = new Subject<boolean>()
    access.mockReturnValue(decision)
    api.create(draft).subscribe()
    version.set(2)
    changes.next(2)
    decision.next(true)
    http.expectNone(() => true)
  })

  it('supports caller cancellation without a second HTTP chain or retries', () => {
    const subscription = api.list().subscribe()
    const request = http.expectOne(collection)
    subscription.unsubscribe()
    expect(request.cancelled).toBe(true)
    http.expectNone(() => true)
  })

  it('surfaces backend conflict without deleting references, guessing codes or retrying mutation', () => {
    store.save(draft, departureTimeId(7))
    http
      .expectOne(savePath)
      .flush(
        { code: 'source-code', massage: 'Referenced', result: null },
        { status: 409, statusText: 'Conflict' },
      )
    expect(store.error()).toMatchObject({ status: 409, code: 'source-code', message: 'Referenced' })
    expect(store.saveOutcome()).toBe('none')
    expect(store.saving()).toBe(false)
    http.expectNone(() => true)
  })

  it('isolates another consumer company, policy, endpoints and scoped HttpClient in a child injector', async () => {
    const otherCompany = signal<DepartureCompanyId | null>(departureCompanyId(3))
    const otherAccess = vi.fn<DepartureTimeAuthorize>(() => of(true))
    const child = createEnvironmentInjector(
      [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideDepartureTimesData({
          apiUrl: '/another/backend',
          endpoints: { collection: 'custom/slots', save: 'custom/save' },
          company: () => otherCompany,
          access: () => otherAccess,
        }),
      ],
      TestBed.inject(EnvironmentInjector),
    )
    try {
      const otherApi = child.get(DepartureTimesApi)
      const otherHttp = child.get(HttpTestingController)
      const result = firstValueFrom(otherApi.list())
      const request = otherHttp.expectOne('/another/backend/custom/slots')
      expect(request.request.body).toEqual({ companyId: 3, name: null })
      request.flush(envelope([{ ...row, companyId: 3 }]))
      expect((await result).items[0].companyId).toBe(3)
      expect(otherAccess).toHaveBeenCalledWith({ action: 'list', companyId: 3 })
      expect(access).not.toHaveBeenCalled()
      expect(api.companyId()).toBe(2)
      otherHttp.verify()
    } finally {
      child.destroy()
    }
  })

  it('rejects endpoint traversal at configuration time', () => {
    expect(() =>
      provideDepartureTimesData({
        apiUrl: '/api',
        endpoints: { collection: '../slots', save: 'slots/save' },
        company: () => company,
        access: () => access,
      }),
    ).toThrow('Configure explicit departure-time endpoints')
  })

  it('loads independent detail state without disturbing a concurrent list request', () => {
    expect(store.detailStatus()).toBe('idle')
    store.load()
    const list = http.expectOne(collection)
    store.loadDetail(departureTimeId(7))
    expect(store.detailStatus()).toBe('loading')
    expect(store.detail()).toBeNull()
    const detail = http.expectOne(`${collection}/7`)
    expect(list.cancelled).toBe(false)
    detail.flush(envelope(row))
    expect(store.detail()).toEqual(row)
    expect(store.detailStatus()).toBe('ready')
    expect(store.detailError()).toBeNull()
    expect(store.loading()).toBe(true)
    list.flush(envelope([row]))
    expect(store.list()?.items).toEqual([row])
    expect(store.detail()).toEqual(row)
  })

  it('cancels old route identity detail and clears hydration immediately while preserving list state', () => {
    store.load()
    http.expectOne(collection).flush(envelope([row]))
    store.loadDetail(departureTimeId(7))
    const old = http.expectOne(`${collection}/7`)
    store.loadDetail(departureTimeId(8))
    expect(old.cancelled).toBe(true)
    expect(store.detail()).toBeNull()
    expect(store.detailStatus()).toBe('loading')
    http.expectOne(`${collection}/8`).flush(envelope({ ...row, id: 8 }))
    expect(store.detail()?.id).toBe(8)
    store.loadDetail(departureTimeId(7))
    expect(store.detail()).toBeNull()
    http.expectOne(`${collection}/7`).flush(envelope(row))
    expect(store.detail()?.id).toBe(7)
    expect(store.list()?.items).toEqual([row])
  })

  it('list reload and list failure do not cancel or overwrite detail loading/error state', () => {
    store.loadDetail(departureTimeId(7))
    const detail = http.expectOne(`${collection}/7`)
    store.load()
    http.expectOne(collection).flush({}, { status: 500, statusText: 'Failure' })
    expect(detail.cancelled).toBe(false)
    expect(store.detailStatus()).toBe('loading')
    detail.flush(envelope(row))
    expect(store.detailStatus()).toBe('ready')
    expect(store.error()?.status).toBe(500)
    expect(store.detailError()).toBeNull()
  })

  it.each([null, 'http-404'])('reports missing detail for %s without a fake record', response => {
    store.loadDetail(departureTimeId(7))
    const detail = http.expectOne(`${collection}/7`)
    if (response === null) detail.flush(envelope(null))
    else detail.flush({}, { status: 404, statusText: 'Not Found' })
    expect(store.detail()).toBeNull()
    expect(store.detailStatus()).toBe('missing')
    expect(store.error()).toBeNull()
    expect(store.saveError()).toBeNull()
  })

  it.each([401, 403, 500])('reports independent detail failure status for HTTP %s', status => {
    store.loadDetail(departureTimeId(7))
    http.expectOne(`${collection}/7`).flush({}, { status, statusText: 'Failure' })
    expect(store.detail()).toBeNull()
    expect(store.detailStatus()).toBe(status === 500 ? 'error' : 'denied')
    expect(store.detailError()?.status).toBe(status)
    expect(store.error()).toBeNull()
    store.load()
    http.expectOne(collection).flush(envelope([]))
    expect(store.detailError()?.status).toBe(status)
  })

  it('denies detail on a rejected access decision without HTTP and retries deliberately', () => {
    access.mockReturnValueOnce(of(false))
    store.loadDetail(departureTimeId(7))
    expect(store.detailStatus()).toBe('denied')
    expect(store.detailError()?.code).toBe(DEPARTURE_TIME_ACCESS_DENIED)
    http.expectNone(() => true)
    store.loadDetail(departureTimeId(7))
    expect(store.detailError()).toBeNull()
    http.expectOne(`${collection}/7`).flush(envelope(row))
    expect(store.detailStatus()).toBe('ready')
  })

  it.each([
    { ...row, id: 8 },
    { ...row, companyId: 3 },
    { ...row, shiftTime: 'bad' },
  ])('rejects mismatched or malformed detail without publishing hydration data', response => {
    store.loadDetail(departureTimeId(7))
    http.expectOne(`${collection}/7`).flush(envelope(response))
    expect(store.detail()).toBeNull()
    expect(store.detailStatus()).toBe('error')
    expect(store.detailError()?.kind).toBe('contract')
  })

  it('clearDetail cancels only detail, preserving an in-flight save and list', () => {
    store.load()
    const list = http.expectOne(collection)
    store.save(draft, departureTimeId(7))
    const save = http.expectOne(savePath)
    store.loadDetail(departureTimeId(7))
    const detail = http.expectOne(`${collection}/7`)
    store.clearDetail()
    expect(detail.cancelled).toBe(true)
    expect(save.cancelled).toBe(false)
    expect(list.cancelled).toBe(false)
    expect(store.saving()).toBe(true)
    expect(store.detailStatus()).toBe('idle')
    expect(store.detailError()).toBeNull()
    save.flush(envelope(row))
    expect(list.cancelled).toBe(true)
    expect(store.saveOutcome()).toBe('confirmed')
    expect(store.saved()).toEqual(row)
    expect(store.detail()).toBeNull()
    expect(store.detailStatus()).toBe('idle')
  })

  it('clearDetail cancels pending authorization and never issues its delayed GET', () => {
    const decision = new Subject<boolean>()
    access.mockReturnValue(decision)
    store.loadDetail(departureTimeId(7))
    store.clearDetail()
    decision.next(true)
    expect(store.detailStatus()).toBe('idle')
    http.expectNone(() => true)
  })

  it.each(['success', 'failure'])(
    'suppresses stale detail %s before company effects flush',
    outcome => {
      store.loadDetail(departureTimeId(7))
      const request = http.expectOne(`${collection}/7`)
      company.set(departureCompanyId(3))
      expect(store.detail()).toBeNull()
      expect(store.detailStatus()).toBe('idle')
      if (outcome === 'success') request.flush(envelope(row))
      else request.flush({}, { status: 403, statusText: 'Forbidden' })
      expect(store.detail()).toBeNull()
      expect(store.detailStatus()).toBe('idle')
      expect(store.detailError()).toBeNull()
      company.set(departureCompanyId(2))
      expect(store.detail()).toBeNull()
    },
  )

  it('hides loaded detail immediately and cancels independent reads on company switch', () => {
    store.loadDetail(departureTimeId(7))
    http.expectOne(`${collection}/7`).flush(envelope(row))
    company.set(departureCompanyId(3))
    expect(store.detail()).toBeNull()
    expect(store.detailStatus()).toBe('idle')
    TestBed.tick()
    store.loadDetail(departureTimeId(8))
    const detail = http.expectOne(`${collection}/8`)
    store.load()
    const list = http.expectOne(collection)
    company.set(departureCompanyId(4))
    TestBed.tick()
    expect(detail.cancelled).toBe(true)
    expect(list.cancelled).toBe(true)
    expect(store.detailError()).toBeNull()
  })

  it('rejects a late detail response on session version change before session notification', () => {
    store.loadDetail(departureTimeId(7))
    const detail = http.expectOne(`${collection}/7`)
    version.set(2)
    expect(store.detailStatus()).toBe('idle')
    detail.flush(envelope(row))
    expect(store.detail()).toBeNull()
    expect(store.detailError()).toBeNull()
    changes.next(2)
  })

  it('cancels list/detail/save and clears their independent errors/outcomes on logout', () => {
    store.loadDetail(departureTimeId(7))
    const detail = http.expectOne(`${collection}/7`)
    store.load()
    const list = http.expectOne(collection)
    store.save(draft)
    const save = http.expectOne(savePath)
    user.set(null)
    version.set(2)
    expect(store.detailStatus()).toBe('idle')
    changes.next(2)
    expect(detail.cancelled).toBe(true)
    expect(list.cancelled).toBe(true)
    expect(save.cancelled).toBe(true)
    expect(store.detailError()).toBeNull()
    expect(store.saveError()).toBeNull()
    expect(store.saved()).toBeNull()
    expect(store.saveOutcome()).toBe('none')
  })

  it('retains mutation errors independently through list/detail reloads and clearDetail', () => {
    store.save(draft, departureTimeId(7))
    http
      .expectOne(savePath)
      .flush({ errors: { Name: ['Invalid'] } }, { status: 400, statusText: 'Bad Request' })
    expect(store.saveError()?.fieldErrors).toEqual({ name: ['Invalid'] })
    store.load()
    expect(store.error()).toBe(store.saveError())
    http.expectOne(collection).flush({}, { status: 500, statusText: 'Failure' })
    store.loadDetail(departureTimeId(7))
    http.expectOne(`${collection}/7`).flush(envelope(row))
    store.clearDetail()
    expect(store.saveError()?.status).toBe(400)
    expect(store.error()?.status).toBe(400)
    store.save(draft, departureTimeId(7))
    expect(store.saveError()).toBeNull()
    http.expectOne(savePath).flush(envelope(row))
  })

  it('a confirmed matching update replaces detail and cancels a stale matching read without touching caller draft', () => {
    store.loadDetail(departureTimeId(7))
    const detail = http.expectOne(`${collection}/7`)
    const callerDraft = { ...draft }
    store.save(callerDraft, departureTimeId(7))
    http.expectOne(savePath).flush(envelope({ ...row, name: 'Updated' }))
    expect(detail.cancelled).toBe(true)
    expect(store.detail()?.name).toBe('Updated')
    expect(store.detailStatus()).toBe('ready')
    expect(store.detailError()).toBeNull()
    expect(callerDraft).toEqual(draft)
  })

  it('saving another identity cannot cancel or hydrate the new route detail', () => {
    store.loadDetail(departureTimeId(7))
    http.expectOne(`${collection}/7`).flush(envelope(row))
    store.save(draft, departureTimeId(7))
    const save = http.expectOne(savePath)
    store.loadDetail(departureTimeId(8))
    const detail = http.expectOne(`${collection}/8`)
    save.flush(envelope(row))
    expect(detail.cancelled).toBe(false)
    expect(store.detail()).toBeNull()
    expect(store.detailStatus()).toBe('loading')
    detail.flush(envelope({ ...row, id: 8 }))
    expect(store.detail()?.id).toBe(8)
    expect(store.saved()?.id).toBe(7)
  })

  it.each(['create', 'unconfirmed', 'failed'])(
    'does not reset loaded detail on %s save',
    outcome => {
      store.loadDetail(departureTimeId(7))
      http.expectOne(`${collection}/7`).flush(envelope(row))
      store.save(draft, outcome === 'create' ? undefined : departureTimeId(7))
      const save = http.expectOne(savePath)
      if (outcome === 'failed') save.flush({}, { status: 500, statusText: 'Failure' })
      else save.flush(envelope(outcome === 'unconfirmed' ? null : { ...row, name: 'Created' }))
      expect(store.detail()).toEqual(row)
      expect(store.detailStatus()).toBe('ready')
    },
  )
})
