import {
  decodeRoute,
  decodeStation,
  isTimeValue,
  routeId,
  routeWrite,
  timeInputValue,
} from './route.models'

describe('Direction adapters', () => {
  it('preserves Route identity, first-stop departure time and zero coordinates', () => {
    expect(decodeRoute({ id: 42, name: 'االا', departureTime: '17:51:00' })).toEqual({
      id: 42,
      name: 'االا',
      departureTime: '17:51:00',
      routeGeometry: null,
    })
    expect(
      decodeStation({
        id: 7,
        directionId: 42,
        name: 'Origin',
        address: null,
        orderNo: 0,
        provinceName: null,
        cityName: null,
        lat: 0,
        lng: 0,
      }),
    ).toMatchObject({ id: 7, directionId: 42, orderNo: 0, lat: 0, lng: 0 })
  })

  it('decodes station detail responses without list-only province and city names', () => {
    expect(
      decodeStation({
        directionId: 2,
        name: 'بیمارستان امید',
        provinceId: 14,
        cityId: 197,
        address: 'شهرک جنب بیمارستان امید',
        lat: 36.1370347586449,
        lng: 49.198048710823066,
        orderNo: 1,
        id: 8,
      }),
    ).toEqual({
      id: 8,
      directionId: 2,
      name: 'بیمارستان امید',
      address: 'شهرک جنب بیمارستان امید',
      orderNo: 1,
      provinceName: null,
      cityName: null,
      cityId: 197,
      provinceId: 14,
      lat: 36.1370347586449,
      lng: 49.198048710823066,
    })
  })

  it('maps time input display without losing the source seconds value in API reads', () => {
    expect(timeInputValue('17:51:00')).toBe('17:51')
    expect(isTimeValue('23:59:59')).toBe(true)
    expect(isTimeValue('24:00')).toBe(false)
    expect(
      routeWrite({
        companyId: 1,
        id: routeId(42),
        name: ' Route ',
        departureTime: '17:51',
        routeGeometry: {
          type: 'LineString',
          coordinates: [
            [51.4, 35.7],
            [51.5, 35.8],
          ],
        },
      }),
    ).toEqual({
      companyId: 1,
      id: 42,
      name: 'Route',
      departureTime: '17:51',
      encodedPolyline: '_t{xE_avxH_pR_pR',
    })
  })

  it('decodes encoded polylines and legacy GeoJSON responses to LineString geometry', () => {
    const line = {
      type: 'LineString',
      coordinates: [
        [51.4, 35.7],
        [51.5, 35.8],
      ],
    }
    expect(
      decodeRoute({
        id: 2,
        name: 'Route',
        departureTime: '08:00:00',
        routeGeoJson: JSON.stringify(line),
      }).routeGeometry,
    ).toEqual(line)
    expect(
      decodeRoute({
        id: 2,
        name: 'Route',
        departureTime: '08:00:00',
        encodedPolyline: '_t{xE_avxH_pR_pR',
      }).routeGeometry,
    ).toEqual(line)
    expect(
      decodeRoute({
        id: 2,
        name: 'Route',
        departureTime: '08:00:00',
        routeGeoJson: JSON.stringify({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: line, properties: {} }],
        }),
      }).routeGeometry,
    ).toEqual(line)
  })
})
