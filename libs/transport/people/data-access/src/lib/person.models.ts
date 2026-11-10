import { TransportError, transportInteger, transportRecord } from '@org/transport-http'

declare const personIdBrand: unique symbol
declare const peopleCompanyIdBrand: unique symbol

export type PersonId = number & { readonly [personIdBrand]: true }
export type PeopleCompanyId = number & { readonly [peopleCompanyIdBrand]: true }

export function personId(value: unknown): PersonId {
  return transportInteger(value, 1, 2147483647) as PersonId
}

export function peopleCompanyId(value: unknown): PeopleCompanyId {
  return transportInteger(value, 1, 2147483647) as PeopleCompanyId
}

export type UserShiftState = 'All' | 'HasShift' | 'HasNotShift'

export interface PeopleSearch {
  readonly fullName: string
  readonly nationalId: string
  readonly userShiftState: UserShiftState | null
  readonly pageIndex: number
  readonly pageSize: number
}

export interface PersonRow {
  readonly id: PersonId
  readonly fullName: string | null
  readonly nationalId: string | null
  readonly profileImage: string | null
}

export interface PersonDetail {
  readonly id: PersonId
  readonly firstName: string | null
  readonly lastName: string | null
  readonly email: string | null
  readonly nationalId: string | null
  readonly provinceName: string | null
  readonly cityName: string | null
  readonly cityId: number | null
  readonly address: string | null
  readonly postalCode: string | null
  readonly lat: number | null
  readonly lng: number | null
  readonly mobileNumber: string | null
  readonly phoneNumber: string | null
  readonly profileImage: string | null
}

function text(value: unknown): string | null {
  if (value === null) return null
  if (typeof value === 'string') return value
  throw new TransportError('contract', 0, 'The person response contains an invalid text field.')
}

function coordinate(value: unknown, minimum: number, maximum: number): number | null {
  if (value === null) return null
  if (typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum)
    return value
  throw new TransportError('contract', 0, 'The person response contains an invalid coordinate.')
}

export function decodePersonRow(value: unknown): PersonRow {
  const row = transportRecord(value)
  return {
    id: personId(row['id']),
    fullName: text(row['fullName']),
    nationalId: text(row['nationalId']),
    profileImage: text(row['profileImage']),
  }
}

export function decodePersonDetail(value: unknown): PersonDetail {
  const row = transportRecord(value)
  return {
    id: personId(row['id']),
    firstName: text(row['firstName']),
    lastName: text(row['lastName']),
    email: text(row['email']),
    nationalId: text(row['nationalId']),
    provinceName: text(row['provinceName']),
    cityName: text(row['cityName']),
    cityId: row['cityId'] === null ? null : transportInteger(row['cityId'], -32768, 32767),
    address: text(row['address']),
    postalCode: text(row['postalCode']),
    lat: coordinate(row['lat'], -90, 90),
    lng: coordinate(row['lng'], -180, 180),
    mobileNumber: text(row['mobileNumber']),
    phoneNumber: text(row['phoneNumber']),
    profileImage: text(row['profileImage']),
  }
}
