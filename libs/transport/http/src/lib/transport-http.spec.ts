import { HttpClient, provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { createEnvironmentInjector, EnvironmentInjector } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SessionStore, provideAuth } from '@org/auth-data-access'
import { firstValueFrom, identity } from 'rxjs'
import {
  TransportError,
  TransportHttp,
  decodeTransportPage,
  provideTransportHttp,
  transportInteger,
  transportRecord,
  unwrapTransport,
} from '../index'

describe('TransportHttp public consumer API', () => {
  let http: HttpTestingController
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideAuth({ apiUrl: '/api', tenant: 'test-tenant' }),
        {
          provide: SessionStore,
          useValue: {
            accessToken: () => 'private-token',
            tenant: () => 'test-tenant',
            version: () => 1,
            isAuthenticated: () => true,
            untilChanged: () => identity,
          },
        },
        provideHttpClientTesting(),
        provideTransportHttp({ apiUrl: '/api/v1/' }),
      ],
    })
    http = TestBed.inject(HttpTestingController)
  })
  afterEach(() => http.verify())

  it('uses the existing auth chain once and decodes a real company-shaped page', async () => {
    const result = firstValueFrom(
      TestBed.inject(TransportHttp).request(
        'POST',
        'companys/search',
        value =>
          unwrapTransport(value, page =>
            decodeTransportPage(page, row => {
              const record = transportRecord(row)
              return { id: transportInteger(record['id'], 1, 32767), name: record['name'] }
            }),
          ),
        { name: null, pageNumber: 1, pageSize: 10 },
      ),
    )
    const request = http.expectOne('/api/v1/companys/search')
    expect(request.request.headers.get('Authorization')).toBe('Bearer private-token')
    expect(request.request.headers.get('tenant')).toBe('test-tenant')
    expect(request.request.transferCache).toBe(false)
    expect(request.request.body).toEqual({ name: null, pageNumber: 1, pageSize: 10 })
    request.flush({
      code: '2000',
      massage: 'Success',
      result: {
        list: [{ id: 2, name: 'Company' }],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          pageSize: 10,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      },
    })
    expect((await result).items).toEqual([{ id: 2, name: 'Company' }])
  })

  it('supports another base and raw lookup contract without forwarding credentials', async () => {
    const child = createEnvironmentInjector(
      [provideTransportHttp({ apiUrl: 'https://lookup.example.test/catalog' })],
      TestBed.inject(EnvironmentInjector),
    )
    try {
      expect(child.get(HttpClient)).toBe(TestBed.inject(HttpClient))
      const result = firstValueFrom(
        child.get(TransportHttp).request('GET', 'vehicle/types', value => {
          if (!Array.isArray(value)) throw new TransportError('contract', 0, 'Expected array')
          return value
        }),
      )
      const request = http.expectOne('https://lookup.example.test/catalog/vehicle/types')
      expect(request.request.headers.has('Authorization')).toBe(false)
      expect(request.request.headers.has('tenant')).toBe(false)
      expect(request.request.credentials).toBe('omit')
      expect(request.request.redirect).toBe('error')
      request.flush([{ id: 1, name: 'Van' }])
      expect(await result).toEqual([{ id: 1, name: 'Van' }])
    } finally {
      child.destroy()
    }
  })

  it('keeps pending requests cancellable without a hidden shared subscription', () => {
    const subscription = TestBed.inject(TransportHttp)
      .request('GET', 'companys/2', identity)
      .subscribe()
    const request = http.expectOne('/api/v1/companys/2')
    subscription.unsubscribe()
    expect(request.cancelled).toBe(true)
  })

  it('routes version-neutral and external bases through the same auth chain safely', async () => {
    const client = TestBed.inject(TransportHttp)
    const local = firstValueFrom(
      client.request('GET', 'states', identity, undefined, { apiUrl: '/api' }),
    )
    const localRequest = http.expectOne('/api/states')
    expect(localRequest.request.headers.get('Authorization')).toBe('Bearer private-token')
    expect(localRequest.request.headers.get('tenant')).toBe('test-tenant')
    localRequest.flush([])
    expect(await local).toEqual([])
    const external = firstValueFrom(
      client.request('GET', 'states', identity, undefined, {
        apiUrl: 'https://geography.example.test/api',
      }),
    )
    const externalRequest = http.expectOne('https://geography.example.test/api/states')
    expect(externalRequest.request.headers.has('Authorization')).toBe(false)
    expect(externalRequest.request.headers.has('tenant')).toBe(false)
    expect(externalRequest.request.credentials).toBe('omit')
    externalRequest.flush([])
    expect(await external).toEqual([])
    await expect(
      firstValueFrom(
        client.request('GET', 'states', identity, undefined, { apiUrl: '//evil.test' }),
      ),
    ).rejects.toMatchObject({ kind: 'contract' })
    http.expectNone(() => true)
  })

  it('normalizes HTTP validation errors and malformed success bodies', async () => {
    const result = firstValueFrom(
      TestBed.inject(TransportHttp).request('POST', 'companys', identity, {}),
    )
    const assertion = expect(result).rejects.toMatchObject({
      kind: 'validation',
      status: 400,
      fieldErrors: { Name: ['Required'] },
    })
    http
      .expectOne('/api/v1/companys')
      .flush({ errors: { Name: ['Required'] } }, { status: 400, statusText: 'Bad Request' })
    await assertion
    const malformed = firstValueFrom(
      TestBed.inject(TransportHttp).request('GET', 'companys/1', value =>
        unwrapTransport(value, identity),
      ),
    )
    const rejected = expect(malformed).rejects.toMatchObject({ kind: 'contract' })
    http.expectOne('/api/v1/companys/1').flush({ unexpected: true })
    await rejected
  })

  it.each([
    '../companys',
    '/companys',
    '//evil.test',
    'https://evil.test',
    'companys/%2e%2e',
    'companys?token=secret',
    'companys\\1',
    'companys//1',
  ])('rejects escaping endpoint %s without a request', async path => {
    await expect(
      firstValueFrom(TestBed.inject(TransportHttp).request('GET', path, identity)),
    ).rejects.toMatchObject({ kind: 'contract' })
    http.expectNone(() => true)
  })

  it.each([
    '',
    '//evil.test',
    '/api/../private',
    '/api/%2e',
    '/api?token=x',
    'ftp://host.test',
    'https://user:password@host.test/api',
    '/api\\v1',
    '/api v1',
  ])('rejects unsafe configuration %s', apiUrl => {
    expect(() => provideTransportHttp({ apiUrl })).toThrow()
  })
})

describe('TransportHttp without auth', () => {
  it('uses an explicitly provided standard HttpClient without requiring a session', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTransportHttp({ apiUrl: '/another/api' }),
      ],
    })
    const result = firstValueFrom(TestBed.inject(TransportHttp).request('GET', 'lookup', identity))
    const http = TestBed.inject(HttpTestingController)
    const request = http.expectOne('/another/api/lookup')
    expect(request.request.headers.keys()).toEqual([])
    request.flush([1])
    expect(await result).toEqual([1])
    http.verify()
  })
})
