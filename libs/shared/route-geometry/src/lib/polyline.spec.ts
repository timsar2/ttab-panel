import {
  decodeRouteGeometry,
  decodeRoutePolyline,
  encodeRoutePolyline,
  ROUTE_POLYLINE_PRECISION,
} from './polyline'

describe('route polyline conversion', () => {
  const knownLine = {
    type: 'LineString' as const,
    coordinates: [
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ] as const,
  }

  it('uses Google encoded polyline precision 5 and swaps GeoJSON coordinate order', () => {
    expect(ROUTE_POLYLINE_PRECISION).toBe(5)
    expect(encodeRoutePolyline(knownLine)).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@')
    expect(decodeRoutePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual(knownLine)
  })

  it('preserves route coordinates within precision-5 rounding tolerance', () => {
    const line = {
      type: 'LineString' as const,
      coordinates: [
        [49.1980712, 36.1369437],
        [49.2044219, 36.1365511],
      ],
    }
    const decoded = decodeRoutePolyline(encodeRoutePolyline(line))
    expect(decoded?.coordinates).toHaveLength(2)
    for (const [index, point] of line.coordinates.entries()) {
      expect(decoded?.coordinates[index][0]).toBeCloseTo(point[0], 5)
      expect(decoded?.coordinates[index][1]).toBeCloseTo(point[1], 5)
    }
  })

  it('returns null for empty, malformed, out-of-range, and single-point inputs', () => {
    expect(encodeRoutePolyline(null)).toBeNull()
    expect(encodeRoutePolyline({ type: 'LineString', coordinates: [[51, 35]] })).toBeNull()
    expect(decodeRoutePolyline('')).toBeNull()
    expect(decodeRoutePolyline('not-a-polyline')).toBeNull()
    expect(decodeRoutePolyline('??')).toBeNull()
    expect(decodeRoutePolyline('_uybQ_ibE_ibE_ibE')).toBeNull()
    expect(decodeRouteGeometry(null)).toBeNull()
  })

  it('decodes legacy GeoJSON and encoded responses into MapLibre LineStrings', () => {
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
    expect(decodeRouteGeometry(encoded)).toEqual(knownLine)
    expect(decodeRouteGeometry(JSON.stringify(knownLine))).toEqual(knownLine)
    expect(
      decodeRouteGeometry({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: knownLine, properties: {} }],
      }),
    ).toEqual(knownLine)
  })
})
