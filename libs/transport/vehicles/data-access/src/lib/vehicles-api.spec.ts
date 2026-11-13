import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { firstValueFrom, of } from 'rxjs'
import { VehiclesApi, VehiclesDataConfig, provideVehiclesData } from './vehicles-api'
import { VehicleDraft, carId } from './vehicle.models'

const config: VehiclesDataConfig = {
  apiUrl: '/test-api',
  endpoints: {
    collection: 'v1/vehicle',
    search: 'v1/vehicle/search',
    types: 'v1/vehicle/types',
    save: 'v1/vehicle',
  },
  company: () => signal(12),
  access: () => request => of(request.companyId === 12),
}

const draft: VehicleDraft = {
  driverId: 3,
  vehicleTypeId: 4,
  carPlate: '12345678',
  color: 'White',
  produnctionYear: null,
  capacity: null,
}

describe('VehiclesApi', () => {
  let http: HttpTestingController
  let api: VehiclesApi

  beforeEach(() => {
    const session = {
      user: signal({ roles: ['Admin'] }),
      version: signal(1),
      changes$: of(undefined),
      untilChanged:
        () =>
        <T>(source: import('rxjs').Observable<T>) =>
          source,
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionStore, useValue: session },
        provideVehiclesData(config),
      ],
    })
    http = TestBed.inject(HttpTestingController)
    api = TestBed.inject(VehiclesApi)
  })

  afterEach(() => http.verify())

  it('sends company-scoped server pagination for search', async () => {
    const result = firstValueFrom(api.search({ pageIndex: 1, pageSize: 10 }))
    const request = http.expectOne('/test-api/v1/vehicle/search')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({ companyId: 12, pageNumber: 2, pageSize: 10 })
    request.flush({
      code: '2000',
      massage: 'Success',
      result: {
        list: [],
        pagination: {
          currentPage: 2,
          totalPages: 2,
          totalCount: 10,
          pageSize: 10,
          hasPreviousPage: true,
          hasNextPage: false,
        },
      },
    })
    await expect(result).resolves.toMatchObject({ items: [], pagination: { currentPage: 2 } })
  })

  it('uses separate lookup, detail, create, update, type, and delete contracts', async () => {
    const detail = firstValueFrom(api.detail(carId(7)))
    const detailRequest = http.expectOne('/test-api/v1/vehicle/7')
    expect(detailRequest.request.method).toBe('GET')
    detailRequest.flush({
      code: '2000',
      massage: 'Success',
      result: {
        id: 7,
        driverId: 3,
        vehicleTypeId: 4,
        carPlate: '12345678',
        color: 'White',
        produnctionYear: null,
        capacity: null,
        carImage: null,
        carSmartCardImage: null,
        carInsuranceImage: null,
        carCardImage: null,
      },
    })
    await expect(detail).resolves.toMatchObject({ id: 7, vehicleTypeId: 4 })

    const types = firstValueFrom(api.types())
    const typesRequest = http.expectOne('/test-api/v1/vehicle/types')
    expect(typesRequest.request.method).toBe('GET')
    typesRequest.flush({ code: '2000', massage: 'Success', result: [{ id: 4, model: 'Bus' }] })
    await expect(types).resolves.toEqual([{ id: 4, carTypeId: null, model: 'Bus' }])

    for (const id of [null, carId(7)] as const) {
      const save = firstValueFrom(api.save(id, draft))
      const request = http.expectOne('/test-api/v1/vehicle')
      expect(request.request.method).toBe('POST')
      expect(request.request.body).toEqual(id === null ? draft : { id, ...draft })
      request.flush({ code: '2000', massage: 'Success', result: { id: id ?? 8 } })
      await expect(save).resolves.toBe(id ?? 8)
    }

    const createType = firstValueFrom(api.createType({ model: 'Van' }))
    const typeWrite = http.expectOne('/test-api/v1/vehicle/types')
    expect(typeWrite.request.method).toBe('POST')
    expect(typeWrite.request.body).toEqual({ carTypeId: null, model: 'Van' })
    typeWrite.flush({ code: '2000', massage: 'Success', result: null })
    await expect(createType).resolves.toBeUndefined()

    const remove = firstValueFrom(api.delete(carId(7)))
    const deleteRequest = http.expectOne('/test-api/v1/vehicle/7')
    expect(deleteRequest.request.method).toBe('DELETE')
    deleteRequest.flush({ code: '2000', massage: 'Success', result: null })
    await expect(remove).resolves.toBeUndefined()
  })

  it('rejects unauthorized operations before making HTTP requests', async () => {
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionStore,
          useValue: {
            user: signal({}),
            version: signal(1),
            changes$: of(undefined),
            untilChanged:
              () =>
              <T>(source: import('rxjs').Observable<T>) =>
                source,
          },
        },
        provideVehiclesData({ ...config, access: () => () => of(false) }),
      ],
    })
    const deniedApi = TestBed.inject(VehiclesApi)
    const deniedHttp = TestBed.inject(HttpTestingController)
    await expect(
      firstValueFrom(deniedApi.search({ pageIndex: 0, pageSize: 10 })),
    ).rejects.toMatchObject({ code: 'vehicles-access-denied' })
    deniedHttp.expectNone('/test-api/v1/vehicle/search')
  })
})
