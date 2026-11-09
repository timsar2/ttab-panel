import { TransportError, transportInteger, transportRecord } from '@org/transport-http'

export interface CompanySearch {
  readonly name: string
  readonly pageIndex: number
  readonly pageSize: number
}

export interface CompanyRow {
  readonly id: number
  readonly name: string
  readonly companyTypeName: string | null
  readonly provinceName: string | null
  readonly cityName: string | null
  readonly companyLogo: string | null
}

export interface CompanyDetail {
  readonly id: number
  readonly name: string
  readonly companyTypeId: number | null
  readonly companyTypeName: string | null
  readonly cityId: number | null
  readonly provinceId: number | null
  readonly address: string | null
  readonly postalCode: string | null
  readonly lat: number | null
  readonly lng: number | null
  readonly mobileNumber: string | null
  readonly phoneNumber: string | null
  readonly faxNumber: string | null
  readonly description: string | null
  readonly companyLogo: string | null
}

function text(value: unknown, nullable = true): string | null {
  if (value === null && nullable) return null
  if (typeof value === 'string') return value
  throw new TransportError('contract', 0, 'The company response contains an invalid text field.')
}

function optionalId(value: unknown): number | null {
  return value === null ? null : transportInteger(value, 1, 32767)
}

function coordinate(value: unknown, minimum: number, maximum: number): number | null {
  if (value === null) return null
  if (typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum)
    return value
  throw new TransportError('contract', 0, 'The company response contains an invalid coordinate.')
}

export function decodeCompanyRow(value: unknown): CompanyRow {
  const row = transportRecord(value)
  return {
    id: transportInteger(row['id'], 1, 32767),
    name: text(row['name'], false) as string,
    companyTypeName: text(row['companyTypeName']),
    provinceName: text(row['provinceName']),
    cityName: text(row['cityName']),
    companyLogo: text(row['companyLogo']),
  }
}

export function decodeCompanyDetail(value: unknown): CompanyDetail {
  const row = transportRecord(value)
  return {
    id: transportInteger(row['id'], 1, 32767),
    name: text(row['name'], false) as string,
    companyTypeId: optionalId(row['companyTypeId']),
    companyTypeName: text(row['companyTypeName']),
    cityId: optionalId(row['cityId']),
    provinceId: optionalId(row['provinceId']),
    address: text(row['address']),
    postalCode: text(row['postalCode']),
    lat: coordinate(row['lat'], -90, 90),
    lng: coordinate(row['lng'], -180, 180),
    mobileNumber: text(row['mobileNumber']),
    phoneNumber: text(row['phoneNumber']),
    faxNumber: text(row['faxNumber']),
    description: text(row['description']),
    companyLogo: text(row['companyLogo']),
  }
}
