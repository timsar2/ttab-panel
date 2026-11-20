// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./mapbox-polyline.d.ts" />
import * as polyline from '@mapbox/polyline'

export const ROUTE_POLYLINE_PRECISION = 5

export interface GeoJsonLineString {
  readonly type: 'LineString'
  readonly coordinates: readonly (readonly [longitude: number, latitude: number])[]
}

export function encodeRoutePolyline(
  geometry: GeoJsonLineString | null,
  precision = ROUTE_POLYLINE_PRECISION,
): string | null {
  if (!geometry || geometry.type !== 'LineString' || !isGeoJsonCoordinates(geometry.coordinates))
    return null
  return polyline.encode(
    geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
    precision,
  )
}

export function decodeRoutePolyline(
  encoded: unknown,
  precision = ROUTE_POLYLINE_PRECISION,
): GeoJsonLineString | null {
  if (typeof encoded !== 'string' || !encoded.trim()) return null
  try {
    const decoded = polyline.decode(encoded, precision)
    if (!isLatLngCoordinates(decoded)) return null
    return {
      type: 'LineString',
      coordinates: decoded.map(([latitude, longitude]) => [longitude, latitude] as const),
    }
  } catch {
    return null
  }
}

export function decodeRouteGeometry(value: unknown): GeoJsonLineString | null {
  if (value == null || value === '') return null
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return decodeGeoJsonGeometry(parsed)
    } catch {
      return decodeRoutePolyline(value)
    }
  }
  return decodeGeoJsonGeometry(value)
}

function decodeGeoJsonGeometry(value: unknown): GeoJsonLineString | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { type?: unknown; coordinates?: unknown; features?: unknown }
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
    return feature ? decodeGeoJsonGeometry(feature.geometry) : null
  }
  if (candidate.type !== 'LineString' || !Array.isArray(candidate.coordinates)) return null
  const coordinates = candidate.coordinates
  if (!isGeoJsonCoordinates(coordinates as readonly (readonly number[])[])) return null
  return {
    type: 'LineString',
    coordinates: coordinates.map(point => [point[0], point[1]] as const),
  }
}

function isGeoJsonCoordinates(value: readonly (readonly number[])[]): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(
      point =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1]) &&
        point[0] >= -180 &&
        point[0] <= 180 &&
        point[1] >= -90 &&
        point[1] <= 90,
    )
  )
}

function isLatLngCoordinates(value: readonly (readonly number[])[]): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(
      point =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1]) &&
        point[0] >= -90 &&
        point[0] <= 90 &&
        point[1] >= -180 &&
        point[1] <= 180,
    )
  )
}
