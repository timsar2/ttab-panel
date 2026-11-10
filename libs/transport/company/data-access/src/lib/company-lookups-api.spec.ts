import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { provideTransportHttp } from '@org/transport-http'
import { Subject } from 'rxjs'
import {
  CompanyApi,
  CompanyEditorStore,
  CompanyLookupsApi,
  companyDraft,
  provideCompanyLookups,
} from '../index'

const envelope = (result: unknown) => ({ code: '2000', massage: null, result })
const original = {
  id: 2,
  name: 'Company',
  companyTypeId: 1,
  companyTypeName: 'Type',
  cityId: 7,
  provinceId: 3,
  address: null,
  postalCode: null,
  lat: 0,
  lng: 0,
  mobileNumber: null,
  phoneNumber: null,
  faxNumber: null,
  description: null,
  companyLogo: 'existing.png',
}

describe('company editor reads and mutations', () => {
  let http: HttpTestingController
  let changes: Subject<number>
  beforeEach(() => {
    changes = new Subject()
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTransportHttp({ apiUrl: '/versioned/api/v1' }),
        provideCompanyLookups({ geographyApiUrl: '/separate/api' }),
        CompanyApi,
        CompanyEditorStore,
        {
          provide: SessionStore,
          useValue: { user: () => ({ id: 'identity' }), changes$: changes },
        },
      ],
    })
    http = TestBed.inject(HttpTestingController)
  })
  afterEach(() => http.verify())
  function loaded() {
    const store = TestBed.inject(CompanyEditorStore)
    store.load(2)
    http.expectOne('/versioned/api/v1/companys/types').flush(envelope([{ id: 1, name: 'Type' }]))
    http.expectOne('/separate/api/states').flush(envelope([{ id: 3, name: 'Province' }]))
    http.expectOne('/versioned/api/v1/companys/2').flush(envelope(original))
    const cities = http.expectOne('/separate/api/states/Cities')
    expect(cities.request.body).toEqual({ provinceId: 3, name: null })
    cities.flush(envelope([{ id: 7, name: 'City' }]))
    return store
  }
  it('loads full edit detail with separately configured version-neutral geography', () => {
    const store = loaded()
    expect(store.status()).toBe('ready')
    expect(store.original()?.lat).toBe(0)
    expect(store.cityProvinceId()).toBe('3')
    expect(store.cities()).toEqual([{ id: 7, name: 'City' }])
  })
  it('cancels dependent city lookups and clears options on rapid parent changes', () => {
    const store = loaded()
    store.loadCities('4')
    const previous = http.expectOne('/separate/api/states/Cities')
    store.loadCities('5')
    expect(previous.cancelled).toBe(true)
    expect(store.cities()).toEqual([])
    http.expectOne('/separate/api/states/Cities').flush(envelope([{ id: 9, name: 'Newest city' }]))
    expect(store.cities()).toEqual([{ id: 9, name: 'Newest city' }])
    store.loadCities('')
    expect(store.cities()).toEqual([])
    http.expectNone(() => true)
  })
  it('uses full POST, retains zero coordinates/logo, prevents duplicate saves and does not change workspace', () => {
    const store = loaded()
    const draft = { ...companyDraft(original), name: 'Updated' }
    store.save(draft)
    store.save(draft)
    const request = http.expectOne('/versioned/api/v1/companys')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toMatchObject({
      id: 2,
      name: 'Updated',
      coordinate: { lat: 0, lng: 0, srid: 4326 },
      companyLogo: null,
    })
    expect(request.request.body).not.toHaveProperty('provinceId')
    request.flush(envelope({ ...original, name: 'Updated' }))
    expect(store.saved()).toBe(true)
    expect(store.original()?.id).toBe(2)
    expect(store.original()?.name).toBe('Updated')
    http.expectNone(() => true)
  })
  it('rejects a substituted saved ID and retains field validation feedback for retry', () => {
    const store = loaded()
    store.save(companyDraft(original))
    http.expectOne('/versioned/api/v1/companys').flush(envelope({ ...original, id: 3 }))
    expect(store.error()?.kind).toBe('contract')
    expect(store.saved()).toBe(false)
    store.save(companyDraft(original))
    http
      .expectOne('/versioned/api/v1/companys')
      .flush({ errors: { Name: ['Rejected name'] } }, { status: 400, statusText: 'Bad Request' })
    expect(store.error()?.fieldErrors['Name']).toEqual(['Rejected name'])
    expect(store.saving()).toBe(false)
  })
  it('clears loaded detail, drafts revision and pending requests on identity loss', () => {
    const store = loaded()
    const revision = store.revision()
    store.loadCities('4')
    const pending = http.expectOne('/separate/api/states/Cities')
    changes.next(1)
    expect(pending.cancelled).toBe(true)
    expect(store.original()).toBeNull()
    expect(store.types()).toEqual([])
    expect(store.revision()).toBeGreaterThan(revision)
  })
  it('requires actual lookup arrays and byte IDs without silently coercing values', () => {
    const result = vi.fn()
    const error = vi.fn()
    TestBed.inject(CompanyLookupsApi).types().subscribe({ next: result, error })
    http
      .expectOne('/versioned/api/v1/companys/types')
      .flush(envelope([{ id: 256, name: 'Invalid byte' }]))
    expect(result).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ kind: 'contract' }))
  })
  it('cancels a pending mutation and never adopts its result after an identity change', () => {
    const store = loaded()
    store.save(companyDraft(original))
    const pending = http.expectOne('/versioned/api/v1/companys')
    changes.next(2)
    expect(pending.cancelled).toBe(true)
    expect(store.original()).toBeNull()
    expect(store.saving()).toBe(false)
    expect(store.saved()).toBe(false)
  })
  it('never sends an invalid logo payload and leaves the editable record intact', () => {
    const store = loaded()
    store.save(companyDraft(original), {
      extension: '.png',
      data: 'not an image data URL',
      deleteCurrentImage: false,
    })
    expect(store.error()?.kind).toBe('validation')
    expect(store.original()?.id).toBe(2)
    expect(store.saving()).toBe(false)
    http.expectNone(() => true)
  })
})
