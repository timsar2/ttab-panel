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

  it('sends the authenticated driver id with driver search', async () => {
    const result = api.driver()
    const request = http.expectOne('/api/v1/drivers/search')
    expect(request.request.body).toMatchObject({ companyId: 3, driverId: 27 })
    request.flush({ code: '2000', result: { list: [{ id: 27, fullName: 'Driver' }] } })

    await expect(result).resolves.toMatchObject({ id: 27, fullName: 'Driver' })
  })

  it('loads active-trip passengers separately for each station', async () => {
    api.advanceToStation(91, 13)
    const result = api.activeTrip()
    http.expectOne('/api/v1/trips/active-trip/27').flush({
      code: '2000',
      result: {
        id: 91,
        driverLineId: 44,
        shiftTimeId: 8,
        tripTypeId: 1,
        directionId: 7,
        lineName: 'Route A',
        tripTypeName: 'رفت',
        shiftTime: 'صبح',
        departureTime: '07:00',
        nextStationId: 12,
        stations: [
          { id: 12, name: 'First stop', passengers: [] },
          { id: 13, name: 'Last stop', passengers: [] },
        ],
        vehicle: {},
      },
    })

    await new Promise(resolve => setTimeout(resolve, 0))
    const stationRequests = http.match('/api/v1/stationpassengers/search-passenger-station')
    expect(stationRequests).toHaveLength(2)
    const requestsByStationId = new Map(
      stationRequests.map(request => [request.request.body.stationId, request]),
    )
    const firstStation = requestsByStationId.get(12)
    const secondStation = requestsByStationId.get(13)
    expect(firstStation).toBeDefined()
    expect(secondStation).toBeDefined()
    if (!firstStation || !secondStation) throw new Error('Missing station passenger requests.')
    firstStation.flush({
      code: '2000',
      result: [
        {
          id: 701,
          passengerId: 35,
          fullName: 'Sam Passenger',
          mobileNumber: '09120000000',
          profileImage: '/passenger.png',
        },
      ],
    })
    secondStation.flush({ code: '2000', result: [] })

    await expect(result).resolves.toMatchObject({
      nextStationId: 13,
      stations: [
        {
          id: 12,
          passengers: [{ id: 35, fullName: 'Sam Passenger', profileImage: '/passenger.png' }],
        },
        { id: 13, passengers: [] },
      ],
    })
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
