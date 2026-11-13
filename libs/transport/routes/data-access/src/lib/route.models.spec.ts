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

  it('maps time input display without losing the source seconds value in API reads', () => {
    expect(timeInputValue('17:51:00')).toBe('17:51')
    expect(isTimeValue('23:59:59')).toBe(true)
    expect(isTimeValue('24:00')).toBe(false)
    expect(
      routeWrite({ companyId: 1, id: routeId(42), name: ' Route ', departureTime: '17:51' }),
    ).toEqual({
      companyId: 1,
      id: 42,
      name: 'Route',
      departureTime: '17:51',
    })
  })
})
