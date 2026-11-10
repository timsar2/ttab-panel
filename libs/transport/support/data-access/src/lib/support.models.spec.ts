import {
  decodeSupportDetail,
  decodeSupportPage,
  decodeSupportRow,
  supportCompanyId,
  supportId,
  supportSearchRequest,
} from './support.models'
import type { SupportSearch } from './support.models'

const row = {
  id: 7,
  companyId: 2,
  supportTypeId: 4,
  supportTypeName: 'Server label',
  personId: 70000,
  fullName: null,
  mobileNumber: null,
  requestDate: '2026-11-10T12:30:00.1234567',
  subject: 'Support',
  isAnswered: false,
}
const detail = {
  ...row,
  caseFile: [
    {
      personId: 8,
      fullName: null,
      tripId: 9,
      caseViolations: [{ supportViolationTypeId: 12, code: null, title: 'Server label' }],
    },
  ],
}
const query: SupportSearch = { supportTypeId: 4, fullName: '', pageIndex: 0, pageSize: 10 }
const company = supportCompanyId(2)
const page = (list: unknown[] = [row]) => ({
  list,
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalCount: list.length,
    totalPages: list.length ? 1 : 0,
    hasPreviousPage: false,
    hasNextPage: false,
  },
})

describe('source-backed support adapters', () => {
  it('preserves backend dates and numeric type IDs without applicant/description aliases', () => {
    expect(decodeSupportRow(row)).toEqual(row)
    const result = decodeSupportDetail(detail)
    expect(result.caseFile).toEqual(detail.caseFile)
    expect(result.requestDate).toBe(row.requestDate)
    expect(result).not.toHaveProperty('fullName')
    expect(result).not.toHaveProperty('requestDesc')
    expect(result).not.toHaveProperty('applicantTypeId')
  })
  it.each([0, -1, 1.1, '7', NaN, Infinity, 2147483648, null])(
    'rejects invalid support ID %s',
    value => {
      expect(() => supportId(value)).toThrow()
    },
  )
  it.each([0, -1, 32768, '2', undefined])('rejects invalid short company ID %s', value => {
    expect(() => supportCompanyId(value)).toThrow()
  })
  it.each([
    { id: '7' },
    { companyId: 0 },
    { supportTypeId: 0 },
    { supportTypeId: 256 },
    { personId: 0 },
    { subject: null },
    { isAnswered: 1 },
    { requestDate: '' },
    { requestDate: 123 },
    { supportTypeName: undefined },
    { mobileNumber: [] },
  ])('rejects malformed DTO fields %j', patch => {
    expect(() => decodeSupportRow({ ...row, ...patch })).toThrow()
  })
  it.each([
    { caseFile: null },
    { caseFile: [{}] },
    { caseFile: [{ ...detail.caseFile[0], tripId: '9' }] },
    { caseFile: [{ ...detail.caseFile[0], caseViolations: [{}] }] },
    { caseFile: [{ ...detail.caseFile[0], caseViolations: null }] },
  ])('rejects malformed nested case files %j', patch => {
    expect(() => decodeSupportDetail({ ...detail, ...patch })).toThrow()
  })
  it('uses zero-to-one based paging and only real filters; no all-type default', () => {
    expect(
      supportSearchRequest(company, {
        ...query,
        pageIndex: 2,
        fullName: ' Name ',
        personId: 70000,
        isAnswered: true,
        sort: 'Subject DESC',
      }),
    ).toEqual({
      companyId: 2,
      supportTypeId: 4,
      pageNumber: 3,
      pageSize: 10,
      fullName: 'Name',
      personId: 70000,
      isAnswered: true,
      orderBy: ['Subject DESC'],
    })
    expect(supportSearchRequest(company, query)).toMatchObject({ fullName: null, orderBy: [] })
  })
  it.each(['Id', 'Id DESC', 'Subject', 'Subject DESC', 'RequestDate', 'RequestDate DESC'] as const)(
    'allows source sort %s',
    sort => {
      expect(supportSearchRequest(company, { ...query, sort }).orderBy).toEqual([sort])
    },
  )
  it.each([
    { supportTypeId: 0 },
    { supportTypeId: 256 },
    { supportTypeId: '2' },
    { pageIndex: -1 },
    { pageIndex: 32767 },
    { pageIndex: 0.5 },
    { pageSize: 0 },
    { pageSize: 101 },
    { personId: 0 },
    { fullName: 'x'.repeat(101) },
    { fullName: null },
    { isAnswered: 'false' },
    { sort: 'FullName' },
    { sort: 'Id;DROP TABLE' },
  ])('rejects unsupported query %j', patch => {
    expect(() => supportSearchRequest(company, { ...query, ...patch } as SupportSearch)).toThrow()
  })
  it('decodes empty server pages without inventing counts for empty out-of-range search', () => {
    const empty = page([])
    expect(decodeSupportPage(empty, supportSearchRequest(company, query)).items).toEqual([])
    empty.pagination.currentPage = 3
    empty.pagination.hasPreviousPage = true
    expect(
      decodeSupportPage(empty, supportSearchRequest(company, { ...query, pageIndex: 2 })).pagination
        .totalCount,
    ).toBe(0)
  })
  it.each([{ companyId: 3 }, { supportTypeId: 3 }, { personId: 80000 }, { isAnswered: true }])(
    'rejects rows outside explicit request filters %j',
    patch => {
      const request = supportSearchRequest(company, {
        ...query,
        personId: 70000,
        isAnswered: false,
      })
      expect(() => decodeSupportPage(page([{ ...row, ...patch }]), request)).toThrow()
    },
  )
  it.each([
    { currentPage: 2 },
    { pageSize: 20 },
    { totalPages: 2 },
    { hasNextPage: true },
    { hasPreviousPage: true },
    { totalCount: 0 },
    { totalCount: -1 },
  ])('rejects inconsistent pagination %j', patch => {
    const value = page()
    expect(() =>
      decodeSupportPage(
        { ...value, pagination: { ...value.pagination, ...patch } },
        supportSearchRequest(company, query),
      ),
    ).toThrow()
  })
  it('rejects duplicates and oversized pages', () => {
    expect(() =>
      decodeSupportPage(page([row, row]), supportSearchRequest(company, query)),
    ).toThrow()
    expect(() =>
      decodeSupportPage(
        page(Array.from({ length: 11 }, (_, i) => ({ ...row, id: i + 1 }))),
        supportSearchRequest(company, query),
      ),
    ).toThrow()
  })
})
