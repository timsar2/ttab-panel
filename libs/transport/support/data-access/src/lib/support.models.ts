import {
  TransportError,
  TransportPage,
  decodeTransportPage,
  transportInteger,
  transportRecord,
} from '@org/transport-http'

declare const supportIdBrand: unique symbol
declare const supportCompanyBrand: unique symbol
export type SupportId = number & { readonly [supportIdBrand]: true }
export type SupportCompanyId = number & { readonly [supportCompanyBrand]: true }

export const supportId = (value: unknown): SupportId =>
  transportInteger(value, 1, 2147483647) as SupportId
export const supportCompanyId = (value: unknown): SupportCompanyId =>
  transportInteger(value, 1, 32767) as SupportCompanyId

export type SupportSort =
  'Id' | 'Id DESC' | 'Subject' | 'Subject DESC' | 'RequestDate' | 'RequestDate DESC'
export interface SupportSearch {
  /** Backend byte identifier, not a legacy applicant-type enum. */
  readonly supportTypeId: number
  readonly personId?: number | null
  readonly fullName: string
  readonly isAnswered?: boolean | null
  readonly pageIndex: number
  readonly pageSize: number
  readonly sort?: SupportSort | null
}
export interface SupportSearchRequest {
  readonly companyId: SupportCompanyId
  readonly supportTypeId: number
  readonly personId: number | null
  readonly fullName: string | null
  readonly isAnswered: boolean | null
  readonly pageNumber: number
  readonly pageSize: number
  readonly orderBy: readonly SupportSort[]
}
export interface SupportRecord {
  readonly id: SupportId
  readonly companyId: SupportCompanyId
  readonly supportTypeId: number
  readonly supportTypeName: string | null
  readonly personId: number
  readonly mobileNumber: string | null
  /** Opaque server DateTime text. No timezone/calendar conversion is inferred. */
  readonly requestDate: string
  readonly subject: string
  readonly isAnswered: boolean
}
export interface SupportRow extends SupportRecord {
  readonly fullName: string | null
}
export interface SupportCaseViolation {
  readonly supportViolationTypeId: number
  readonly code: string | null
  readonly title: string | null
}
export interface SupportCaseFile {
  readonly personId: number
  readonly fullName: string | null
  readonly tripId: number
  readonly caseViolations: readonly SupportCaseViolation[]
}
export interface SupportDetail extends SupportRecord {
  readonly caseFile: readonly SupportCaseFile[]
}

function invalid(): never {
  throw new TransportError('contract', 0, 'The server returned an invalid support response.')
}
function text(value: unknown): string {
  return typeof value === 'string' ? value : invalid()
}
function nullableText(value: unknown): string | null {
  return value === null ? null : text(value)
}
function boolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : invalid()
}
function record(value: unknown): SupportRecord {
  const row = transportRecord(value)
  const requestDate = text(row['requestDate'])
  if (!requestDate.trim()) invalid()
  return {
    id: supportId(row['id']),
    companyId: supportCompanyId(row['companyId']),
    supportTypeId: transportInteger(row['supportTypeId'], 1, 255),
    supportTypeName: nullableText(row['supportTypeName']),
    personId: transportInteger(row['personId'], 1, 2147483647),
    mobileNumber: nullableText(row['mobileNumber']),
    requestDate,
    subject: text(row['subject']),
    isAnswered: boolean(row['isAnswered']),
  }
}
export function decodeSupportRow(value: unknown): SupportRow {
  const row = transportRecord(value)
  return { ...record(row), fullName: nullableText(row['fullName']) }
}
export function decodeSupportDetail(value: unknown): SupportDetail {
  const row = transportRecord(value)
  if (!Array.isArray(row['caseFile'])) invalid()
  return {
    ...record(row),
    caseFile: row['caseFile'].map(value => {
      const file = transportRecord(value)
      if (!Array.isArray(file['caseViolations'])) invalid()
      return {
        personId: transportInteger(file['personId'], 1, 2147483647),
        fullName: nullableText(file['fullName']),
        tripId: transportInteger(file['tripId'], 1, 2147483647),
        caseViolations: file['caseViolations'].map(value => {
          const violation = transportRecord(value)
          return {
            supportViolationTypeId: transportInteger(
              violation['supportViolationTypeId'],
              1,
              2147483647,
            ),
            code: nullableText(violation['code']),
            title: nullableText(violation['title']),
          }
        }),
      }
    }),
  }
}

export function supportSearchRequest(
  company: SupportCompanyId,
  query: SupportSearch,
): SupportSearchRequest {
  const sorts: readonly string[] = [
    'Id',
    'Id DESC',
    'Subject',
    'Subject DESC',
    'RequestDate',
    'RequestDate DESC',
  ]
  if (
    typeof query.fullName !== 'string' ||
    query.fullName.length > 100 ||
    (query.sort != null && !sorts.includes(query.sort)) ||
    (query.isAnswered != null && typeof query.isAnswered !== 'boolean')
  )
    throw new TransportError('validation', 0, 'Choose supported support search filters.')
  return {
    companyId: supportCompanyId(company),
    supportTypeId: transportInteger(query.supportTypeId, 1, 255),
    personId: query.personId == null ? null : transportInteger(query.personId, 1, 2147483647),
    fullName: query.fullName.trim() || null,
    isAnswered: query.isAnswered ?? null,
    pageNumber: transportInteger(query.pageIndex, 0, 32766) + 1,
    pageSize: transportInteger(query.pageSize, 1, 100),
    orderBy: query.sort == null ? [] : [query.sort],
  }
}

export function decodeSupportPage(
  value: unknown,
  request: SupportSearchRequest,
): TransportPage<SupportRow> {
  const page = decodeTransportPage(value, decodeSupportRow)
  const p = page.pagination
  if (
    p.currentPage !== request.pageNumber ||
    p.pageSize !== request.pageSize ||
    p.totalPages !== Math.ceil(p.totalCount / p.pageSize) ||
    p.hasPreviousPage !== p.currentPage > 1 ||
    p.hasNextPage !== p.currentPage < p.totalPages ||
    page.items.length > p.pageSize ||
    page.items.length > Math.max(0, p.totalCount - (p.currentPage - 1) * p.pageSize) ||
    new Set(page.items.map(row => row.id)).size !== page.items.length ||
    page.items.some(
      row =>
        row.companyId !== request.companyId ||
        row.supportTypeId !== request.supportTypeId ||
        (request.personId !== null && row.personId !== request.personId) ||
        (request.isAnswered !== null && row.isAnswered !== request.isAnswered),
    )
  )
    invalid()
  return page
}
