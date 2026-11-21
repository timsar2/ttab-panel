import { HttpClient } from '@angular/common/http'
import { inject, Injectable, InjectionToken } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { decodeRouteGeometry, type GeoJsonLineString } from '@org/shared-route-geometry'

export interface PassengerIdentity {
  readonly passengerId: number | null
  readonly companyId: number | null
  readonly userId: number | null
}

export const PASSENGER_IDENTITY = new InjectionToken<() => PassengerIdentity>(
  'PASSENGER_IDENTITY',
  { factory: () => () => ({ passengerId: null, companyId: null, userId: null }) },
)

export interface PassengerRecord {
  id: number
  fullName: string
  mobileNumber: string
  profileImage?: string | null
  shiftId?: number | null
  directionId?: number | null
  stationId?: number | null
}

export interface Choice {
  id: number
  name: string
  detail?: string
  address?: string
  lat?: number
  lng?: number
  routeGeoJson?: GeoJsonLineString | null
}

export interface ActiveTrip {
  id: number
  directionId: number | null
  driverId: number
  fullName: string
  mobileNumber: string
  driverImage?: string | null
  carTypeName?: string | null
  carPlate?: string | null
  carImage?: string | null
  passengerStationId?: number | null
  nextStationId?: number | null
  stations: Array<{ id: number; name: string; address?: string; lat?: number; lng?: number }>
  routeGeoJson: GeoJsonLineString | null
}

export interface PassengerDriverLocation {
  tripId: number
  driverId: number
  directionId: number | null
  nextStationId: number | null
  heading?: number | null
  lat: number
  lng: number
  receivedAt: string
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid service response.')
  return value as Record<string, unknown>
}

function field(value: Record<string, unknown>, name: string): unknown {
  const pascalName = `${name[0].toUpperCase()}${name.slice(1)}`
  return value[name] ?? value[pascalName]
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function listResult(value: unknown): unknown[] {
  const envelope = record(value)
  if (envelope['code'] !== '2000' || !Array.isArray(envelope['result']))
    throw new Error('Invalid service response.')
  return envelope['result']
}

function dataResult(value: unknown): Record<string, unknown> {
  const envelope = record(value)
  if (envelope['code'] !== '2000') throw new Error('The service rejected the request.')
  return record(envelope['result'])
}

@Injectable()
export class PassengerApi {
  private readonly http = inject(HttpClient)
  private readonly identity = inject(PASSENGER_IDENTITY)

  private scope(): { passengerId: number; companyId: number } {
    const { passengerId, companyId } = this.identity()
    if (
      !Number.isSafeInteger(passengerId) ||
      !Number.isSafeInteger(companyId) ||
      !passengerId ||
      !companyId
    )
      throw new Error(
        'Passenger identity or company scope is unavailable. Sign in again or contact your company administrator.',
      )
    return { passengerId: passengerId as number, companyId: companyId as number }
  }

  async requestOtp(phone: string): Promise<void> {
    await firstValueFrom(
      this.http.post(
        '/api/auth/mobile-register',
        { mobile: phone },
        {
          headers: { 'X-Auth-Request': '1' },
          credentials: 'same-origin',
        },
      ),
    )
  }

  async passenger(): Promise<PassengerRecord> {
    const { passengerId, companyId } = this.scope()
    const response = await firstValueFrom(
      this.http.post<unknown>('/api/v1/passengers/search', {
        companyId,
        passengerId,
        hasShift: true,
        hasStation: true,
      }),
    )
    const payload = dataResult(response)
    const result = record(
      payload['list'] && Array.isArray(payload['list']) ? payload['list'][0] : null,
    )
    if (!Number.isSafeInteger(result['id']))
      throw new Error('Your Passenger record was not returned by the service.')
    return {
      id: result['id'] as number,
      fullName: typeof result['fullName'] === 'string' ? result['fullName'] : '',
      mobileNumber: typeof result['mobileNumber'] === 'string' ? result['mobileNumber'] : '',
      profileImage: typeof result['profileImage'] === 'string' ? result['profileImage'] : null,
      shiftId: typeof result['shiftId'] === 'number' ? result['shiftId'] : null,
      directionId: typeof result['directionId'] === 'number' ? result['directionId'] : null,
      stationId: typeof result['stationId'] === 'number' ? result['stationId'] : null,
    }
  }

  async shifts(): Promise<Choice[]> {
    const { companyId } = this.scope()
    return listResult(
      await firstValueFrom(this.http.post('/api/v1/shifts/get-shift', { companyId })),
    )
      .map(value => {
        const item = record(value)
        return {
          id: Number(item['id']),
          name: String(item['name'] ?? ''),
          detail: [item['startTime'], item['endTime']].filter(Boolean).join(' - '),
        }
      })
      .filter(item => Number.isSafeInteger(item.id) && item.name)
  }

  async directions(): Promise<Choice[]> {
    const { companyId } = this.scope()
    return listResult(
      await firstValueFrom(this.http.post('/api/v1/directions/search', { companyId })),
    )
      .map(value => {
        const item = record(value)
        return {
          id: Number(item['id']),
          name: String(item['name'] ?? ''),
          detail: typeof item['departureTime'] === 'string' ? item['departureTime'] : undefined,
          routeGeoJson: decodeRouteGeometry(
            field(item, 'encodedPolyline') ?? field(item, 'routeGeoJson'),
          ),
        }
      })
      .filter(item => Number.isSafeInteger(item.id) && item.name)
  }

  async direction(directionId: number): Promise<Choice> {
    if (!Number.isSafeInteger(directionId) || directionId <= 0)
      throw new Error('A valid direction id is required.')
    const result = dataResult(
      await firstValueFrom(this.http.get(`/api/v1/directions/${directionId}`)),
    )
    const id = Number(field(result, 'id'))
    if (id !== directionId) throw new Error('The direction response does not match the request.')
    return {
      id,
      name: String(field(result, 'name') ?? ''),
      detail:
        typeof field(result, 'departureTime') === 'string'
          ? String(field(result, 'departureTime'))
          : undefined,
      routeGeoJson: decodeRouteGeometry(field(result, 'encodedPolyline')),
    }
  }

  async stations(directionId: number): Promise<Choice[]> {
    const { companyId } = this.scope()
    return listResult(
      await firstValueFrom(this.http.post('/api/v1/stations/search', { companyId, directionId })),
    )
      .map(value => {
        const item = record(value)
        return {
          id: Number(item['id'] ?? item['Id']),
          name: String(item['name'] ?? item['Name'] ?? ''),
          address:
            typeof (item['address'] ?? item['Address']) === 'string'
              ? String(item['address'] ?? item['Address'])
              : undefined,
          lat:
            typeof (item['lat'] ?? item['Lat']) === 'number'
              ? Number(item['lat'] ?? item['Lat'])
              : undefined,
          lng:
            typeof (item['lng'] ?? item['Lng']) === 'number'
              ? Number(item['lng'] ?? item['Lng'])
              : undefined,
        }
      })
      .filter(item => Number.isSafeInteger(item.id) && item.name)
  }

  async saveAssignment(shiftId: number, stationId: number): Promise<void> {
    const { passengerId } = this.scope()
    const now = new Date()
    const fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const response = record(
      await firstValueFrom(
        this.http.post('/api/v1/companys/batch', {
          PassengerIds: [passengerId],
          ShiftId: shiftId,
          StationId: stationId,
          FromDate: fromDate,
        }),
      ),
    )
    if (response['code'] !== '2000' || response['result'] !== true)
      throw new Error('The assignment was not confirmed by the service.')
  }

  async activeTrip(): Promise<ActiveTrip | null> {
    const { passengerId } = this.scope()
    const response = await firstValueFrom(
      this.http.get<unknown>(`/api/v1/trips/passenger-active-trip/${passengerId}`, {
        observe: 'response',
      }),
    )
    if (response.status === 204) return null
    let body = response.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body) as unknown
      } catch {
        throw new Error('Invalid active-trip response.')
      }
    }
    const value = record(body)
    const id = Number(field(value, 'id'))
    const directionId = Number(field(value, 'directionId'))
    const driverId = Number(field(value, 'driverId'))
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(driverId) || driverId <= 0)
      throw new Error('The active-trip response is missing a valid trip or driver id.')

    const rawStations = field(value, 'stations')
    const stations = Array.isArray(rawStations)
      ? rawStations
          .map(raw => {
            const item = record(raw)
            const stationId = Number(field(item, 'id'))
            const name = field(item, 'name')
            return {
              id: stationId,
              name: typeof name === 'string' ? name : '',
              address: optionalString(field(item, 'address')) ?? undefined,
              lat: optionalNumber(field(item, 'lat')),
              lng: optionalNumber(field(item, 'lng')),
            }
          })
          .filter(station => Number.isSafeInteger(station.id) && station.id > 0 && station.name)
      : []
    const stationId = Number(field(value, 'passengerStationId') ?? field(value, 'stationId'))
    const nextStationId = Number(field(value, 'nextStationId'))

    return {
      id,
      directionId: Number.isSafeInteger(directionId) && directionId > 0 ? directionId : null,
      driverId,
      fullName: String(field(value, 'fullName') ?? ''),
      mobileNumber: String(field(value, 'mobileNumber') ?? ''),
      driverImage: optionalString(field(value, 'driverImage')),
      carTypeName: optionalString(field(value, 'carTypeName')),
      carPlate: optionalString(field(value, 'carPlate')),
      carImage: optionalString(field(value, 'carImage')),
      passengerStationId: Number.isSafeInteger(stationId) && stationId > 0 ? stationId : null,
      nextStationId:
        Number.isSafeInteger(nextStationId) && nextStationId > 0 ? nextStationId : null,
      stations,
      routeGeoJson: decodeRouteGeometry(
        field(value, 'encodedPolyline') ?? field(value, 'routeGeoJson'),
      ),
    }
  }

  async driverLocation(driverId: number): Promise<PassengerDriverLocation | null> {
    if (!Number.isSafeInteger(driverId) || driverId <= 0)
      throw new Error('A valid driver id is required to load the driver location.')
    const envelope = record(
      await firstValueFrom(
        this.http.get<unknown>('/api/v1/routings/location', { params: { driverId } }),
      ),
    )
    if (envelope['code'] !== '2000') throw new Error('The driver location request failed.')
    if (envelope['result'] == null) return null

    const value = record(envelope['result'])
    const tripId = Number(value['tripId'] ?? value['TripId'])
    const responseDriverId = Number(value['driverId'] ?? value['DriverId'])
    const lat = Number(value['lat'] ?? value['Lat'])
    const lng = Number(value['lng'] ?? value['Lng'])
    if (
      !Number.isSafeInteger(tripId) ||
      responseDriverId !== driverId ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    )
      throw new Error('The driver location response is invalid.')

    return {
      tripId,
      driverId: responseDriverId,
      directionId: Number.isSafeInteger(value['directionId'] ?? value['DirectionId'])
        ? Number(value['directionId'] ?? value['DirectionId'])
        : null,
      nextStationId: Number.isSafeInteger(value['nextStationId'] ?? value['NextStationId'])
        ? Number(value['nextStationId'] ?? value['NextStationId'])
        : null,
      heading: Number.isFinite(value['heading'] ?? value['Heading'])
        ? Number(value['heading'] ?? value['Heading'])
        : null,
      lat,
      lng,
      receivedAt: String(value['receivedAt'] ?? value['ReceivedAt'] ?? ''),
    }
  }

  async profile(): Promise<Record<string, unknown>> {
    const { userId } = this.identity()
    if (!Number.isSafeInteger(userId) || !userId) throw new Error('User identity is unavailable.')
    return dataResult(await firstValueFrom(this.http.get(`/api/users/${userId}`)))
  }

  async updateProfile(value: Record<string, unknown>): Promise<void> {
    dataResult(await firstValueFrom(this.http.put('/api/users', value)))
  }

  async provinces(): Promise<Choice[]> {
    return listResult(await firstValueFrom(this.http.get('/api/states')))
      .map(value => {
        const item = record(value)
        return { id: Number(item['id']), name: String(item['name'] ?? '') }
      })
      .filter(item => Number.isSafeInteger(item.id) && item.name)
  }

  async cities(provinceId: number): Promise<Choice[]> {
    return listResult(await firstValueFrom(this.http.post('/api/states/cities', { provinceId })))
      .map(value => {
        const item = record(value)
        return { id: Number(item['id']), name: String(item['name'] ?? '') }
      })
      .filter(item => Number.isSafeInteger(item.id) && item.name)
  }
}
