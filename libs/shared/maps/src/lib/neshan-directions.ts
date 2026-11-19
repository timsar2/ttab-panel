import type { NeshanMapPoint } from './neshan-map.component'

export type MapCoordinate = readonly [longitude: number, latitude: number]
export interface NeshanLineString {
  readonly type: 'LineString'
  readonly coordinates: readonly MapCoordinate[]
}

export function decodeNeshanPolyline(value: unknown): readonly MapCoordinate[] {
  if (typeof value !== 'string' || value.length === 0)
    throw new Error('Neshan returned an invalid route geometry.')

  const coordinates: MapCoordinate[] = []
  let index = 0
  let latitude = 0
  let longitude = 0

  const readDelta = () => {
    let result = 0
    let shift = 0
    let chunk: number
    do {
      if (index >= value.length || shift > 30)
        throw new Error('Neshan returned an invalid route geometry.')
      chunk = value.charCodeAt(index++) - 63
      if (chunk < 0 || chunk > 63) throw new Error('Neshan returned an invalid route geometry.')
      result |= (chunk & 0x1f) << shift
      shift += 5
    } while (chunk >= 0x20)
    return result & 1 ? ~(result >> 1) : result >> 1
  }

  while (index < value.length) {
    latitude += readDelta()
    longitude += readDelta()
    const lat = latitude / 1e5
    const lng = longitude / 1e5
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180)
      throw new Error('Neshan returned an invalid route geometry.')
    coordinates.push([lng, lat])
  }

  if (coordinates.length < 2) throw new Error('Neshan returned an incomplete route.')
  return coordinates
}

export function neshanDirectionsUrl(
  points: readonly NeshanMapPoint[],
  baseUrl = 'https://api.neshan.org',
): string | null {
  const stops = points
    .filter(
      point =>
        point.lat !== null &&
        point.lng !== null &&
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        point.lat >= -90 &&
        point.lat <= 90 &&
        point.lng >= -180 &&
        point.lng <= 180,
    )
    .slice()
    .sort((left, right) => left.order - right.order)
  if (stops.length < 2) return null

  const position = (point: NeshanMapPoint) => `${point.lat},${point.lng}`
  const origin = position(stops[0])
  const destination = position(stops[stops.length - 1])
  const waypoints = stops.slice(1, -1).map(position)
  const query = new URLSearchParams({ origin, destination })
  if (waypoints.length) query.set('waypoints', waypoints.join('|'))
  return `${baseUrl}/v4/direction/no-traffic?${query}`
}

export function neshanRouteCoordinates(value: unknown): readonly MapCoordinate[] {
  if (!value || typeof value !== 'object') throw new Error('Neshan returned no route.')
  const routes = (value as { routes?: unknown }).routes
  if (!Array.isArray(routes) || !routes[0] || typeof routes[0] !== 'object')
    throw new Error('Neshan returned no route.')
  const geometry = (routes[0] as { overview_polyline?: unknown }).overview_polyline
  if (!geometry || typeof geometry !== 'object')
    throw new Error('Neshan returned no route geometry.')
  return decodeNeshanPolyline((geometry as { points?: unknown }).points)
}

export async function generateNeshanRouteGeoJson(
  points: readonly NeshanMapPoint[],
  apiKey: string,
): Promise<NeshanLineString | null> {
  const url = neshanDirectionsUrl(points)
  if (!url) return null
  const response = await fetch(url, { headers: { 'Api-Key': apiKey } })
  if (!response.ok) throw new Error('Neshan route request failed.')
  const coordinates = neshanRouteCoordinates(await response.json())
  return { type: 'LineString', coordinates }
}

export function parseRouteGeoJson(
  value: string | NeshanLineString | null | undefined,
): NeshanLineString | null {
  if (!value) return null
  let parsed: unknown = value
  try {
    if (typeof parsed === 'string') parsed = JSON.parse(parsed) as unknown
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const candidate = parsed as { type?: unknown; coordinates?: unknown; features?: unknown }
  let line: unknown = candidate
  if (candidate.type === 'FeatureCollection' && Array.isArray(candidate.features)) {
    const feature = candidate.features.find(item => {
      if (!item || typeof item !== 'object') return false
      const geometry = (item as { geometry?: unknown }).geometry
      return (
        !!geometry &&
        typeof geometry === 'object' &&
        (geometry as { type?: unknown }).type === 'LineString'
      )
    }) as { geometry?: unknown } | undefined
    line = feature?.geometry
  }
  if (!line || typeof line !== 'object') return null
  const geometry = line as { type?: unknown; coordinates?: unknown }
  if (geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) return null
  const coordinates = geometry.coordinates
  if (
    coordinates.length < 2 ||
    coordinates.some(
      point =>
        !Array.isArray(point) ||
        point.length < 2 ||
        !Number.isFinite(point[0]) ||
        !Number.isFinite(point[1]),
    )
  )
    return null
  return { type: 'LineString', coordinates: coordinates as MapCoordinate[] }
}
