import {
  TransportError,
  TransportImageUpload,
  transportImageUpload,
  transportInteger,
  transportRecord,
} from '@org/transport-http'
import {
  PeopleCompanyId,
  PersonDetail,
  PersonId,
  peopleCompanyId,
  personId,
} from '@org/transport-people-data-access'

/** Drivers extend persisted business People; never convert authenticated Identity IDs. */
export type DriverId = PersonId
export type DriverCompanyId = PeopleCompanyId
export const driverId = personId
export function driverCompanyId(value: unknown): DriverCompanyId {
  return peopleCompanyId(transportInteger(value, 1, 32767))
}

export interface DriverSearch {
  readonly fullName: string
  readonly nationalId: string
  readonly pageIndex: number
  readonly pageSize: number
}
export interface DriverRow {
  readonly id: DriverId
  readonly fullName: string | null
  readonly nationalId: string | null
  readonly mobileNumber: string | null
  readonly profileImage: string | null
  readonly driverLicenceLevelName: string
}
export const DRIVER_DOCUMENT_FIELDS = [
  'nationalCardFrontImage',
  'nationalCardBehindImage',
  'drivingLicenceImage',
  'driverSmartCardImage',
] as const
export type DriverDocumentField = (typeof DRIVER_DOCUMENT_FIELDS)[number]
export type DriverDetail = {
  readonly id: DriverId
  readonly driverLicenceLevelId: number
} & Readonly<Record<DriverDocumentField, string | null>>
export interface DriverRecord {
  readonly driver: DriverDetail
  readonly person: PersonDetail
}
/** Omit unchanged images. No clear/remove or URL-as-upload representation is supported. */
export type DriverDraft = {
  readonly driverLicenceLevelId: 1 | 2
} & Partial<Readonly<Record<DriverDocumentField, TransportImageUpload>>>
export type DriverWriteBody = DriverDraft & {
  readonly id: DriverId
  readonly companyId: DriverCompanyId
}
export const DRIVER_MAX_BODY_BYTES = 1024 * 1024

function text(value: unknown): string | null {
  if (value === null || typeof value === 'string') return value
  throw new TransportError('contract', 0, 'The driver response contains an invalid text field.')
}
export function decodeDriverRow(value: unknown): DriverRow {
  const row = transportRecord(value)
  if (typeof row['driverLicenceLevelName'] !== 'string')
    throw new TransportError('contract', 0, 'The driver response has no licence display value.')
  return {
    id: driverId(row['id']),
    fullName: text(row['fullName']),
    nationalId: text(row['nationalId']),
    mobileNumber: text(row['mobileNumber']),
    profileImage: text(row['profileImage']),
    driverLicenceLevelName: row['driverLicenceLevelName'],
  }
}
export function decodeDriverDetail(value: unknown): DriverDetail {
  const row = transportRecord(value)
  return {
    id: driverId(row['id']),
    driverLicenceLevelId: transportInteger(row['driverLicenceLevelId'], 0, 255),
    nationalCardFrontImage: text(row['nationalCardFrontImage']),
    nationalCardBehindImage: text(row['nationalCardBehindImage']),
    drivingLicenceImage: text(row['drivingLicenceImage']),
    driverSmartCardImage: text(row['driverSmartCardImage']),
  }
}

export function driverWrite(
  company: DriverCompanyId,
  id: DriverId,
  draft: DriverDraft,
): DriverWriteBody {
  if (draft.driverLicenceLevelId !== 1 && draft.driverLicenceLevelId !== 2)
    throw new TransportError('validation', 0, 'Choose licence value 1 or 2.', {
      driverLicenceLevelId: ['Choose licence value 1 or 2.'],
    })
  const images: Partial<Record<DriverDocumentField, TransportImageUpload>> = {}
  for (const field of DRIVER_DOCUMENT_FIELDS) {
    const image = draft[field]
    if (image === undefined) continue
    if (
      !image ||
      typeof image !== 'object' ||
      image.deleteCurrentImage !== false ||
      typeof image.extension !== 'string' ||
      typeof image.data !== 'string'
    )
      throw new TransportError('validation', 0, 'Images support replacement only.')
    const mime =
      image.extension === '.jpg' || image.extension === '.jpeg'
        ? 'image/jpeg'
        : image.extension === '.png'
          ? 'image/png'
          : image.extension === '.webp'
            ? 'image/webp'
            : ''
    images[field] = transportImageUpload({ mime, extension: image.extension, dataUrl: image.data })
  }
  const body: DriverWriteBody = {
    id: driverId(id),
    companyId: driverCompanyId(company),
    driverLicenceLevelId: draft.driverLicenceLevelId,
    ...images,
  }
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > DRIVER_MAX_BODY_BYTES)
    throw new TransportError(
      'validation',
      0,
      'The combined document payload exceeds the 1 MiB limit.',
    )
  return body
}
