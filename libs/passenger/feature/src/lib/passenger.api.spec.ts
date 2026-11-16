import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { PassengerApi, PASSENGER_IDENTITY } from './passenger.api'

describe('PassengerApi', () => {
  let api: PassengerApi
  let http: HttpTestingController
  let identity = { passengerId: 165, companyId: 70, userId: 901 }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PassengerApi,
        { provide: PASSENGER_IDENTITY, useValue: () => identity },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    api = TestBed.inject(PassengerApi)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('searches only for the authenticated passenger assignment', async () => {
    const result = api.passenger()
    const request = http.expectOne('/api/v1/passengers/search')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      companyId: 70,
      passengerId: 165,
      hasShift: true,
      hasStation: true,
    })
    request.flush({
      code: '2000',
      massage: 'Success',
      result: {
        list: [
          {
            id: 165,
            fullName: 'Passenger',
            mobileNumber: '09123456789',
            shiftId: 24,
            directionId: 99,
            stationId: 61,
          },
        ],
      },
    })
    await expect(result).resolves.toMatchObject({
      id: 165,
      shiftId: 24,
      directionId: 99,
      stationId: 61,
    })
  })

  it('distinguishes the active-trip 204 from a service error', async () => {
    const result = api.activeTrip()
    http
      .expectOne('/api/v1/trips/passenger-active-trip/165')
      .flush(null, { status: 204, statusText: 'No Content' })
    await expect(result).resolves.toBeNull()
  })

  it('reads the PascalCase active-trip JSON returned by the backend', async () => {
    const result = api.activeTrip()
    http.expectOne('/api/v1/trips/passenger-active-trip/165').flush({
      Id: 72,
      DriverId: 176,
      FullName: 'Driver',
      MobileNumber: '09120000000',
      PassengerStationId: 61,
      NextStationId: 62,
      Stations: [{ Id: 62, Name: 'North station', Address: 'Main St', Lat: 35.8, Lng: 51.1 }],
    })
    await expect(result).resolves.toMatchObject({
      id: 72,
      fullName: 'Driver',
      nextStationId: 62,
      stations: [{ id: 62, name: 'North station', lat: 35.8, lng: 51.1 }],
    })
  })

  it('loads the authorized driver location and handles a cleared location', async () => {
    const result = api.driverLocation(176)
    const request = http.expectOne('/api/v1/routings/location?driverId=176')
    expect(request.request.method).toBe('GET')
    request.flush({
      code: '2000',
      result: {
        tripId: 72,
        driverId: 176,
        directionId: 99,
        nextStationId: 62,
        lat: 35.8,
        lng: 51.1,
        receivedAt: '2026-11-16T05:00:00Z',
      },
    })
    await expect(result).resolves.toEqual({
      tripId: 72,
      driverId: 176,
      directionId: 99,
      nextStationId: 62,
      lat: 35.8,
      lng: 51.1,
      receivedAt: '2026-11-16T05:00:00Z',
    })

    const cleared = api.driverLocation(176)
    http.expectOne('/api/v1/routings/location?driverId=176').flush({ code: '2000', result: null })
    await expect(cleared).resolves.toBeNull()
  })

  it('uses the authenticated user id for profile rather than the Passenger business id', async () => {
    const result = api.profile()
    const request = http.expectOne('/api/users/901')
    expect(request.request.method).toBe('GET')
    request.flush({ code: '2000', result: { id: 901, firstName: 'Passenger' } })
    await expect(result).resolves.toMatchObject({ id: 901 })
  })

  it('loads stations scoped to the selected direction and company', async () => {
    const result = api.stations(44)
    const request = http.expectOne('/api/v1/stations/search')
    expect(request.request.body).toEqual({ companyId: 70, directionId: 44 })
    request.flush({ code: '2000', result: [{ id: 61, name: 'North', address: 'Main St' }] })
    await expect(result).resolves.toEqual([{ id: 61, name: 'North', address: 'Main St' }])
  })

  it('updates only the authenticated profile request contract', async () => {
    const profile = {
      id: 901,
      firstName: 'A',
      lastName: 'B',
      cityId: 16,
      profileImage: {
        extension: '.png',
        data: 'data:image/png;base64,aGVsbG8=',
        deleteCurrentImage: false,
      },
    }
    const result = api.updateProfile(profile)
    const request = http.expectOne('/api/users')
    expect(request.request.method).toBe('PUT')
    expect(request.request.body).toEqual(profile)
    request.flush({ code: '2000', result: { id: 901, firstName: 'A', lastName: 'B' } })
    await expect(result).resolves.toBeUndefined()
  })

  it('sends the verified assignment payload and requires explicit success', async () => {
    const result = api.saveAssignment(24, 61)
    const request = http.expectOne('/api/v1/companys/batch')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toMatchObject({ PassengerIds: [165], ShiftId: 24, StationId: 61 })
    expect(request.request.body.FromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    request.flush({ code: '2000', massage: 'Success', result: true })
    await expect(result).resolves.toBeUndefined()
  })

  it('does not issue scoped requests when identity is incomplete', async () => {
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      providers: [
        PassengerApi,
        {
          provide: PASSENGER_IDENTITY,
          useValue: () => ({ passengerId: null, companyId: null, userId: null }),
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    const blocked = TestBed.inject(PassengerApi)
    const controller = TestBed.inject(HttpTestingController)
    await expect(blocked.passenger()).rejects.toThrow('identity or company scope')
    controller.expectNone('/api/v1/passengers/search')
    controller.verify()
  })

  afterEach(() => {
    identity = { passengerId: 165, companyId: 70, userId: 901 }
  })
})
