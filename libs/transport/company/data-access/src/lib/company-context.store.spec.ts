import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { provideTransportHttp } from '@org/transport-http'
import { Subject, firstValueFrom } from 'rxjs'
import { CompanyApi, CompanyContextStore } from '../index'

const detail = (id: number) => ({
  code: '2000',
  massage: 'Success',
  result: {
    id,
    name: `Company ${id}`,
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
  },
})

describe('route-owned company context', () => {
  let changes: Subject<number>
  let signedIn: boolean
  let http: HttpTestingController
  beforeEach(() => {
    changes = new Subject<number>()
    signedIn = true
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTransportHttp({ apiUrl: '/api/v1' }),
        CompanyApi,
        CompanyContextStore,
        {
          provide: SessionStore,
          useValue: { changes$: changes, user: () => (signedIn ? { id: 'identity' } : null) },
        },
      ],
    })
    http = TestBed.inject(HttpTestingController)
  })
  afterEach(() => http.verify())

  it('keeps guard results private until activation and discards canceled pending context', async () => {
    const store = TestBed.inject(CompanyContextStore)
    const pending = firstValueFrom(store.prepare('2'))
    http.expectOne('/api/v1/companys/2').flush(detail(2))
    expect(await pending).toBe(true)
    expect(store.company()).toBeNull()
    expect(store.status()).toBe('loading')
    expect(store.canEnterRoute('2')).toBe(true)
    expect(store.canEnterRoute('3')).toBe(false)
    store.activate('2')
    expect(store.company()?.id).toBe(2)
    const switchCompany = firstValueFrom(store.prepare('3'))
    http.expectOne('/api/v1/companys/3').flush(detail(3))
    await switchCompany
    expect(store.company()).toBeNull()
    store.discardPending()
    expect(store.canEnterRoute('3')).toBe(false)
    store.activate('3')
    expect(store.company()).toBeNull()
  })

  it('establishes context only after the exact detail has been checked by the server', async () => {
    const store = TestBed.inject(CompanyContextStore)
    const result = firstValueFrom(store.load('2'))
    expect(store.company()).toBeNull()
    expect(store.status()).toBe('loading')
    http.expectOne('/api/v1/companys/2').flush(detail(2))
    expect(await result).toBe(true)
    expect(store.company()?.id).toBe(2)
    expect(store.status()).toBe('ready')
  })
  it.each([null, '', '0', '-1', '2.5', '002', '1e2', '32768', 'Infinity', '2/path'])(
    'fails closed for invalid route ID %s without sending HTTP',
    async id => {
      const store = TestBed.inject(CompanyContextStore)
      expect(await firstValueFrom(store.load(id))).toBe(false)
      expect(store.status()).toBe('invalid')
      http.expectNone(() => true)
    },
  )
  it('cancels the old request before switching companies and never retains old context', () => {
    const store = TestBed.inject(CompanyContextStore)
    const first = store.load('2').subscribe()
    const old = http.expectOne('/api/v1/companys/2')
    store.load('3').subscribe()
    expect(old.cancelled).toBe(true)
    expect(first.closed).toBe(true)
    expect(store.company()).toBeNull()
    http.expectOne('/api/v1/companys/3').flush(detail(3))
    expect(store.company()?.id).toBe(3)
    store.load('4').subscribe()
    expect(store.company()).toBeNull()
    http.expectOne('/api/v1/companys/4').flush(detail(4))
    expect(store.company()?.id).toBe(4)
  })
  it('distinguishes missing, mismatched, access-denied, and server-failure reads', async () => {
    const store = TestBed.inject(CompanyContextStore)
    for (const response of [
      { status: 200, result: { code: '2000', massage: null, result: null }, expected: 'missing' },
      { status: 200, result: detail(3), expected: 'error' },
      { status: 403, result: null, expected: 'denied' },
      { status: 500, result: null, expected: 'error' },
    ]) {
      const result = firstValueFrom(store.load('2'))
      http
        .expectOne('/api/v1/companys/2')
        .flush(response.result, { status: response.status, statusText: 'Response' })
      expect(await result).toBe(false)
      expect(store.status()).toBe(response.expected)
      expect(store.company()).toBeNull()
    }
  })
  it('clears successful context and cancels pending reads on logout or identity change', async () => {
    const store = TestBed.inject(CompanyContextStore)
    const result = firstValueFrom(store.load('2'))
    http.expectOne('/api/v1/companys/2').flush(detail(2))
    await result
    signedIn = false
    changes.next(1)
    expect(store.company()).toBeNull()
    expect(store.status()).toBe('idle')
    expect(await firstValueFrom(store.load('2'))).toBe(false)
    expect(store.status()).toBe('denied')
    signedIn = true
    store.load('2').subscribe()
    const pending = http.expectOne('/api/v1/companys/2')
    changes.next(2)
    expect(pending.cancelled).toBe(true)
    expect(store.company()).toBeNull()
  })
  it('clears loading when a router cancels navigation, without retaining a pending request', () => {
    const store = TestBed.inject(CompanyContextStore)
    const navigation = store.load('2').subscribe()
    const request = http.expectOne('/api/v1/companys/2')
    navigation.unsubscribe()
    expect(request.cancelled).toBe(true)
    expect(store.status()).toBe('idle')
  })
})
