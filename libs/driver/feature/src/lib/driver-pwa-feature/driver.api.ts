import { HttpClient } from '@angular/common/http'
import { inject, Injectable, InjectionToken } from '@angular/core'
import { ShiftTimesStore } from '@org/transport-scheduling-data-access'
import { firstValueFrom } from 'rxjs'
import { decodeRouteGeometry, type GeoJsonLineString } from '@org/shared-route-geometry'

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

export interface DriverHomeDetails {
  readonly driver: Record<string, unknown>
  readonly vehicle: {
    readonly name: string | null
    readonly plate: string | null
    readonly color: string | null
    readonly year: number | null
    readonly capacity: number | null
    readonly image: string | null
  }
}

export interface RouteCard {
  id: string
  directionName?: string
  lineName: string
  tripTypeName: string
  shiftTime: string
  departureTime: string
  directionId: number
  driverLineId: number
  shiftTimeId: number
  tripTypeId: number
  status?: string
  driverName?: string | null
  vehicleInfo?: string | null
  passengerCount?: number | null
  estimatedMinutes?: number | null
}

export interface DriverRoutesPagination {
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface DriverRoutesPage {
  list: RouteCard[]
  pagination: DriverRoutesPagination
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
  routeGeoJson: GeoJsonLineString | null
}

export interface DriverSupportViolationType {
  id: number
  code: string | null
  title: string
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
  documentType: 'nationalId' | 'drivingLicense' | 'smartCard' | 'vehicle' | 'card' | 'insurance'
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
  private readonly shiftTimes = inject(ShiftTimesStore)
  private activeTripCache: ActiveTrip | null | undefined

  async activeTripForStation(): Promise<ActiveTrip | null> {
    return this.activeTripCache === undefined ? this.activeTrip() : this.activeTripCache
  }

  cachedActiveTrip(): ActiveTrip | null {
    return this.activeTripCache ?? null
  }

  private tripProgressKey(driverId: number): string {
    return `driver-active-trip-progress:${driverId}`
  }

  private savedNextStationId(driverId: number, tripId: number): number | null {
    if (typeof sessionStorage === 'undefined') return null
    try {
      const saved = sessionStorage.getItem(this.tripProgressKey(driverId))
      if (!saved) return null
      const progress = record(JSON.parse(saved) as unknown)
      if (Number(progress['tripId']) !== tripId) return null
      const nextStationId = Number(progress['nextStationId'])
      return Number.isSafeInteger(nextStationId) && nextStationId > 0 ? nextStationId : null
    } catch {
      return null
    }
  }

  advanceToStation(tripId: number, nextStationId: number): void {
    const { driverId } = this.scope()
    if (this.activeTripCache?.id === tripId) {
      const stationIndex = this.activeTripCache.stations.findIndex(
        station => station.id === nextStationId,
      )
      if (stationIndex >= 0) {
        this.activeTripCache = { ...this.activeTripCache, nextStationId }
      }
    }
    if (typeof sessionStorage === 'undefined') return
    try {
      sessionStorage.setItem(
        this.tripProgressKey(driverId),
        JSON.stringify({ tripId, nextStationId }),
      )
    } catch {
      // Storage may be unavailable; the current station page still advances in memory.
    }
  }

  private clearTripProgress(driverId: number): void {
    if (typeof sessionStorage === 'undefined') return
    try {
      sessionStorage.removeItem(this.tripProgressKey(driverId))
    } catch {
      // Storage may be unavailable.
    }
  }

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

  private async vehicleSearchResult(driverId: number): Promise<Record<string, unknown>> {
    const response = record(
      await firstValueFrom(this.http.post('/api/v1/vehicle/search', { driverId })),
    )
    if (response['code'] !== '2000') throw new Error('Vehicle search failed.')
    const result = property(response, 'result')
    const vehicles = Array.isArray(result)
      ? result
      : result && typeof result === 'object' && Array.isArray(property(record(result), 'list'))
        ? (property(record(result), 'list') as unknown[])
        : result && typeof result === 'object'
          ? [result]
          : []
    const first = vehicles.length > 0 ? record(vehicles[0]) : null
    if (!first) throw new Error('No vehicle is registered yet.')
    const id = Number(property(first, 'id') ?? property(first, 'vehicleId'))
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('No vehicle is registered yet.')
    return first
  }

  private async currentVehicle(driverId: number): Promise<Record<string, unknown>> {
    const vehicle = await this.vehicleSearchResult(driverId)
    const id = Number(property(vehicle, 'id') ?? property(vehicle, 'vehicleId'))
    return dataResult(await firstValueFrom(this.http.get(`/api/v1/vehicles/${id}`)))
  }

  private async fileUploadPayload(file: File): Promise<{ extension: string; data: string }> {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !['jpg', 'jpeg', 'png', 'webp'].includes(extension))
      throw new Error('Only JPG, PNG, and WebP images can be uploaded.')
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () =>
        typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('The selected file could not be read.'))
      reader.onerror = () => reject(new Error('The selected file could not be read.'))
      reader.readAsDataURL(file)
    })
    return { extension: `.${extension}`, data }
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

  async driverHomeDetails(): Promise<DriverHomeDetails> {
    const { driverId } = this.scope()
    const [driver, vehicle] = await Promise.all([
      firstValueFrom(this.http.get<unknown>(`/api/v1/drivers/${driverId}`)).then(dataResult),
      this.vehicleSearchResult(driverId),
    ])
    return {
      driver,
      vehicle: {
        name:
          typeof property(vehicle, 'carTypeName') === 'string'
            ? (property(vehicle, 'carTypeName') as string)
            : null,
        plate:
          typeof property(vehicle, 'carPlate') === 'string'
            ? (property(vehicle, 'carPlate') as string)
            : null,
        color:
          typeof property(vehicle, 'color') === 'string'
            ? (property(vehicle, 'color') as string)
            : null,
        year:
          typeof property(vehicle, 'produnctionYear') === 'number'
            ? (property(vehicle, 'produnctionYear') as number)
            : null,
        capacity:
          typeof property(vehicle, 'capacity') === 'number'
            ? (property(vehicle, 'capacity') as number)
            : null,
        image:
          typeof property(vehicle, 'carImage') === 'string'
            ? (property(vehicle, 'carImage') as string)
            : null,
      },
    }
  }

  async availableRoutes(pageNumber = 1, pageSize = 10): Promise<RouteCard[]> {
    return (await this.availableRoutesPage(pageNumber, pageSize)).list
  }

  async availableRoutesPage(pageNumber = 1, pageSize = 10): Promise<DriverRoutesPage> {
    const { driverId, companyId } = this.scope()
    await this.shiftTimes.ensureLoaded()
    const tripRows = await this.driverTrips(driverId)
    const lineIdsByDirection = new Map<number, Set<number>>()
    for (const value of tripRows) {
      const trip = record(value)
      const directionId = Number(property(trip, 'directionId'))
      const lineId = Number(property(trip, 'lineId'))
      if (!Number.isSafeInteger(directionId) || !Number.isSafeInteger(lineId)) continue
      const lineIds = lineIdsByDirection.get(directionId) ?? new Set<number>()
      lineIds.add(lineId)
      lineIdsByDirection.set(directionId, lineIds)
    }

    const lineLists = await Promise.all(
      [...lineIdsByDirection].map(async ([directionId]) => ({
        directionId,
        lines: await this.linesForDirection(companyId, directionId),
      })),
    )
    const linesByDirectionAndId = new Map<string, Record<string, unknown>>()
    for (const { directionId, lines } of lineLists) {
      for (const line of lines) {
        const id = Number(property(line, 'id'))
        if (Number.isSafeInteger(id)) linesByDirectionAndId.set(`${directionId}:${id}`, line)
      }
    }

    const list: RouteCard[] = tripRows.map(value => {
      const trip = record(value)
      const directionId = Number(property(trip, 'directionId'))
      const lineId = Number(property(trip, 'lineId'))
      const line = linesByDirectionAndId.get(`${directionId}:${lineId}`)
      const tripTypeName = String(property(trip, 'tripTypeName') ?? '')
      const isReturn = /برگشت|return|inbound/i.test(tripTypeName)
      const assignedShiftName = line
        ? property(line, isReturn ? 'returnShiftTimeName' : 'entranceShiftTimeName')
        : undefined
      const tripShiftName = property(trip, 'shiftTimeName')
      const tripShiftId = Number(property(trip, 'shiftTimeId'))
      const shift =
        this.shiftTimes.byId().get(tripShiftId) ??
        this.shiftTimes.findByName(
          typeof assignedShiftName === 'string' ? assignedShiftName : undefined,
        ) ??
        this.shiftTimes.findByName(typeof tripShiftName === 'string' ? tripShiftName : undefined)
      const driverLineId = Number(property(trip, 'driverLineId'))
      const tripTypeId = Number(property(trip, 'tripTypeId'))
      return {
        id: `${driverLineId}-${tripTypeId}-${shift?.id ?? tripShiftId}`,
        directionName: String(
          property(line ?? trip, 'directionName') ?? property(trip, 'directionName') ?? '',
        ),
        lineName: String(property(line ?? trip, 'name') ?? property(trip, 'lineName') ?? ''),
        tripTypeName,
        shiftTime: shift?.name ?? String(assignedShiftName ?? tripShiftName ?? ''),
        departureTime: shift?.shiftTime ?? String(property(trip, 'departureTime') ?? ''),
        directionId,
        driverLineId,
        shiftTimeId: shift?.id ?? tripShiftId,
        tripTypeId,
      }
    })
    if (
      list.some(
        route =>
          !Number.isSafeInteger(route.driverLineId) || !Number.isSafeInteger(route.directionId),
      )
    )
      throw new Error('Invalid assigned-route response.')

    const rawPagination = {
      totalCount: list.length,
      totalPages: Math.ceil(list.length / pageSize),
    }
    const pagination: DriverRoutesPagination = {
      pageNumber: Number(property(rawPagination, 'pageNumber') ?? pageNumber),
      pageSize: Number(property(rawPagination, 'pageSize') ?? pageSize),
      totalCount: Number(property(rawPagination, 'totalCount')),
      totalPages: Number(property(rawPagination, 'totalPages') ?? 1),
      hasPreviousPage: pageNumber > 1,
      hasNextPage: pageNumber < Number(property(rawPagination, 'totalPages')),
    }
    const offset = (pageNumber - 1) * pageSize
    return { list: list.slice(offset, offset + pageSize), pagination }
  }

  private async driverTrips(driverId: number): Promise<unknown[]> {
    const response = await firstValueFrom(
      this.http.get<unknown>(`/api/v1/trips/driver/${driverId}`),
    )
    if (Array.isArray(response)) return response
    const result = property(record(response), 'result')
    if (Array.isArray(result)) return result
    throw new Error('Invalid assigned-route response.')
  }

  private async linesForDirection(
    companyId: number,
    directionId: number,
  ): Promise<Record<string, unknown>[]> {
    const lines: Record<string, unknown>[] = []
    let pageNumber = 1
    let totalPages = 1
    do {
      const payload = dataResult(
        await firstValueFrom(
          this.http.post('/api/v1/lines/search', {
            companyId,
            directionId,
            pageNumber,
            pageSize: 100,
          }),
        ),
      )
      if (!Array.isArray(payload['list'])) throw new Error('Invalid line lookup response.')
      lines.push(...payload['list'].map(record))
      const pagination = record(payload['pagination'])
      totalPages = Number(
        property(pagination, 'totalPages') ?? property(pagination, 'totalPage') ?? 1,
      )
      pageNumber += 1
    } while (pageNumber <= totalPages)
    return lines
  }

  async activeTrip(): Promise<ActiveTrip | null> {
    const { driverId } = this.scope()
    const response = await firstValueFrom(
      this.http.get<unknown>(`/api/v1/trips/active-trip/${driverId}`, {
        observe: 'response',
      }),
    )
    if (response.status === 204 || response.body == null) {
      this.activeTripCache = null
      return null
    }
    let body: unknown = response.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body) as unknown
      } catch {
        throw new Error('Invalid active-trip response.')
      }
    }
    const envelope = record(body)
    if ('result' in envelope && envelope['result'] == null) {
      this.activeTripCache = null
      return null
    }
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
    const trip: ActiveTrip = {
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
      routeGeoJson: decodeRouteGeometry(
        property(value, 'encodedPolyline') ?? property(value, 'routeGeoJson'),
      ),
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
    try {
      trip.routeGeoJson = (await this.directionRouteGeometry(trip.directionId)) ?? trip.routeGeoJson
    } catch {
      // Keep using route geometry embedded in the active-trip response if detail lookup fails.
    }
    const savedNextStationId = this.savedNextStationId(driverId, trip.id)
    if (savedNextStationId !== null) {
      const savedIndex = trip.stations.findIndex(station => station.id === savedNextStationId)
      const serverIndex = trip.stations.findIndex(station => station.id === trip.nextStationId)
      if (savedIndex > serverIndex) trip.nextStationId = savedNextStationId
      else this.clearTripProgress(driverId)
    }
    this.activeTripCache = trip
    return trip
  }

  private async directionRouteGeometry(directionId: number): Promise<GeoJsonLineString | null> {
    if (!Number.isSafeInteger(directionId) || directionId <= 0)
      throw new Error('The active trip has an invalid direction id.')
    const result = dataResult(
      await firstValueFrom(this.http.get(`/api/v1/directions/${directionId}`)),
    )
    if (Number(property(result, 'id')) !== directionId)
      throw new Error('The direction response does not match the active trip.')
    return decodeRouteGeometry(property(result, 'encodedPolyline'))
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
    this.activeTripCache = undefined
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
    const { driverId } = this.scope()
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
    this.clearTripProgress(driverId)
    this.activeTripCache = null
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
    if (
      request.documentType === 'vehicle' ||
      request.documentType === 'card' ||
      request.documentType === 'insurance'
    ) {
      const current = await this.currentVehicle(driverId)
      const imageProperty = {
        vehicle: 'carImage',
        card: 'carCardImage',
        insurance: 'carInsuranceImage',
      }[request.documentType]
      const saved = dataResult(
        await firstValueFrom(
          this.http.post('/api/v1/vehicles', {
            id: property(current, 'id'),
            driverId,
            vehicleTypeId: property(current, 'vehicleTypeId'),
            carPlate: property(current, 'carPlate'),
            color: property(current, 'color'),
            produnctionYear: property(current, 'produnctionYear'),
            capacity: property(current, 'capacity'),
            [imageProperty]: await this.fileUploadPayload(request.file),
          }),
        ),
      )
      const path = property(saved, imageProperty)
      return typeof path === 'string' ? path : ''
    }

    const formData = new FormData()
    formData.append('driverId', String(driverId))
    formData.append('companyId', String(companyId))
    formData.append('documentType', request.documentType)
    formData.append('file', request.file)
    if (request.licenceLevel) formData.append('licenceLevel', request.licenceLevel)
    const response = record(
      await firstValueFrom(this.http.post('/api/v1/drivers/upload-document', formData)),
    )
    if (response['code'] !== '2000' || typeof response['result'] !== 'string')
      throw new Error('The document could not be uploaded.')
    return response['result']
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
    const { driverId } = this.scope()
    const current = await this.currentVehicle(driverId)
    const requestedTypeId = Number(value['vehicleType'])
    dataResult(
      await firstValueFrom(
        this.http.post('/api/v1/vehicles', {
          id: property(current, 'id'),
          driverId,
          vehicleTypeId:
            Number.isSafeInteger(requestedTypeId) && requestedTypeId > 0
              ? requestedTypeId
              : property(current, 'vehicleTypeId'),
          carPlate: value['vehiclePlate'] ?? property(current, 'carPlate'),
          color: value['vehicleColor'] ?? property(current, 'color'),
          produnctionYear: value['vehicleYear'] ?? property(current, 'produnctionYear'),
          capacity: value['vehicleCapacity'] ?? property(current, 'capacity'),
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

  async supportViolationTypes(personTypeId: 1 | 2): Promise<DriverSupportViolationType[]> {
    const response = record(
      await firstValueFrom(this.http.get(`/api/v1/support/violation-types/${personTypeId}`)),
    )
    const result = response['result']
    if (response['code'] !== '2000' || !Array.isArray(result)) {
      throw new Error('Support violation types could not be loaded.')
    }
    return result.map(value => {
      const item = record(value)
      const id = Number(property(item, 'id'))
      const title = property(item, 'title')
      const code = property(item, 'code')
      if (!Number.isSafeInteger(id) || id <= 0 || typeof title !== 'string') {
        throw new Error('The support service returned an invalid violation type.')
      }
      return { id, title, code: typeof code === 'string' ? code : null }
    })
  }

  async submitSupportReport(request: {
    supportTypeId: 3 | 4
    subject: string
    body: string
    reportedPersonId: number
    tripId: number
    violationTypeId: number
    occurredAt: string
  }): Promise<void> {
    const response = record(
      await firstValueFrom(
        this.http.post('/api/v1/support', {
          Id: 0,
          SupportTypeId: request.supportTypeId,
          Subject: request.subject,
          Body: request.body,
          ReportedPersonId: request.reportedPersonId,
          TripId: request.tripId,
          ViolationTypeIds: String(request.violationTypeId),
          OccureAt: request.occurredAt,
        }),
      ),
    )
    if (response['code'] !== '2000') throw new Error('The support report could not be submitted.')
  }
}
