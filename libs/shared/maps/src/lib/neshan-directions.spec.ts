import type { NeshanMapPoint } from './neshan-map.component'
import {
  decodeNeshanPolyline,
  neshanDirectionsUrl,
  neshanRouteCoordinates,
} from './neshan-directions'

const point = (
  id: number,
  order: number,
  lat: number | null,
  lng: number | null,
): NeshanMapPoint => ({
  id,
  order,
  name: `Station ${id}`,
  lat,
  lng,
})

describe('Neshan directions', () => {
  it('builds an ordered no-traffic request with intermediate stations as waypoints', () => {
    const url = neshanDirectionsUrl(
      [point(3, 3, 35.3, 51.3), point(1, 1, 35.1, 51.1), point(2, 2, 35.2, 51.2)],
      'https://api.example.test',
    )
    expect(url).toBe(
      'https://api.example.test/v4/direction/no-traffic?origin=35.1%2C51.1&destination=35.3%2C51.3&waypoints=35.2%2C51.2',
    )
  })

  it('decodes encoded route geometry from Neshan response', () => {
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
    const expected = [
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]
    expect(decodeNeshanPolyline(encoded)).toEqual(expected)
    expect(
      neshanRouteCoordinates({ routes: [{ overview_polyline: { points: encoded } }] }),
    ).toEqual(expected)
  })

  it('does not request a route until two stations have valid coordinates', () => {
    expect(neshanDirectionsUrl([point(1, 1, 35, 51), point(2, 2, null, 52)])).toBeNull()
  })
})
