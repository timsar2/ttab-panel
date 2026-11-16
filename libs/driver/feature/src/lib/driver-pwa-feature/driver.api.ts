import { HttpClient } from '@angular/common/http'
import { inject, Injectable, InjectionToken } from '@angular/core'
import { firstValueFrom } from 'rxjs'

export interface DriverIdentity {
  readonly driverId: number | null
  readonly companyId: number | null
  readonly userId: number | null
}

export const DRIVER_IDENTITY = new InjectionToken<() => DriverIdentity>('DRIVER_IDENTITY', {
  factory: () => () => ({ driverId: null, companyId: null, userId: null }),
})

export interface DriverRecord {
  id: number
  fullName: string
  mobileNumber: string
  profileImage?: string | null
  vehicleType?: string | null
  vehiclePlate?: string | null
  vehicleColor?: string | null
  vehicleYear?: number | null
  vehicleCapacity?: number | null
  vehicleImage?: string | null
  cardImage?: string | null
  insuranceImage?: string | null
}

export interface RouteCard {
  id: string
  lineName: string
  tripTypeName: string
  shiftTime: string
  departureTime: string
  directionId: number
  driverLineId: number
  shiftTimeId: number
  tripTypeId: number
}

export interface ActiveTrip {
  id: number
  driverLineId: number
  shiftTimeId: number
  tripTypeId: number
  directionId: number
  lineName: string
  tripTypeName: string
  shiftTime: string
  departureTime: string
  stations: Station[]
  vehicle: VehicleInfo
  nextStationId?: number | null
  passengerStationId?: number | null
  lineId?: number | null
}

export interface Station {
  id: number
  name: string
  address?: string
  lat?: number
  lng?: number
  order: number
  passengers: Passenger[]
}

export interface Passenger {
  id: number
  fullName: string
  mobileNumber: string
  profileImage?: string | null
  isAbsent: boolean
}

export interface VehicleInfo {
  type: string
  plate: string
  color: string
  year: number
  capacity: number
  image?: string | null
}

export interface RouteGeometry {
  coordinates: number[][]
}

export interface TripStartRequest {
  driverLineId: number
  shiftTimeId: number
  tripTypeId: number
  directionId: number
}

export interface StationArrivalRequest {
  tripId: number
  stationId: number
  absentPassengerIds: number[]
}

export interface EndTripRequest {
  tripId: number
  directionId: number
}

export interface DocumentUploadRequest {
  documentType: 'nationalId' | 'drivingLicense' | 'smartCard'
  file: File
  licenceLevel?: string
}

export interface DriverLocationPublishRequest {
  tripId?: number | null
  driverId?: number | null
  directionId?: number | null
  driverLineId?: number | null
  lineId?: number | null
  nextStationId?: number | null
  lat: number
  lng: number
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid service response.')
  return value as Record<string, unknown>
}

function listResult(value: unknown): unknown[] {
  const envelope = record(value)
  if (envelope['code'] !== '2000' || !Array.isArray(envelope['result']))
    throw new Error('Invalid service response.')
  return envelope['result']
}

function property(value: Record<string, unknown>, name: string): unknown {
  return value[name] ?? value[`${name[0].toUpperCase()}${name.slice(1)}`]
}

function dataResult(value: unknown): Record<string, unknown> {
  const envelope = record(value)
  if (envelope['code'] !== '2000') throw new Error('The service rejected the request.')
  return record(envelope['result'])
}

@Injectable()
export class DriverApi {
  private readonly http = inject(HttpClient)
  private readonly identity = inject(DRIVER_IDENTITY)

  private scope(): { driverId: number; companyId: number } {
    const { driverId, companyId } = this.identity()
    if (
      !Number.isSafeInteger(driverId) ||
      !Number.isSafeInteger(companyId) ||
      !driverId ||
      !companyId
    )
      throw new Error(
        'Driver identity or company scope is unavailable. Sign in again or contact your company administrator.',
      )
    return { driverId: driverId as number, companyId: companyId as number }
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

  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const result = await firstValueFrom(
      this.http.post<unknown>('/api/auth/login', {
        username: phone,
        password: otp,
      }),
    )
    return record(result)['code'] === '2000'
  }

  async driver(): Promise<DriverRecord> {
    const { driverId, companyId } = this.scope()
    const response = await firstValueFrom(
      this.http.post<unknown>('/api/v1/drivers/search', {
        companyId,
        driverId,
      }),
    )
    const payload = dataResult(response)
    const result = record(
      payload['list'] && Array.isArray(payload['list']) ? payload['list'][0] : null,
    )
    if (!Number.isSafeInteger(result['id']))
      throw new Error('Your Driver record was not returned by the service.')
    return {
      id: result['id'] as number,
      fullName: typeof result['fullName'] === 'string' ? result['fullName'] : '',
      mobileNumber: typeof result['mobileNumber'] === 'string' ? result['mobileNumber'] : '',
      profileImage: typeof result['profileImage'] === 'string' ? result['profileImage'] : null,
      vehicleType: typeof result['vehicleType'] === 'string' ? result['vehicleType'] : null,
      vehiclePlate: typeof result['vehiclePlate'] === 'string' ? result['vehiclePlate'] : null,
      vehicleColor: typeof result['vehicleColor'] === 'string' ? result['vehicleColor'] : null,
      vehicleYear: typeof result['vehicleYear'] === 'number' ? result['vehicleYear'] : null,
      vehicleCapacity:
        typeof result['vehicleCapacity'] === 'number' ? result['vehicleCapacity'] : null,
      vehicleImage: typeof result['vehicleImage'] === 'string' ? result['vehicleImage'] : null,
      cardImage: typeof result['cardImage'] === 'string' ? result['cardImage'] : null,
      insuranceImage:
        typeof result['insuranceImage'] === 'string' ? result['insuranceImage'] : null,
    }
  }

  async availableRoutes(): Promise<RouteCard[]> {
    const { driverId } = this.scope()
    const response = await firstValueFrom(
      this.http.get<unknown>(`/api/v1/trips/driver/${driverId}`),
    )
    if (!Array.isArray(response)) throw new Error('Invalid assigned-route response.')
    return response
      .map(value => {
        const item = record(value)
        const driverLineId = Number(property(item, 'driverLineId'))
        const shiftTimeId = Number(property(item, 'shiftTimeId'))
        const tripTypeId = Number(property(item, 'tripTypeId'))
        const directionId = Number(property(item, 'directionId'))
        return {
          id: `${driverLineId}:${shiftTimeId}:${tripTypeId}:${directionId}`,
          lineName: String(property(item, 'lineName') ?? ''),
          tripTypeName: String(property(item, 'tripTypeName') ?? ''),
          shiftTime: String(property(item, 'shiftTimeName') ?? ''),
          departureTime: String(property(item, 'departureTime') ?? ''),
          directionId,
          driverLineId,
          shiftTimeId,
          tripTypeId,
        }
      })
      .filter(
        item =>
          Number.isSafeInteger(item.directionId) &&
          Number.isSafeInteger(item.driverLineId) &&
          Number.isSafeInteger(item.shiftTimeId) &&
          Number.isSafeInteger(item.tripTypeId),
      )
  }

  async activeTrip(): Promise<ActiveTrip | null> {
    const { driverId } = this.scope()
    const response = await firstValueFrom(
      this.http.get<unknown>(`/api/v1/trips/active-trip/${driverId}`, {
        observe: 'response',
      }),
    )
    if (response.status === 204 || response.body == null) return null
    let body: unknown = response.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body) as unknown
      } catch {
        throw new Error('Invalid active-trip response.')
      }
    }
    const envelope = record(body)
    if ('result' in envelope && envelope['result'] == null) return null
    const value =
      envelope['result'] && typeof envelope['result'] === 'object'
        ? record(envelope['result'])
        : envelope
    const stations = Array.isArray(property(value, 'stations'))
      ? (property(value, 'stations') as unknown[]).map((raw: unknown, index: number) => {
          const item = record(raw)
          const rawPassengers = property(item, 'passengers')
          const passengers = Array.isArray(rawPassengers)
            ? rawPassengers.map((p: unknown) => {
                const passenger = record(p)
                return {
                  id: Number(property(passenger, 'id')),
                  fullName: String(property(passenger, 'fullName') ?? ''),
                  mobileNumber: String(property(passenger, 'mobileNumber') ?? ''),
                  profileImage:
                    typeof property(passenger, 'profileImage') === 'string'
                      ? (property(passenger, 'profileImage') as string)
                      : null,
                  isAbsent: Boolean(property(passenger, 'isAbsent')),
                }
              })
            : []
          return {
            id: Number(property(item, 'id')),
            name: String(property(item, 'name') ?? ''),
            address:
              typeof property(item, 'address') === 'string'
                ? (property(item, 'address') as string)
                : undefined,
            lat:
              typeof property(item, 'lat') === 'number'
                ? (property(item, 'lat') as number)
                : undefined,
            lng:
              typeof property(item, 'lng') === 'number'
                ? (property(item, 'lng') as number)
                : undefined,
            order: index + 1,
            passengers,
          }
        })
      : []
    const vehicle = record(property(value, 'vehicle') ?? {})
    return {
      id: Number(property(value, 'id')),
      driverLineId: Number(property(value, 'driverLineId')),
      shiftTimeId: Number(property(value, 'shiftTimeId')),
      tripTypeId: Number(property(value, 'tripTypeId')),
      directionId: Number(property(value, 'directionId')),
      lineId:
        typeof property(value, 'lineId') === 'number'
          ? (property(value, 'lineId') as number)
          : null,
      lineName: String(property(value, 'lineName') ?? ''),
      tripTypeName: String(property(value, 'tripTypeName') ?? ''),
      shiftTime: String(property(value, 'shiftTime') ?? ''),
      departureTime: String(property(value, 'departureTime') ?? ''),
      nextStationId:
        typeof property(value, 'nextStationId') === 'number'
          ? (property(value, 'nextStationId') as number)
          : null,
      passengerStationId:
        typeof property(value, 'passengerStationId') === 'number'
          ? (property(value, 'passengerStationId') as number)
          : null,
      stations,
      vehicle: {
        type: String(property(vehicle, 'type') ?? ''),
        plate: String(property(vehicle, 'plate') ?? ''),
        color: String(property(vehicle, 'color') ?? ''),
        year: Number(property(vehicle, 'year') ?? 0),
        capacity: Number(property(vehicle, 'capacity') ?? 0),
        image:
          typeof property(vehicle, 'image') === 'string'
            ? (property(vehicle, 'image') as string)
            : null,
      },
    }
  }

  async routeGeometry(tripId: number, directionId: number): Promise<RouteGeometry> {
    const { companyId } = this.scope()
    const response = await firstValueFrom(
      this.http.post<unknown>('/api/v1/routes/geometry', {
        companyId,
        tripId,
        directionId,
      }),
    )
    const payload = dataResult(response)
    return {
      coordinates: Array.isArray(payload['coordinates'])
        ? (payload['coordinates'] as number[][])
        : [],
    }
  }

  async startTrip(request: TripStartRequest): Promise<void> {
    this.scope()
    const response = record(
      await firstValueFrom(
        this.http.post('/api/v1/trips', {
          driverLineId: request.driverLineId,
          shiftTimeId: request.shiftTimeId,
          tripTypeId: request.tripTypeId,
        }),
      ),
    )
    if (
      response['code'] !== '2000' ||
      !response['result'] ||
      typeof response['result'] !== 'object'
    )
      throw new Error('The trip could not be started.')
  }

  async submitStationArrival(request: StationArrivalRequest): Promise<void> {
    this.scope()
    const response = record(
      await firstValueFrom(
        this.http.post('/api/v1/passengers/absence', {
          tripId: request.tripId,
          nextStationId: request.stationId,
          passengerIds: request.absentPassengerIds,
        }),
      ),
    )
    if (response['code'] !== '2000' || response['result'] !== true)
      throw new Error('The station arrival was not confirmed.')
  }

  async endTrip(request: EndTripRequest): Promise<void> {
    this.scope()
    const response = record(
      await firstValueFrom(
        this.http.post('/api/v1/trips/end-trip', {
          id: request.tripId,
          directionId: request.directionId,
        }),
      ),
    )
    if (response['code'] !== '2000' || response['result'] !== true)
      throw new Error('The trip could not be ended.')
  }

  /** Publish live driver location to backend; backend broadcasts to trip group via SignalR. */
  async sendDriverLocation(request: DriverLocationPublishRequest): Promise<void> {
    await firstValueFrom(
      this.http.post('/api/v1/routings/location', {
        tripId: request.tripId ?? null,
        driverId: request.driverId ?? null,
        directionId: request.directionId ?? null,
        driverLineId: request.driverLineId ?? null,
        lineId: request.lineId ?? null,
        ...(request.nextStationId != null ? { nextStationId: request.nextStationId } : {}),
        coordinate: { lat: request.lat, lng: request.lng },
      }),
    )
  }

  async uploadDocument(request: DocumentUploadRequest): Promise<string> {
    const { driverId, companyId } = this.scope()
    const formData = new FormData()
    formData.append('driverId', String(driverId))
    formData.append('companyId', String(companyId))
    formData.append('documentType', request.documentType)
    formData.append('file', request.file)
    if (request.licenceLevel) {
      formData.append('licenceLevel', request.licenceLevel)
    }
    const response = record(
      await firstValueFrom(this.http.post('/api/v1/drivers/upload-document', formData)),
    )
    if (response['code'] !== '2000' || typeof response['result'] !== 'string')
      throw new Error('The document could not be uploaded.')
    return response['result'] as string
  }

  async profile(): Promise<Record<string, unknown>> {
    const { userId } = this.identity()
    if (!Number.isSafeInteger(userId) || !userId) throw new Error('User identity is unavailable.')
    return dataResult(await firstValueFrom(this.http.get(`/api/users/${userId}`)))
  }

  async updateProfile(value: Record<string, unknown>): Promise<void> {
    dataResult(await firstValueFrom(this.http.put('/api/users', value)))
  }

  async updateVehicle(value: Record<string, unknown>): Promise<void> {
    const { driverId, companyId } = this.scope()
    dataResult(
      await firstValueFrom(
        this.http.put('/api/v1/drivers/vehicle', {
          companyId,
          driverId,
          ...value,
        }),
      ),
    )
  }

  async provinces(): Promise<{ id: number; name: string }[]> {
    return listResult(await firstValueFrom(this.http.get('/api/states')))
      .map(value => {
        const item = record(value)
        return { id: Number(item['id']), name: String(item['name'] ?? '') }
      })
      .filter(item => Number.isSafeInteger(item.id) && item.name)
  }

  async cities(provinceId: number): Promise<{ id: number; name: string }[]> {
    return listResult(await firstValueFrom(this.http.post('/api/states/cities', { provinceId })))
      .map(value => {
        const item = record(value)
        return { id: Number(item['id']), name: String(item['name'] ?? '') }
      })
      .filter(item => Number.isSafeInteger(item.id) && item.name)
  }

  async submitSupportTicket(subject: string, message: string): Promise<void> {
    const { companyId } = this.scope()
    const response = record(
      await firstValueFrom(
        this.http.post('/api/v1/support/tickets', {
          companyId,
          subject,
          message,
        }),
      ),
    )
    if (response['code'] !== '2000' || response['result'] !== true)
      throw new Error('The support ticket could not be submitted.')
  }
}
