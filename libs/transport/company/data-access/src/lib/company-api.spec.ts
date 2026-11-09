import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { provideTransportHttp } from '@org/transport-http'
import { Subject, firstValueFrom } from 'rxjs'
import { CompanyApi, CompanySearchStore, decodeCompanyDetail, decodeCompanyRow } from '../index'

const row = {
  id: 2,
  name: 'Company',
  companyTypeName: null,
  provinceName: null,
  cityName: null,
  companyLogo: null,
}
const detail = {
  id: 2,
  name: 'Company',
  companyTypeId: null,
  companyTypeName: null,
  cityId: null,
  provinceId: null,
  address: null,
  postalCode: null,
  lat: 0,
  lng: 0,
  mobileNumber: null,
  phoneNumber: null,
  faxNumber: null,
  description: null,
  companyLogo: null,
}
const envelope = (result: unknown) => ({ code: '2000', massage: 'Success', result })
const page = (name = 'Company') =>
  envelope({
    list: [{ ...row, name }],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: 1,
      pageSize: 10,
      hasPreviousPage: false,
      hasNextPage: false,
    },
  })

describe('company API and isolated search state', () => {
  let http: HttpTestingController
  let changes: Subject<number>
  let authenticated: boolean
  beforeEach(() => {
    changes = new Subject<number>()
    authenticated = true
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTransportHttp({ apiUrl: '/api/v1' }),
        CompanyApi,
        CompanySearchStore,
        {
          provide: SessionStore,
          useValue: {
            changes$: changes,
            user: () => (authenticated ? { id: 'identity' } : null),
            isAuthenticated: () => false,
          },
        },
      ],
    })
    http = TestBed.inject(HttpTestingController)
  })
  afterEach(() => http.verify())

  it('sends only supported search capabilities and adapts zero-based paging', async () => {
    const result = firstValueFrom(
      TestBed.inject(CompanyApi).search({ name: '  Corp  ', pageIndex: 2, pageSize: 25 }),
    )
    const request = http.expectOne('/api/v1/companys/search')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({ name: 'Corp', pageNumber: 3, pageSize: 25 })
    const response = page()
    request.flush({
      ...response,
      result: {
        ...response.result,
        pagination: { ...response.result.pagination, currentPage: 3, pageSize: 25 },
      },
    })
    expect((await result).items).toEqual([row])
  })
  it('accepts successful null detail without fabricating a company', async () => {
    const result = firstValueFrom(TestBed.inject(CompanyApi).detail(2))
    http.expectOne('/api/v1/companys/2').flush(envelope(null))
    expect(await result).toBeNull()
  })
  it('rejects a server-substituted company rather than granting requested context', async () => {
    const result = firstValueFrom(TestBed.inject(CompanyApi).detail(3))
    const rejected = expect(result).rejects.toMatchObject({ kind: 'contract' })
    http.expectOne('/api/v1/companys/3').flush(envelope(detail))
    await rejected
  })
  it('preserves valid zero coordinates and keeps detail separate from list', () => {
    expect(decodeCompanyDetail(detail)).toEqual(detail)
    expect(decodeCompanyRow(row)).toEqual(row)
    expect(() => decodeCompanyRow(detail)).toThrow()
    expect(() => decodeCompanyDetail({ ...detail, lat: 91 })).toThrow()
    expect(() => decodeCompanyDetail({ ...detail, lng: Infinity })).toThrow()
    expect(() => decodeCompanyRow({ ...row, id: '2' })).toThrow()
    expect(() => decodeCompanyRow({ ...row, companyLogo: {} })).toThrow()
  })
  it('rejects malformed request IDs before sending HTTP', () => {
    for (const id of [0, -1, 1.5, 32768, NaN])
      expect(() => TestBed.inject(CompanyApi).detail(id)).toThrow()
    http.expectNone(() => true)
  })
  it('cancels superseded searches, clears stale rows immediately, and retains only the newest result', () => {
    const store = TestBed.inject(CompanySearchStore)
    store.load({ name: 'old', pageIndex: 0, pageSize: 10 })
    const old = http.expectOne('/api/v1/companys/search')
    store.load({ name: 'new', pageIndex: 0, pageSize: 10 })
    expect(old.cancelled).toBe(true)
    expect(store.page()).toBeNull()
    expect(store.loading()).toBe(true)
    http.expectOne('/api/v1/companys/search').flush(page('new'))
    expect(store.page()?.items[0].name).toBe('new')
    expect(store.loading()).toBe(false)
  })
  it('clears private records and cancels in-flight reads on a session change', () => {
    const store = TestBed.inject(CompanySearchStore)
    store.load({ name: '', pageIndex: 0, pageSize: 10 })
    http.expectOne('/api/v1/companys/search').flush(page())
    expect(store.page()?.items).toHaveLength(1)
    authenticated = false
    changes.next(1)
    expect(store.page()).toBeNull()
    store.load({ name: '', pageIndex: 0, pageSize: 10 })
    http.expectNone(() => true)
    authenticated = true
    store.load({ name: '', pageIndex: 0, pageSize: 10 })
    const pending = http.expectOne('/api/v1/companys/search')
    changes.next(2)
    expect(pending.cancelled).toBe(true)
    expect(store.loading()).toBe(false)
  })
  it('distinguishes access denial from empty state and permits retry', () => {
    const store = TestBed.inject(CompanySearchStore)
    store.load({ name: '', pageIndex: 0, pageSize: 10 })
    http.expectOne('/api/v1/companys/search').flush(null, { status: 403, statusText: 'Forbidden' })
    expect(store.error()?.status).toBe(403)
    expect(store.page()).toBeNull()
    store.load({ name: '', pageIndex: 0, pageSize: 10 })
    expect(store.error()).toBeNull()
    http.expectOne('/api/v1/companys/search').flush(
      envelope({
        list: null,
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          pageSize: 10,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      }),
    )
    expect(store.page()?.items).toEqual([])
  })
  it('does not suppress the HTTP refresh path when the access token has expired', () => {
    const store = TestBed.inject(CompanySearchStore)
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(false)
    store.load({ name: '', pageIndex: 0, pageSize: 10 })
    http.expectOne('/api/v1/companys/search').flush(page())
    expect(store.page()?.items).toHaveLength(1)
  })
  it('rejects an inconsistent page or duplicate stable IDs instead of displaying it', async () => {
    for (const result of [
      { ...page().result, pagination: { ...page().result.pagination, currentPage: 2 } },
      { ...page().result, list: [row, row] },
    ]) {
      const response = firstValueFrom(
        TestBed.inject(CompanyApi).search({ name: '', pageIndex: 0, pageSize: 10 }),
      )
      const rejected = expect(response).rejects.toMatchObject({ kind: 'contract' })
      http.expectOne('/api/v1/companys/search').flush(envelope(result))
      await rejected
    }
  })
})
