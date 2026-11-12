import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { EnvironmentInjector, createEnvironmentInjector, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { PeopleAuthorize, providePeopleData } from '@org/transport-people-data-access'
import { EMPTY, Observable, Subject, filter, firstValueFrom, of, takeUntil } from 'rxjs'
import {
  DRIVERS_ACCESS_DENIED,
  DriverCompanyId,
  DriverSearch,
  DriversApi,
  DriversAuthorize,
  DriversStore,
  driverCompanyId,
  driverId,
  provideDriversData,
} from '../index'

const id = driverId(7)
const query: DriverSearch = { fullName: '', nationalId: '', pageIndex: 0, pageSize: 10 }
const draft = { driverLicenceLevelId: 2 } as const
const driver = {
  id: 7,
  driverLicenceLevelId: 2,
  nationalCardFrontImage: '/media/front.png',
  nationalCardBehindImage: null,
  drivingLicenceImage: '/media/licence.png',
  driverSmartCardImage: null,
}
const person = {
  id: 7,
  firstName: 'Test',
  lastName: 'Driver',
  email: null,
  nationalId: '0012345678',
  provinceName: null,
  cityName: null,
  cityId: null,
  address: null,
  postalCode: null,
  lat: null,
  lng: null,
  mobileNumber: '09120000000',
  phoneNumber: null,
  profileImage: null,
}
const row = {
  id: 7,
  fullName: 'Test Driver',
  nationalId: '0012345678',
  mobileNumber: '09120000000',
  profileImage: null,
  driverLicenceLevelName: '2',
}
const envelope = (result: unknown) => ({ code: '2000', massage: null, result })
const page = (items: unknown[] = [row], currentPage = 1) => ({
  list: items,
  pagination: {
    currentPage,
    totalPages: 1,
    totalCount: items.length,
    pageSize: 10,
    hasPreviousPage: false,
    hasNextPage: false,
  },
})
const paths = { collection: 'v1/drivers', search: 'v1/drivers/search', save: 'v1/drivers' }
const base = '/alternate/api'

describe('configured DriversApi and scoped DriversStore', () => {
  let api: DriversApi
  let store: InstanceType<typeof DriversStore>
  let http: HttpTestingController
  let company: ReturnType<typeof signal<DriverCompanyId | null>>
  let peopleCompany: ReturnType<typeof signal<DriverCompanyId | null>>
  let user: ReturnType<typeof signal<{ id: string } | null>>
  let version: ReturnType<typeof signal<number>>
  let changes: Subject<number>
  let access: ReturnType<typeof vi.fn<DriversAuthorize>>
  let peopleAccess: ReturnType<typeof vi.fn<PeopleAuthorize>>

  beforeEach(() => {
    company = signal<DriverCompanyId | null>(driverCompanyId(2))
    peopleCompany = signal<DriverCompanyId | null>(driverCompanyId(2))
    user = signal<{ id: string } | null>({ id: 'identity-is-not-person-7' })
    version = signal(1)
    changes = new Subject<number>()
    access = vi.fn<DriversAuthorize>(() => of(true))
    peopleAccess = vi.fn<PeopleAuthorize>(() => of(true))
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
          apiUrl: base,
          company: () => peopleCompany,
          access: () => peopleAccess,
        }),
        provideDriversData({
          apiUrl: base,
          endpoints: paths,
          company: () => company,
          access: () => access,
        }),
        DriversStore,
      ],
    })
    http = TestBed.inject(HttpTestingController)
    api = TestBed.inject(DriversApi)
    store = TestBed.inject(DriversStore)
    TestBed.tick()
  })
  afterEach(() => http.verify())

  it.each([false, undefined, 'true'])(
    'fails closed unless access is exactly true: %s',
    async allowed => {
      access.mockReturnValue(of(allowed as boolean))
      await expect(firstValueFrom(api.search(query))).rejects.toMatchObject({
        code: DRIVERS_ACCESS_DENIED,
      })
      http.expectNone(() => true)
    },
  )
  it('denies absent scope/session, mismatched People scope, and empty access decisions', async () => {
    access.mockReturnValue(EMPTY)
    await expect(firstValueFrom(api.search(query))).rejects.toMatchObject({
      code: DRIVERS_ACCESS_DENIED,
    })
    access.mockReturnValue(of(true))
    company.set(null)
    await expect(firstValueFrom(api.search(query))).rejects.toMatchObject({
      code: DRIVERS_ACCESS_DENIED,
    })
    company.set(driverCompanyId(2))
    peopleCompany.set(driverCompanyId(3))
    await expect(firstValueFrom(api.search(query))).rejects.toMatchObject({
      code: DRIVERS_ACCESS_DENIED,
    })
    peopleCompany.set(driverCompanyId(2))
    user.set(null)
    await expect(firstValueFrom(api.search(query))).rejects.toMatchObject({
      code: DRIVERS_ACCESS_DENIED,
    })
    http.expectNone(() => true)
  })
  it('maps only supported filters/paging and disables private transfer caching', async () => {
    const mutable = {
      ...query,
      fullName: ' Test ',
      nationalId: ' 0012345678 ',
      unsupported: 'ignored',
    }
    const result = firstValueFrom(api.search(mutable))
    mutable.fullName = 'Changed'
    const request = http.expectOne(`${base}/v1/drivers/search`)
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      companyId: 2,
      fullName: 'Test',
      nationalId: '0012345678',
      pageNumber: 1,
      pageSize: 10,
    })
    expect(request.request.transferCache).toBe(false)
    request.flush(envelope(page()))
    expect((await result).items).toEqual([row])
    expect(access).toHaveBeenCalledWith({ action: 'search', companyId: 2 })
  })
  it.each([
    page([row, row]),
    page([row], 2),
    { ...page(), pagination: { ...page().pagination, pageSize: 20 } },
  ])('rejects inconsistent page identity and pagination', async response => {
    const result = firstValueFrom(api.search(query))
    const failure = expect(result).rejects.toMatchObject({ kind: 'contract' })
    http.expectOne(`${base}/v1/drivers/search`).flush(envelope(response))
    await failure
  })
  it('fully hydrates driver documents and Person separately using shared business ID', async () => {
    const result = firstValueFrom(api.detail(id))
    http.expectOne(`${base}/v1/drivers/7`).flush(envelope(driver))
    const people = http.expectOne(`${base}/users/7`)
    expect(people.request.transferCache).toBe(false)
    people.flush(envelope(person))
    expect(await result).toEqual({ driver, person })
    expect(access).toHaveBeenCalledWith({ action: 'detail', companyId: 2, id: 7 })
    expect(peopleAccess).toHaveBeenCalledWith({ action: 'detail', companyId: 2, personId: 7 })
  })
  it.each(['driver', 'person'])('rejects a rewritten %s identity', async rewritten => {
    const result = firstValueFrom(api.detail(id))
    const failure = expect(result).rejects.toMatchObject({ kind: 'contract' })
    const driverRequest = http.expectOne(`${base}/v1/drivers/7`)
    const personRequest = http.expectOne(`${base}/users/7`)
    if (rewritten === 'driver') {
      driverRequest.flush(envelope({ ...driver, id: 8 }))
      expect(personRequest.cancelled).toBe(true)
    } else {
      driverRequest.flush(envelope(driver))
      personRequest.flush(envelope({ ...person, id: 8 }))
    }
    await failure
  })
  it('treats a missing driver as missing and does not invent Person fields in driver DTO', async () => {
    const result = firstValueFrom(api.detail(id))
    http.expectOne(`${base}/v1/drivers/7`).flush(envelope(null))
    http.expectOne(`${base}/users/7`).flush(envelope(person))
    expect(await result).toBeNull()
  })
  it('requires persisted Person identity before POST and omits unchanged previews', async () => {
    const result = firstValueFrom(api.upsert(id, draft))
    http.expectNone(request => request.method === 'POST')
    http.expectOne(`${base}/users/7`).flush(envelope(person))
    const request = http.expectOne(`${base}/v1/drivers`)
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({ id: 7, companyId: 2, driverLicenceLevelId: 2 })
    request.flush(envelope(driver))
    expect(await result).toEqual({ driver, person })
    expect(access).toHaveBeenCalledWith({ action: 'upsert', companyId: 2, id: 7 })
  })
  it.each([null, { ...person, nationalId: null }])(
    'does not mutate without an eligible persisted Person: %s',
    async response => {
      const result = firstValueFrom(api.upsert(id, draft))
      const failure = expect(result).rejects.toMatchObject({ kind: 'validation' })
      http.expectOne(`${base}/users/7`).flush(envelope(response))
      await failure
      http.expectNone(request => request.method === 'POST')
    },
  )
  it('snapshots replacements while access is pending', async () => {
    const decision = new Subject<boolean>()
    access.mockReturnValue(decision)
    const image = {
      extension: '.png',
      data: 'data:image/png;base64,YQ==',
      deleteCurrentImage: false as const,
    }
    const mutable = { ...draft, nationalCardFrontImage: image }
    const result = firstValueFrom(api.upsert(id, mutable))
    image.data = '/changed/preview.png'
    decision.next(true)
    http.expectOne(`${base}/users/7`).flush(envelope(person))
    const request = http.expectOne(`${base}/v1/drivers`)
    expect(request.request.body.nationalCardFrontImage.data).toBe('data:image/png;base64,YQ==')
    request.flush(envelope(driver))
    await result
  })
  it('rejects pending authorization after company change before effects flush', async () => {
    const decision = new Subject<boolean>()
    access.mockReturnValue(decision)
    const result = firstValueFrom(api.detail(id))
    const failure = expect(result).rejects.toMatchObject({ code: DRIVERS_ACCESS_DENIED })
    company.set(driverCompanyId(3))
    decision.next(true)
    await failure
    http.expectNone(() => true)
  })
  it('cancels both detail reads on scope change and hides old records synchronously', () => {
    store.loadDetail(id)
    const driverRequest = http.expectOne(`${base}/v1/drivers/7`)
    const personRequest = http.expectOne(`${base}/users/7`)
    company.set(driverCompanyId(3))
    expect(store.detail()).toBeNull()
    expect(store.detailStatus()).toBe('idle')
    TestBed.tick()
    expect(driverRequest.cancelled).toBe(true)
    expect(personRequest.cancelled).toBe(true)
  })
  it('does not POST after company changes during Person validation, even before effects flush', () => {
    store.save(id, draft)
    const personRequest = http.expectOne(`${base}/users/7`)
    company.set(driverCompanyId(3))
    personRequest.flush(envelope(person))
    http.expectNone(request => request.method === 'POST')
    expect(store.saved()).toBeNull()
  })
  it('cancels superseded searches and detail IDs independently', () => {
    store.search(query)
    const previous = http.expectOne(`${base}/v1/drivers/search`)
    store.search({ ...query, fullName: 'New' })
    expect(previous.cancelled).toBe(true)
    http.expectOne(`${base}/v1/drivers/search`).flush(envelope(page()))
    expect(store.page()?.items).toEqual([row])
    expect(store.query()?.fullName).toBe('New')
    store.loadDetail(id)
    const previousDriver = http.expectOne(`${base}/v1/drivers/7`)
    const previousPerson = http.expectOne(`${base}/users/7`)
    store.loadDetail(driverId(8))
    expect(previousDriver.cancelled).toBe(true)
    expect(previousPerson.cancelled).toBe(true)
    http.expectOne(`${base}/v1/drivers/8`).flush(envelope({ ...driver, id: 8 }))
    http.expectOne(`${base}/users/8`).flush(envelope({ ...person, id: 8 }))
    expect(store.detail()?.driver.id).toBe(8)
  })
  it('prevents duplicate saves while Person validation and POST are pending', () => {
    expect(store.save(id, draft)).toBe(true)
    expect(store.save(id, draft)).toBe(false)
    http.expectOne(`${base}/users/7`).flush(envelope(person))
    expect(store.save(id, draft)).toBe(false)
    http.expectOne(`${base}/v1/drivers`).flush(envelope(driver))
    expect(store.saving()).toBe(false)
    expect(store.saveOutcome()).toBe('confirmed')
    expect(store.saved()).toEqual({ driver, person })
  })
  it('invalidates only this page and matching pre-save detail for an unconfirmed save', () => {
    store.search(query)
    http.expectOne(`${base}/v1/drivers/search`).flush(envelope(page()))
    store.loadDetail(id)
    const detailDriver = http.expectOne(`${base}/v1/drivers/7`)
    const detailPerson = http.expectOne(`${base}/users/7`)
    store.save(id, draft)
    http.expectOne(`${base}/users/7`).flush(envelope(person))
    http.expectOne(`${base}/v1/drivers`).flush(envelope(null))
    expect(store.page()).toBeNull()
    expect(store.query()).toEqual(query)
    expect(store.saveOutcome()).toBe('unconfirmed')
    expect(store.saved()).toBeNull()
    expect(store.detail()).toBeNull()
    expect(detailDriver.cancelled).toBe(true)
    expect(detailPerson.cancelled).toBe(true)
  })
  it('does not overwrite a different active detail after a matching save completes', () => {
    store.save(id, draft)
    http.expectOne(`${base}/users/7`).flush(envelope(person))
    const saveRequest = http.expectOne(`${base}/v1/drivers`)
    store.loadDetail(driverId(8))
    http.expectOne(`${base}/v1/drivers/8`).flush(envelope({ ...driver, id: 8 }))
    http.expectOne(`${base}/users/8`).flush(envelope({ ...person, id: 8 }))
    saveRequest.flush(envelope(driver))
    expect(store.detail()?.driver.id).toBe(8)
    expect(store.saved()?.driver.id).toBe(7)
  })
  it('retains field errors after failure without clearing the caller draft or retrying mutations', () => {
    const mutable = { ...draft }
    store.save(id, mutable)
    http.expectOne(`${base}/users/7`).flush(envelope(person))
    http
      .expectOne(`${base}/v1/drivers`)
      .flush(
        { errors: { driverLicenceLevelId: ['Not accepted'] } },
        { status: 400, statusText: 'Bad Request' },
      )
    expect(store.saveError()?.fieldErrors).toEqual({ driverLicenceLevelId: ['Not accepted'] })
    expect(store.saving()).toBe(false)
    expect(store.saveOutcome()).toBe('none')
    expect(mutable).toEqual(draft)
    http.expectNone(() => true)
  })
  it('clears private records and cancels pending mutation when the session epoch changes', () => {
    store.search(query)
    http.expectOne(`${base}/v1/drivers/search`).flush(envelope(page()))
    store.save(id, draft)
    http.expectOne(`${base}/users/7`).flush(envelope(person))
    const saveRequest = http.expectOne(`${base}/v1/drivers`)
    version.set(2)
    changes.next(2)
    expect(saveRequest.cancelled).toBe(true)
    expect(store.page()).toBeNull()
    expect(store.saved()).toBeNull()
    expect(store.saving()).toBe(false)
    expect(store.query()).toBeNull()
  })
  it.each([401, 403, 404, 500])('maps detail HTTP %s into explicit state', status => {
    store.loadDetail(id)
    const request = http.expectOne(`${base}/v1/drivers/7`)
    const people = http.expectOne(`${base}/users/7`)
    request.flush({}, { status, statusText: 'Rejected' })
    expect(people.cancelled).toBe(true)
    expect(store.detailStatus()).toBe(
      status === 404 ? 'missing' : status === 500 ? 'error' : 'denied',
    )
  })
  it('supports an alternate scoped injector with distinct endpoints without changing the parent', async () => {
    const childCompany = signal<DriverCompanyId | null>(driverCompanyId(3))
    const child = createEnvironmentInjector(
      [
        providePeopleData({
          apiUrl: '/consumer/api',
          company: () => childCompany,
          access: () => () => of(true),
        }),
        provideDriversData({
          apiUrl: '/consumer/api',
          endpoints: {
            collection: 'fleet/drivers',
            search: 'fleet/search',
            save: 'fleet/save',
          },
          company: () => childCompany,
          access: () => () => of(true),
        }),
      ],
      TestBed.inject(EnvironmentInjector),
    )
    try {
      const result = firstValueFrom(child.get(DriversApi).search(query))
      const request = http.expectOne('/consumer/api/fleet/search')
      expect(request.request.body.companyId).toBe(3)
      request.flush(envelope(page()))
      await result
      const parentResult = firstValueFrom(api.search(query))
      http.expectOne(`${base}/v1/drivers/search`).flush(envelope(page()))
      await parentResult
    } finally {
      child.destroy()
    }
  })
  it('keeps People and driver base URLs independent regardless of provider ordering', async () => {
    const childCompany = signal<DriverCompanyId | null>(driverCompanyId(3))
    const child = createEnvironmentInjector(
      [
        providePeopleData({
          apiUrl: '/identity/api',
          company: () => childCompany,
          access: () => () => of(true),
        }),
        provideDriversData({
          apiUrl: '/fleet/api',
          endpoints: paths,
          company: () => childCompany,
          access: () => () => of(true),
        }),
      ],
      TestBed.inject(EnvironmentInjector),
    )
    try {
      const result = firstValueFrom(child.get(DriversApi).detail(id))
      http.expectOne('/fleet/api/v1/drivers/7').flush(envelope(driver))
      http.expectOne('/identity/api/users/7').flush(envelope(person))
      expect(await result).toEqual({ driver, person })
    } finally {
      child.destroy()
    }
  })
})
