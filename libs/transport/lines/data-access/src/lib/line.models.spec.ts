import { departureTimeId } from '@org/transport-departure-times-data-access'
import { routeId } from '@org/transport-routes-data-access'
import { decodeLine, decodeLineRow, lineWrite } from './line.models'

describe('Line contract adapters', () => {
  it('accepts the current Shift Time projection and the legacy misspelled alias', () => {
    expect(
      decodeLineRow({
        id: 5,
        directionId: 2,
        directionName: 'ابهر بیمارستان امید',
        name: 'اداری ثابت',
        entranceShiftTimeName: 'سرویس صبح',
        returnShiftTimeName: 'سرویس عصر',
      }),
    ).toMatchObject({
      name: 'اداری ثابت',
      entranceShiftTimeName: 'سرویس صبح',
      returnShiftTimeName: 'سرویس عصر',
    })
    expect(
      decodeLineRow({
        id: 6,
        directionId: 2,
        name: 'Legacy Line',
        enteranceShiftTimeName: 10,
      }).entranceShiftTimeName,
    ).toBe('10')
  })

  it('preserves optional service-time links and prevents writing a different parent Direction', () => {
    const line = decodeLine({
      id: 5,
      directionId: 42,
      name: 'اداری ثابت',
      entranceShiftTimeId: null,
      returnShiftTimeId: null,
      entranceShiftTimeName: null,
      returnShiftTimeName: null,
    })
    expect(line).toMatchObject({
      directionId: 42,
      entranceShiftTimeId: null,
      returnShiftTimeId: null,
    })
    expect(
      lineWrite(2, routeId(42), {
        directionId: routeId(42),
        name: 'Line',
        entranceShiftTimeId: departureTimeId(10),
        returnShiftTimeId: null,
      }),
    ).toEqual({
      companyId: 2,
      directionId: 42,
      name: 'Line',
      entranceShiftTimeId: 10,
      returnShiftTimeId: null,
    })
    expect(() => lineWrite(2, routeId(42), { ...line, directionId: routeId(3) })).toThrow()
  })
})
