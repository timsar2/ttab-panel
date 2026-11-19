import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { firstValueFrom, of } from 'rxjs'
import { provideRoutesData, RoutesApi, RoutesDataConfig } from './routes-api'
import { routeId } from './route.models'

const config: RoutesDataConfig = {
  apiUrl: '/test-api',
  endpoints: {
    routes: 'v1/directions',
    search: 'v1/directions/search',
    stations: 'v1/stations/search',
    save: 'v1/directions',
  },
  company: () => signal(12),
  access: () => request => of(request.companyId === 12),
}

describe('RoutesApi', () => {
  let http: HttpTestingController
  let api: RoutesApi

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
        provideRoutesData(config),
      ],
    })
    http = TestBed.inject(HttpTestingController)
    api = TestBed.inject(RoutesApi)
  })

  afterEach(() => http.verify())

  it('posts selected-company search and decodes the unpaged legacy list', async () => {
    const result = firstValueFrom(api.list())
    const request = http.expectOne('/test-api/v1/directions/search')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({ companyId: 12 })
    request.flush({
      code: '2000',
      massage: 'Success',
      result: [
        { id: 42, name: 'االا', departureTime: '17:51:00', routeGeoJson: null },
        { id: 2, name: 'ابهر بیمارستان امید', departureTime: '07:30:00', routeGeoJson: null },
      ],
    })
    await expect(result).resolves.toEqual([
      { id: 42, name: 'االا', departureTime: '17:51:00', routeGeoJson: null },
      { id: 2, name: 'ابهر بیمارستان امید', departureTime: '07:30:00', routeGeoJson: null },
    ])
  })

  it('loads a selected Route detail and its company/Route-scoped ordered Stations', async () => {
    const detail = firstValueFrom(api.detail(routeId(42)))
    const routeRequest = http.expectOne('/test-api/v1/directions/42')
    expect(routeRequest.request.method).toBe('GET')
    routeRequest.flush({
      code: '2000',
      massage: 'Success',
      result: { id: 42, name: 'Route', departureTime: '07:30:00', routeGeoJson: null },
    })
    await expect(detail).resolves.toEqual({
      id: 42,
      name: 'Route',
      departureTime: '07:30:00',
      routeGeoJson: null,
    })

    const stations = firstValueFrom(api.stations(routeId(42)))
    const stationRequest = http.expectOne('/test-api/v1/stations/search')
    expect(stationRequest.request.method).toBe('POST')
    expect(stationRequest.request.body).toEqual({ companyId: 12, directionId: 42, name: '' })
    stationRequest.flush({
      code: '2000',
      massage: 'Success',
      result: [
        {
          id: 8,
          directionId: 42,
          name: 'Second',
          address: null,
          orderNo: 2,
          provinceName: null,
          cityName: null,
          lat: 35.8,
          lng: 51.4,
        },
        {
          id: 7,
          directionId: 42,
          name: 'First',
          address: null,
          orderNo: 1,
          provinceName: null,
          cityName: null,
          lat: 0,
          lng: 0,
        },
      ],
    })
    await expect(stations).resolves.toMatchObject([
      { id: 7, orderNo: 1, lat: 0, lng: 0 },
      { id: 8, orderNo: 2 },
    ])
  })

  it('saves an edited Station with the selected sequence number', async () => {
    const save = firstValueFrom(
      api.saveStation(routeId(42), {
        id: 7,
        directionId: routeId(42),
        name: 'First stop',
        address: 'Main street',
        cityId: 12,
        coordinate: { lat: 35.7, lng: 51.4 },
        orderNo: 2,
      }),
    )
    const request = http.expectOne('/test-api/v1/stations')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      id: 7,
      directionId: 42,
      name: 'First stop',
      address: 'Main street',
      cityId: 12,
      coordinate: { lat: 35.7, lng: 51.4 },
      orderNo: 2,
    })
    request.flush({ code: '2000', massage: 'Success', result: null })
    await expect(save).resolves.toBeUndefined()
  })

  it('sends a serialized LineString geometry when saving a Direction', async () => {
    const save = firstValueFrom(
      api.save(routeId(42), {
        companyId: 12,
        name: 'Route',
        departureTime: '07:30',
        routeGeoJson: {
          type: 'LineString',
          coordinates: [
            [51.4, 35.7],
            [51.5, 35.8],
          ],
        },
      }),
    )
    const request = http.expectOne('/test-api/v1/directions')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      id: 42,
      companyId: 12,
      name: 'Route',
      departureTime: '07:30',
      routeGeoJson: '{"type":"LineString","coordinates":[[51.4,35.7],[51.5,35.8]]}',
    })
    request.flush({ code: '2000', massage: 'Success', result: { id: 42 } })
    await expect(save).resolves.toBe(42)
  })
})
