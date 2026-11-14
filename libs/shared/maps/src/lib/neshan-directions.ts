import type { NeshanMapPoint } from './neshan-map.component'

export type MapCoordinate = readonly [longitude: number, latitude: number]

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
