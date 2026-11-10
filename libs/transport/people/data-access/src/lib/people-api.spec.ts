import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { EMPTY, Observable, Subject, filter, firstValueFrom, of, takeUntil } from 'rxjs'
import {
  PEOPLE_ACCESS_DENIED,
  PeopleAccessRequest,
  PeopleApi,
  PeopleAuthorize,
  PeopleCompanyId,
  PeopleSearch,
  PeopleSearchStore,
  PersonDetail,
  PersonId,
  peopleCompanyId,
  personDraft,
  personId,
  providePeopleData,
} from '../index'

const detail: PersonDetail = {
  id: personId(7),
  firstName: 'Person',
  lastName: null,
  email: null,
  nationalId: '00123',
  provinceName: null,
  cityName: null,
  cityId: null,
  address: null,
  postalCode: '00100',
  lat: 0,
  lng: 0,
  mobileNumber: 'stored-mobile',
  phoneNumber: null,
  profileImage: 'old.png',
}
const row = { id: 7, fullName: 'Person', nationalId: '00123', profileImage: null }
const query: PeopleSearch = {
  fullName: '',
  nationalId: '',
  userShiftState: null,
  pageIndex: 0,
  pageSize: 10,
}
const envelope = <T>(result: T) => ({ code: '2000', massage: null, result })
const page = (name = 'Person', number = 1) =>
  envelope({
    list: [{ ...row, fullName: name }],
    pagination: {
      currentPage: number,
      totalPages: 1,
      totalCount: 1,
      pageSize: 10,
      hasPreviousPage: number > 1,
      hasNextPage: false,
    },
  })

describe('PeopleApi and scoped search state', () => {
  let http: HttpTestingController
  let api: PeopleApi
  let company: ReturnType<typeof signal<PeopleCompanyId | null>>
  let user: ReturnType<typeof signal<{ id: string } | null>>
  let version: ReturnType<typeof signal<number>>
  let changes: Subject<number>
  let authorize: ReturnType<typeof vi.fn<PeopleAuthorize>>

  beforeEach(() => {
    company = signal<PeopleCompanyId | null>(peopleCompanyId(2))
    user = signal<{ id: string } | null>({ id: 'authenticated-identity-not-person-id' })
    version = signal(1)
    changes = new Subject<number>()
    authorize = vi.fn<PeopleAuthorize>(() => of(true))
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
        providePeopleData({
          apiUrl: '/separate/api',
          company: () => company,
          access: () => authorize,
        }),
        PeopleSearchStore,
      ],
    })
    http = TestBed.inject(HttpTestingController)
    api = TestBed.inject(PeopleApi)
    TestBed.tick()
  })
  afterEach(() => http.verify())

  it('requires a selected company and existing identity without coercing tenant or identity IDs', async () => {
    company.set(null)
    await expect(firstValueFrom(api.search(query))).rejects.toMatchObject({
      code: PEOPLE_ACCESS_DENIED,
    })
    company.set(peopleCompanyId(2))
    user.set(null)
    await expect(firstValueFrom(api.detail(personId(7)))).rejects.toMatchObject({
      code: PEOPLE_ACCESS_DENIED,
    })
    expect(authorize).not.toHaveBeenCalled()
    http.expectNone(() => true)
  })

  it.each([false, 'true', undefined])(
    'never sends private data requests for policy decision %s',
    async decision => {
      authorize.mockReturnValue(of(decision as boolean))
      await expect(firstValueFrom(api.detail(personId(7)))).rejects.toMatchObject({
        code: PEOPLE_ACCESS_DENIED,
      })
      expect(authorize).toHaveBeenCalledWith({ action: 'detail', companyId: 2, personId: 7 })
      http.expectNone(() => true)
    },
  )

  it('denies an empty policy decision rather than completing as a fake empty dataset', async () => {
    authorize.mockReturnValue(EMPTY)
    await expect(firstValueFrom(api.search(query))).rejects.toMatchObject({
      code: PEOPLE_ACCESS_DENIED,
    })
    http.expectNone(() => true)
  })

  it('sends supported scoped filters and positive one-based paging only, with private transfer caching disabled', async () => {
    const result = firstValueFrom(
      api.search({
        ...query,
        fullName: ' Person ',
        nationalId: ' 00123 ',
        userShiftState: 'HasShift',
        pageIndex: 2,
      }),
    )
    const request = http.expectOne('/separate/api/users/search')
    expect(request.request.method).toBe('POST')
    expect(request.request.transferCache).toBe(false)
    expect(request.request.body).toEqual({
      companyId: 2,
      fullName: 'Person',
      nationalId: '00123',
      userShiftState: 'HasShift',
      pageNumber: 3,
      pageSize: 10,
    })
    request.flush(page('Third page', 3))
    expect((await result).items[0].fullName).toBe('Third page')
  })

  it('snapshots a search while its policy check is pending and ignores later caller mutations', async () => {
    const decision = new Subject<boolean>()
    authorize.mockReturnValue(decision)
    const mutable = { ...query, fullName: 'Original' }
    const result = firstValueFrom(api.search(mutable))
    mutable.fullName = 'Changed later'
    decision.next(true)
    const request = http.expectOne('/separate/api/users/search')
    expect(request.request.body.fullName).toBe('Original')
    request.flush(page())
    await result
  })

  it('supports null detail but rejects a controller-substituted ID without treating it as ownership proof', async () => {
    const missing = firstValueFrom(api.detail(personId(7)))
    http.expectOne('/separate/api/users/7').flush(envelope(null))
    expect(await missing).toBeNull()
    const substituted = firstValueFrom(api.detail(personId(7)))
    const rejected = expect(substituted).rejects.toMatchObject({ kind: 'contract' })
    http.expectOne('/separate/api/users/7').flush(envelope({ ...detail, id: 8 }))
    await rejected
  })

  it('separates create from update and never forwards mobile edits, credentials, roles or birthday to PUT', async () => {
    const draft = {
      ...personDraft(detail),
      mobileNumber: 'create-mobile',
      password: 'not-a-person-field',
      roles: ['Admin'],
      birthday: '2000-01-01',
    }
    const creation = firstValueFrom(api.create(draft))
    const create = http.expectOne('/separate/api/users')
    expect(create.request.method).toBe('POST')
    expect(create.request.body).toMatchObject({
      companyId: 2,
      mobileNumber: 'create-mobile',
      profileImage: null,
      coordinate: { lat: 0, lng: 0, srid: 4326 },
    })
    expect(create.request.body).not.toHaveProperty('id')
    expect(create.request.body).not.toHaveProperty('password')
    expect(create.request.body).not.toHaveProperty('roles')
    expect(create.request.body).not.toHaveProperty('birthday')
    create.flush(envelope(detail))
    expect((await creation)?.id).toBe(7)
    const updated = firstValueFrom(api.update(detail, draft))
    const update = http.expectOne('/separate/api/users')
    expect(update.request.method).toBe('PUT')
    expect(update.request.body).toMatchObject({
      id: 7,
      companyId: 2,
      nationalId: '00123',
      postalCode: '00100',
      profileImage: null,
    })
    expect(update.request.body).not.toHaveProperty('mobileNumber')
    expect(update.request.body).not.toHaveProperty('password')
    expect(update.request.body).not.toHaveProperty('roles')
    expect(update.request.body).not.toHaveProperty('birthday')
    update.flush(envelope(detail))
    await updated
  })

  it('does not turn a null write reread into a confirmed account or automatically retry creation', async () => {
    const result = firstValueFrom(api.create(personDraft(null)))
    http.expectOne('/separate/api/users').flush(envelope(null))
    expect(await result).toBeNull()
    expect(authorize).toHaveBeenCalledTimes(1)
    http.expectNone(() => true)
  })

  it('rejects self-rewritten update/delete outcomes rather than optimistically removing the requested record', async () => {
    const update = firstValueFrom(api.update(detail, personDraft(detail)))
    const badUpdate = expect(update).rejects.toMatchObject({ kind: 'contract' })
    http.expectOne('/separate/api/users').flush(envelope({ ...detail, id: 1 }))
    await badUpdate
    const deletion = firstValueFrom(api.delete(personId(7)))
    const badDelete = expect(deletion).rejects.toMatchObject({ kind: 'contract' })
    const request = http.expectOne('/separate/api/users/7')
    expect(request.request.method).toBe('DELETE')
    request.flush(envelope(1))
    await badDelete
  })

  it.each([0, -1, 2147483648, 'identity-id'])(
    'rejects invalid Person ID %s before policy or HTTP',
    async id => {
      await expect(firstValueFrom(api.detail(id as PersonId))).rejects.toMatchObject({
        kind: 'contract',
      })
      expect(authorize).not.toHaveBeenCalled()
      http.expectNone(() => true)
    },
  )

  it('cancels pending permission and data reads when the company or session changes', () => {
    const decision = new Subject<boolean>()
    authorize.mockReturnValue(decision)
    const first = api.detail(personId(7)).subscribe()
    company.set(peopleCompanyId(3))
    TestBed.tick()
    expect(first.closed).toBe(true)
    decision.next(true)
    http.expectNone(() => true)
    authorize.mockReturnValue(of(true))
    const second = api.detail(personId(7)).subscribe()
    const pending = http.expectOne('/separate/api/users/7')
    version.set(2)
    user.set(null)
    changes.next(2)
    expect(second.closed).toBe(true)
    expect(pending.cancelled).toBe(true)
  })

  it('does not cancel a fresh scope request because the scope observable still has its previous replay', async () => {
    company.set(peopleCompanyId(3))
    const result = firstValueFrom(api.detail(personId(7)))
    const request = http.expectOne('/separate/api/users/7')
    TestBed.tick()
    expect(request.cancelled).toBe(false)
    request.flush(envelope(detail))
    await result
    expect(authorize).toHaveBeenCalledWith({ action: 'detail', companyId: 3, personId: 7 })
  })

  it('clears page, sensitive filters and selection on scope/session changes and cancels rapid searches', () => {
    const store = TestBed.inject(PeopleSearchStore)
    store.load({ ...query, nationalId: 'private-filter' })
    const old = http.expectOne('/separate/api/users/search')
    store.load(query)
    expect(old.cancelled).toBe(true)
    http.expectOne('/separate/api/users/search').flush(page())
    expect(store.select(personId(7))).toBe(true)
    expect(store.selected()?.id).toBe(7)
    company.set(peopleCompanyId(3))
    TestBed.tick()
    expect(store.page()).toBeNull()
    expect(store.query()).toBeNull()
    expect(store.selected()).toBeNull()
    store.load(query)
    http.expectOne('/separate/api/users/search').flush(page('Company three'))
    expect(store.page()?.items[0].fullName).toBe('Company three')
    changes.next(2)
    expect(store.page()).toBeNull()
    expect(store.companyId()).toBeNull()
  })

  it('distinguishes access denial, raw backend errors and valid empty pages without fake success data', () => {
    const store = TestBed.inject(PeopleSearchStore)
    authorize.mockReturnValue(of(false))
    store.load(query)
    expect(store.status()).toBe('denied')
    expect(store.page()).toBeNull()
    authorize.mockReturnValue(of(true))
    store.load(query)
    http
      .expectOne('/separate/api/users/search')
      .flush('Use Update api', { status: 400, statusText: 'Bad Request' })
    expect(store.status()).toBe('error')
    store.load({ ...query, pageIndex: 8 })
    http.expectOne('/separate/api/users/search').flush(
      envelope({
        list: null,
        pagination: {
          currentPage: 9,
          pageSize: 10,
          totalPages: 0,
          totalCount: 0,
          hasPreviousPage: true,
          hasNextPage: false,
        },
      }),
    )
    expect(store.status()).toBe('ready')
    expect(store.page()?.items).toEqual([])
    expect(store.select(personId(7))).toBe(false)
  })

  it('rejects selection from the previous company before the scope effect runs', () => {
    const store = TestBed.inject(PeopleSearchStore)
    store.load(query)
    http.expectOne('/separate/api/users/search').flush(page())
    expect(store.select(personId(7))).toBe(true)
    company.set(peopleCompanyId(3))
    expect(store.select(personId(7))).toBe(false)
    expect(store.page()).toBeNull()
    expect(store.selected()).toBeNull()
    expect(store.query()).toBeNull()
    expect(store.status()).toBe('idle')
  })

  it.each([403, 500])('discards an old company HTTP %s before the scope effect runs', status => {
    const store = TestBed.inject(PeopleSearchStore)
    store.load({ ...query, nationalId: 'private-old-company-filter' })
    const pending = http.expectOne('/separate/api/users/search')
    company.set(peopleCompanyId(3))
    pending.flush(null, { status, statusText: 'Failure' })
    expect(store.status()).toBe('idle')
    expect(store.loading()).toBe(false)
    expect(store.error()).toBeNull()
    expect(store.companyId()).toBeNull()
    expect(store.query()).toBeNull()
  })

  it('discards a successful old-company response before the scope effect runs', () => {
    const store = TestBed.inject(PeopleSearchStore)
    store.load(query)
    const pending = http.expectOne('/separate/api/users/search')
    company.set(peopleCompanyId(3))
    pending.flush(page('Private previous-company person'))
    expect(store.status()).toBe('idle')
    expect(store.page()).toBeNull()
    expect(store.error()).toBeNull()
    expect(store.query()).toBeNull()
  })

  it.each(['version', 'user'] as const)(
    'rejects selection when session %s changes before its notification',
    change => {
      const store = TestBed.inject(PeopleSearchStore)
      store.load(query)
      http.expectOne('/separate/api/users/search').flush(page())
      expect(store.select(personId(7))).toBe(true)
      if (change === 'version') version.set(2)
      else user.set(null)
      expect(store.select(personId(7))).toBe(false)
      expect(store.page()).toBeNull()
      expect(store.selected()).toBeNull()
      expect(store.select(null)).toBe(true)
    },
  )

  it.each(['create', 'update', 'delete'] as const)(
    'preserves structured validation errors without retrying %s',
    async action => {
      const operation =
        action === 'create'
          ? api.create(personDraft(null))
          : action === 'update'
            ? api.update(detail, personDraft(detail))
            : api.delete(personId(7))
      const result = firstValueFrom<unknown>(operation)
      const rejected = expect(result).rejects.toMatchObject({
        kind: 'validation',
        status: 422,
        fieldErrors: { NationalId: ['Already registered.'] },
      })
      http
        .expectOne(action === 'delete' ? '/separate/api/users/7' : '/separate/api/users')
        .flush(
          { errors: { NationalId: ['Already registered.'] } },
          { status: 422, statusText: 'Unprocessable Entity' },
        )
      await rejected
      expect(authorize).toHaveBeenCalledTimes(1)
      http.expectNone(() => true)
    },
  )

  it.each(['page', 'size', 'duplicate'] as const)(
    'rejects inconsistent search %s responses without publishing a page',
    mismatch => {
      const store = TestBed.inject(PeopleSearchStore)
      store.load(query)
      const response = page()
      if (mismatch === 'page') response.result.pagination.currentPage = 2
      if (mismatch === 'size') response.result.pagination.pageSize = 20
      if (mismatch === 'duplicate') response.result.list.push({ ...row, fullName: 'Duplicate' })
      http.expectOne('/separate/api/users/search').flush(response)
      expect(store.status()).toBe('error')
      expect(store.error()?.kind).toBe('contract')
      expect(store.page()).toBeNull()
      expect(store.loading()).toBe(false)
    },
  )
})

describe('PeopleData alternate consumer', () => {
  it('uses injected factories for a different company and API without application imports', async () => {
    const requests: PeopleAccessRequest[] = []
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionStore,
          useValue: {
            user: () => ({ id: 'different-identity' }),
            version: () => 1,
            untilChanged:
              () =>
              <T>(source: Observable<T>) =>
                source,
          },
        },
        providePeopleData({
          apiUrl: '/another/v2',
          company: () => signal(peopleCompanyId(42)),
          access: () => request => {
            requests.push(request)
            return of(true)
          },
        }),
      ],
    })
    const result = firstValueFrom(TestBed.inject(PeopleApi).detail(personId(7)))
    const http = TestBed.inject(HttpTestingController)
    http.expectOne('/another/v2/users/7').flush(envelope(detail))
    expect((await result)?.id).toBe(7)
    expect(requests).toEqual([{ action: 'detail', companyId: 42, personId: 7 }])
    http.verify()
  })
})
