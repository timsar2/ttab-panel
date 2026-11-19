import { TransportError, transportInteger, transportRecord } from '@org/transport-http'

export type RouteId = number & { readonly __routeId: unique symbol }

export function routeId(value: unknown): RouteId {
  return transportInteger(value, 1) as RouteId
}

export interface DirectionRoute {
  readonly id: RouteId
  readonly name: string
  /** Wire value is commonly HH:mm:ss; do not treat it as a Shift time. */
  readonly departureTime: string
  readonly routeGeoJson: DirectionLineString | null
}

export interface DirectionLineString {
  readonly type: 'LineString'
  readonly coordinates: readonly (readonly [longitude: number, latitude: number])[]
}

export interface DirectionRouteDraft {
  readonly companyId: number
  readonly name: string
  readonly departureTime: string
  readonly routeGeoJson: DirectionLineString | null
  readonly id?: RouteId
}

export type DirectionRouteWrite = Omit<DirectionRouteDraft, 'routeGeoJson'> & {
  readonly routeGeoJson: string | null
}

export interface DirectionPrice {
  readonly id: number | null
  readonly directionId: RouteId
  readonly fromDate: string
  readonly price: number | null
  readonly penaltyPrice: number | null
  readonly penaltyRatioWithNotify: number | null
  readonly penaltyRatioWithoutNotify: number | null
}

export type DirectionPriceDraft = Omit<DirectionPrice, 'directionId'>

export function decodeDirectionPrice(value: unknown): DirectionPrice {
  const row = transportRecord(value)
  const numeric = (key: string): number | null => {
    const value = row[key]
    if (value == null) return null
    if (typeof value === 'number' && Number.isFinite(value)) return value
    throw new TransportError('contract', 0, `The route price response contains invalid ${key}.`)
  }
  if (typeof row['fromDate'] !== 'string')
    throw new TransportError(
      'contract',
      0,
      'The route price response is missing its effective date.',
    )
  return {
    id: row['id'] == null ? null : transportInteger(row['id'], 1),
    directionId: routeId(row['directionId']),
    fromDate: row['fromDate'],
    price: numeric('price'),
    penaltyPrice: numeric('penaltyPrice'),
    penaltyRatioWithNotify: numeric('penaltyRatioWithNotify'),
    penaltyRatioWithoutNotify: numeric('penaltyRatioWithoutNotify'),
  }
}

export interface RouteStation {
  readonly id: number
  readonly directionId: RouteId
  readonly name: string
  readonly address: string | null
  readonly orderNo: number
  readonly provinceName: string | null
  readonly cityName: string | null
  readonly cityId?: number | null
  readonly provinceId?: number | null
  readonly lat: number | null
  readonly lng: number | null
}

export interface StationDraft {
  readonly id: number | null
  readonly directionId: RouteId
  readonly name: string
  readonly address: string
  readonly cityId: number | null
  readonly coordinate: { readonly lat: number; readonly lng: number } | null
  readonly orderNo: number
}

export function decodeRoute(value: unknown): DirectionRoute {
  const row = transportRecord(value)
  if (typeof row['name'] !== 'string' || typeof row['departureTime'] !== 'string')
    throw new TransportError('contract', 0, 'The route response is missing name or departure time.')
  const routeGeoJson = decodeRouteGeoJson(row['routeGeoJson'] ?? row['RouteGeoJson'] ?? null)
  return {
    id: routeId(row['id']),
    name: row['name'],
    departureTime: row['departureTime'],
    routeGeoJson,
  }
}

function decodeRouteGeoJson(value: unknown): DirectionLineString | null {
  if (value == null || value === '') return null
  let parsed: unknown = value
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown
    } catch {
      throw new TransportError('contract', 0, 'The route response contains invalid GeoJSON.')
    }
  }
  if (!parsed || typeof parsed !== 'object')
    throw new TransportError('contract', 0, 'The route response contains invalid GeoJSON.')
  const geoJson = parsed as { type?: unknown; coordinates?: unknown; features?: unknown }
  if (geoJson.type === 'FeatureCollection' && Array.isArray(geoJson.features)) {
    const feature = geoJson.features.find(
      item =>
        !!item &&
        typeof item === 'object' &&
        (item as { geometry?: { type?: unknown } }).geometry?.type === 'LineString',
    ) as { geometry?: unknown } | undefined
    if (!feature) return null
    parsed = feature.geometry
  }
  if (!parsed || typeof parsed !== 'object')
    throw new TransportError('contract', 0, 'The route response contains invalid GeoJSON.')
  const line = parsed as { type?: unknown; coordinates?: unknown }
  if (line.type !== 'LineString' || !Array.isArray(line.coordinates))
    throw new TransportError('contract', 0, 'The route response must be a GeoJSON LineString.')
  const coordinates = line.coordinates.map(coordinate => {
    if (
      !Array.isArray(coordinate) ||
      coordinate.length < 2 ||
      !Number.isFinite(coordinate[0]) ||
      !Number.isFinite(coordinate[1]) ||
      coordinate[0] < -180 ||
      coordinate[0] > 180 ||
      coordinate[1] < -90 ||
      coordinate[1] > 90
    )
      throw new TransportError('contract', 0, 'The route LineString contains invalid coordinates.')
    return [coordinate[0], coordinate[1]] as const
  })
  if (coordinates.length < 2)
    throw new TransportError(
      'contract',
      0,
      'A route LineString must contain at least two coordinates.',
    )
  return { type: 'LineString', coordinates }
}

function nullableText(value: unknown, field: string): string | null {
  if (value == null || typeof value === 'string') return value ?? null
  throw new TransportError('contract', 0, `The station response contains an invalid ${field}.`)
}

function nullableCoordinate(value: unknown, field: string): number | null {
  if (value === null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new TransportError('contract', 0, `The station response contains an invalid ${field}.`)
}

export function decodeStation(value: unknown): RouteStation {
  const row = transportRecord(value)
  if (typeof row['name'] !== 'string')
    throw new TransportError('contract', 0, 'The station response is missing its name.')
  return {
    id: transportInteger(row['id'], 1),
    directionId: routeId(row['directionId']),
    name: row['name'],
    address: nullableText(row['address'], 'address'),
    orderNo: transportInteger(row['orderNo'], 0),
    provinceName: nullableText(row['provinceName'], 'province'),
    cityName: nullableText(row['cityName'], 'city'),
    cityId: row['cityId'] == null ? null : transportInteger(row['cityId'], 1),
    provinceId: row['provinceId'] == null ? null : transportInteger(row['provinceId'], 1),
    lat: nullableCoordinate(row['lat'], 'latitude'),
    lng: nullableCoordinate(row['lng'], 'longitude'),
  }
}

export function routeWrite(draft: DirectionRouteDraft): DirectionRouteWrite {
  if (!Number.isSafeInteger(draft.companyId) || draft.companyId < 1)
    throw new TransportError('validation', 0, 'A valid company is required.')
  if (!draft.name.trim())
    throw new TransportError('validation', 0, 'Enter a route name.', {
      name: ['Enter a route name.'],
    })
  if (!isTimeValue(draft.departureTime))
    throw new TransportError('validation', 0, 'Enter a valid first-station departure time.', {
      departureTime: ['Enter a valid time.'],
    })
  return {
    companyId: draft.companyId,
    name: draft.name.trim(),
    departureTime: draft.departureTime,
    routeGeoJson:
      draft.routeGeoJson === null ? null : JSON.stringify(decodeRouteGeoJson(draft.routeGeoJson)),
    ...(draft.id === undefined ? {} : { id: routeId(draft.id) }),
  }
}

export function isTimeValue(value: string): boolean {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!match) return false
  return Number(match[1]) <= 23 && Number(match[2]) <= 59 && Number(match[3] ?? 0) <= 59
}

export function timeInputValue(value: string): string {
  return isTimeValue(value) ? value.slice(0, 5) : ''
}
