import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { ShiftTimesStore } from '@org/transport-scheduling-data-access'
import { DRIVER_IDENTITY, DriverApi } from './driver.api'

describe('DriverApi route scoping and joins', () => {
  let api: DriverApi
  let http: HttpTestingController

  beforeEach(() => {
    const shiftTimes = new Map([
      [8, { id: 8, companyId: 3, name: 'صبح', shiftTime: '07:00:00' }],
      [9, { id: 9, companyId: 3, name: 'عصر', shiftTime: '14:00:00' }],
    ])
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DriverApi,
        { provide: DRIVER_IDENTITY, useValue: () => ({ driverId: 27, companyId: 3, userId: 27 }) },
        {
          provide: ShiftTimesStore,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            byId: () => shiftTimes,
            findByName: (name: string | null | undefined) =>
              [...shiftTimes.values()].find(item => item.name === name),
          },
        },
      ],
    })
    api = TestBed.inject(DriverApi)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('loads violation choices for the reported person type', async () => {
    const result = api.supportViolationTypes(1)
    const request = http.expectOne('/api/v1/support/violation-types/1')
    expect(request.request.method).toBe('GET')
    request.flush({ code: '2000', result: [{ id: 5, code: 'P1', title: 'Passenger violation' }] })

    await expect(result).resolves.toEqual([{ id: 5, code: 'P1', title: 'Passenger violation' }])
  })

  it('submits a support complaint with its selected violation and trip context', async () => {
    const result = api.submitSupportReport({
      supportTypeId: 3,
      subject: 'Passenger complaint',
      body: 'A passenger violated the rules during the trip.',
      reportedPersonId: 42,
      tripId: 91,
      violationTypeId: 5,
      occurredAt: '2026-11-17T10:00',
    })
    const request = http.expectOne('/api/v1/support')
    expect(request.request.body).toMatchObject({
      SupportTypeId: 3,
      ReportedPersonId: 42,
      TripId: 91,
      ViolationTypeIds: '5',
    })
    request.flush({ code: '2000', result: true })

    await expect(result).resolves.toBeUndefined()
  })

  it('sends the authenticated driver id with driver search', async () => {
    const result = api.driver()
    const request = http.expectOne('/api/v1/drivers/search')
    expect(request.request.body).toMatchObject({ companyId: 3, driverId: 27 })
    request.flush({ code: '2000', result: { list: [{ id: 27, fullName: 'Driver' }] } })

    await expect(result).resolves.toMatchObject({ id: 27, fullName: 'Driver' })
  })

  it('publishes the driver location and trip context to the routing endpoint', async () => {
    const result = api.sendDriverLocation({
      tripId: 91,
      driverId: 27,
      directionId: 7,
      driverLineId: 44,
      lineId: 55,
      nextStationId: 12,
      lat: 36.69,
      lng: 48.45,
    })
    const request = http.expectOne('/api/v1/routings/location')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      tripId: 91,
      driverId: 27,
      directionId: 7,
      driverLineId: 44,
      lineId: 55,
      nextStationId: 12,
      coordinate: { lat: 36.69, lng: 48.45 },
    })
    request.flush({ code: '2000', result: true })
    await expect(result).resolves.toBeUndefined()
  })

  it('loads the home driver and assigned vehicle by their specific IDs', async () => {
    const result = api.driverHomeDetails()
    const profileResult = api.profile()
    http.expectOne('/api/v1/drivers/27').flush({
      code: '2000',
      result: { id: 27, driverLicenceLevelId: 2 },
    })
    http.expectOne('/api/users/27').flush({
      code: '2000',
      result: { id: 27, firstName: 'Driver', lastName: 'Name' },
    })
    const vehicleSearch = http.expectOne('/api/v1/vehicle/search')
    expect(vehicleSearch.request.body).toEqual({ driverId: 27 })
    vehicleSearch.flush({
      code: '2000',
      result: {
        list: [
          {
            id: 82,
            driverId: 27,
            fullName: 'Driver Name',
            carTypeName: 'Minibus',
            carPlate: '12345678',
            produnctionYear: 2023,
            capacity: 12,
            color: 'White',
            carImage: '/vehicle.png',
          },
        ],
      },
    })

    await expect(result).resolves.toMatchObject({
      driver: { id: 27, driverLicenceLevelId: 2 },
      vehicle: { name: 'Minibus', plate: '12345678', capacity: 12 },
    })
    await expect(profileResult).resolves.toMatchObject({
      id: 27,
      firstName: 'Driver',
      lastName: 'Name',
    })
    http.expectNone('/api/v1/drivers/search')
    http.expectNone('/api/v1/vehicles/82')
  })

  it('uses passengers embedded in each active-trip station', async () => {
    api.advanceToStation(91, 13)
    const result = api.activeTrip()
    http.expectOne('/api/v1/trips/active-trip/27').flush({
      id: 91,
      directionId: 7,
      driverLineId: 44,
      driverId: 27,
      nextStationId: 12,
      encodedPolyline: '_t{xE_avxH_pR_pR',
      fullName: 'Driver Name',
      stations: [
        {
          id: 12,
          name: 'First stop',
          address: 'First address',
          lat: 36.69,
          lng: 48.45,
          passengers: [
            {
              id: 35,
              fullName: 'Sam Passenger',
              mobileNumber: '09120000000',
              profileImage: '/passenger.png',
            },
          ],
        },
        { id: 13, name: 'Last stop', passengers: [] },
      ],
      passengerAbsence: [],
    })
    await Promise.resolve()
    const directionRequest = http.expectOne('/api/v1/directions/7')
    expect(directionRequest.request.method).toBe('GET')
    directionRequest.flush({
      code: '2000',
      result: { id: 7, name: 'Direction', encodedPolyline: '_t{xE_avxH_pR_pR' },
    })

    const trip = await result
    expect(trip).toMatchObject({
      nextStationId: 13,
      routeGeoJson: {
        type: 'LineString',
        coordinates: [
          [51.4, 35.7],
          [51.5, 35.8],
        ],
      },
      stations: [
        {
          id: 12,
          address: 'First address',
          lat: 36.69,
          lng: 48.45,
          passengers: [
            {
              id: 35,
              fullName: 'Sam Passenger',
              mobileNumber: '09120000000',
              profileImage: '/passenger.png',
            },
          ],
        },
        { id: 13, passengers: [] },
      ],
    })
    await expect(api.activeTripForStation()).resolves.toBe(trip)
    http.expectNone('/api/v1/trips/active-trip/27')
  })

  it('joins driver trips to searched lines and shift times by their IDs and names', async () => {
    const result = api.availableRoutesPage()
    await new Promise(resolve => setTimeout(resolve, 0))
    const tripsRequest = http.expectOne('/api/v1/trips/driver/27')
    expect(tripsRequest.request.method).toBe('GET')
    tripsRequest.flush([
      {
        driverLineId: 44,
        lineId: 55,
        directionId: 7,
        directionName: 'تست',
        tripTypeId: 1,
        tripTypeName: 'رفت',
        shiftTimeId: 8,
        departureTime: '06:30:00',
      },
      {
        driverLineId: 44,
        lineId: 55,
        directionId: 7,
        directionName: 'تست',
        tripTypeId: 2,
        tripTypeName: 'برگشت',
        shiftTimeId: 9,
        departureTime: '13:30:00',
      },
    ])

    await new Promise(resolve => setTimeout(resolve, 0))
    const linesRequest = http.expectOne('/api/v1/lines/search')
    expect(linesRequest.request.body).toMatchObject({ companyId: 3, directionId: 7 })
    linesRequest.flush({
      code: '2000',
      result: {
        list: [
          {
            id: 55,
            name: 'صبح',
            directionName: 'تست',
            entranceShiftTimeName: 'صبح',
            returnShiftTimeName: 'عصر',
          },
        ],
        pagination: { totalPages: 1 },
      },
    })

    const routes = await result
    expect(routes.list).toHaveLength(2)
    expect(routes.list).toMatchObject([
      {
        directionName: 'تست',
        lineName: 'صبح',
        tripTypeName: 'رفت',
        shiftTime: 'صبح',
        departureTime: '07:00:00',
        shiftTimeId: 8,
      },
      {
        directionName: 'تست',
        lineName: 'صبح',
        tripTypeName: 'برگشت',
        shiftTime: 'عصر',
        departureTime: '14:00:00',
        shiftTimeId: 9,
      },
    ])
  })
})
