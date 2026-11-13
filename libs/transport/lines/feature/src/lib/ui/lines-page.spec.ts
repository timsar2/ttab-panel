import { linePageQuery } from './lines-page'

describe('linePageQuery', () => {
  it('converts a valid URL page into zero-based table paging', () => {
    expect(linePageQuery('2', '25')).toEqual({ pageIndex: 1, pageSize: 25 })
  })

  it('falls back to the first page and a supported size for invalid URL paging', () => {
    expect(linePageQuery('0', '17')).toEqual({ pageIndex: 0, pageSize: 10 })
    expect(linePageQuery('999999999999999999999', '50')).toEqual({ pageIndex: 0, pageSize: 50 })
  })
})
