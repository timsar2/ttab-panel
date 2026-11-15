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
  id: number
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
    const { driverId, companyId } = this.scope()
    const response = await firstValueFrom(
      this.http.post<unknown>('/api/v1/drivers/available-routes', {
        companyId,
        driverId,
      }),
    )
    return listResult(response)
      .map(value => {
        const item = record(value)
        return {
          id: Number(item['id']),
          lineName: String(item['lineName'] ?? ''),
          tripTypeName: String(item['tripTypeName'] ?? ''),
          shiftTime: String(item['shiftTime'] ?? ''),
          departureTime: String(item['departureTime'] ?? ''),
          directionId: Number(item['directionId']),
          driverLineId: Number(item['driverLineId']),
          shiftTimeId: Number(item['shiftTimeId']),
          tripTypeId: Number(item['tripTypeId']),
        }
      })
      .filter(item => Number.isSafeInteger(item.id))
  }

  async activeTrip(): Promise<ActiveTrip | null> {
    const { driverId } = this.scope()
    const response = await firstValueFrom(
      this.http.get<unknown>(`/api/v1/trips/driver-active-trip/${driverId}`, {
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
    const stations = Array.isArray(value['Stations'])
      ? value['Stations'].map((raw: unknown, index: number) => {
          const item = record(raw)
          const passengers = Array.isArray(item['Passengers'])
            ? item['Passengers'].map((p: unknown) => {
                const passenger = record(p)
                return {
                  id: Number(passenger['Id']),
                  fullName: String(passenger['FullName'] ?? ''),
                  mobileNumber: String(passenger['MobileNumber'] ?? ''),
                  profileImage:
                    typeof passenger['ProfileImage'] === 'string'
                      ? passenger['ProfileImage']
                      : null,
                  isAbsent: Boolean(passenger['IsAbsent']),
                }
              })
            : []
          return {
            id: Number(item['Id']),
            name: String(item['Name'] ?? ''),
            address: typeof item['Address'] === 'string' ? item['Address'] : undefined,
            lat: typeof item['Lat'] === 'number' ? item['Lat'] : undefined,
            lng: typeof item['Lng'] === 'number' ? item['Lng'] : undefined,
            order: index + 1,
            passengers,
          }
        })
      : []
    const vehicle = record(value['Vehicle'] ?? {})
    return {
      id: Number(value['Id']),
      driverLineId: Number(value['DriverLineId']),
      shiftTimeId: Number(value['ShiftTimeId']),
      tripTypeId: Number(value['TripTypeId']),
      directionId: Number(value['DirectionId']),
      lineName: String(value['LineName'] ?? ''),
      tripTypeName: String(value['TripTypeName'] ?? ''),
      shiftTime: String(value['ShiftTime'] ?? ''),
      departureTime: String(value['DepartureTime'] ?? ''),
      stations,
      vehicle: {
        type: String(vehicle['Type'] ?? ''),
        plate: String(vehicle['Plate'] ?? ''),
        color: String(vehicle['Color'] ?? ''),
        year: Number(vehicle['Year'] ?? 0),
        capacity: Number(vehicle['Capacity'] ?? 0),
        image: typeof vehicle['Image'] === 'string' ? vehicle['Image'] : null,
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
    const { companyId } = this.scope()
    const response = record(
      await firstValueFrom(
        this.http.post('/api/v1/trips/start', {
          companyId,
          ...request,
        }),
      ),
    )
    if (response['code'] !== '2000' || response['result'] !== true)
      throw new Error('The trip could not be started.')
  }

  async submitStationArrival(request: StationArrivalRequest): Promise<void> {
    const { companyId } = this.scope()
    const response = record(
      await firstValueFrom(
        this.http.post('/api/v1/trips/station-arrival', {
          companyId,
          ...request,
        }),
      ),
    )
    if (response['code'] !== '2000' || response['result'] !== true)
      throw new Error('The station arrival was not confirmed.')
  }

  async endTrip(request: EndTripRequest): Promise<void> {
    const { companyId } = this.scope()
    const response = record(
      await firstValueFrom(
        this.http.post('/api/v1/trips/end', {
          companyId,
          ...request,
        }),
      ),
    )
    if (response['code'] !== '2000' || response['result'] !== true)
      throw new Error('The trip could not be ended.')
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
