import { RouteStation, routeId } from '@org/transport-routes-data-access'
import { routeMapPoints } from './route-map-page'

describe('routeMapPoints', () => {
  it('keeps zero coordinates and omits stations without valid coordinates', () => {
    const stations: RouteStation[] = [
      {
        id: 4,
        directionId: routeId(42),
        name: 'Origin',
        address: null,
        orderNo: 0,
        provinceName: null,
        cityName: null,
        lat: 0,
        lng: 0,
      },
      {
        id: 5,
        directionId: routeId(42),
        name: 'Missing',
        address: null,
        orderNo: 1,
        provinceName: null,
        cityName: null,
        lat: null,
        lng: 51,
      },
      {
        id: 6,
        directionId: routeId(42),
        name: 'Out of range',
        address: null,
        orderNo: 2,
        provinceName: null,
        cityName: null,
        lat: 95,
        lng: 51,
      },
    ]

    expect(routeMapPoints(stations)).toEqual([{ id: 4, order: 0, name: 'Origin', lat: 0, lng: 0 }])
  })
})
