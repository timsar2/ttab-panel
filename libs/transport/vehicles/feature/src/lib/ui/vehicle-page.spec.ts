import { vehiclePageQuery } from './vehicle-page'

describe('vehiclePageQuery', () => {
  it('maps valid URL paging to zero-based table paging', () => {
    expect(vehiclePageQuery('3', '25')).toEqual({ pageIndex: 2, pageSize: 25 })
  })

  it('rejects invalid page values and uses a supported default page size', () => {
    expect(vehiclePageQuery('0', '17')).toEqual({ pageIndex: 0, pageSize: 10 })
    expect(vehiclePageQuery('999999999999999999999', '50')).toEqual({ pageIndex: 0, pageSize: 50 })
  })
})
