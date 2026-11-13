import {
  TransportError,
  transportImageUpload,
  transportInteger,
  transportRecord,
} from '@org/transport-http'

export type VehicleId = number & { readonly __vehicleId: unique symbol }
export type VehicleCompanyId = number & { readonly __vehicleCompanyId: unique symbol }
export type VehicleTypeId = number & { readonly __vehicleTypeId: unique symbol }
export type CarTypeId = number & { readonly __carTypeId: unique symbol }

export function carId(value: unknown): VehicleId {
  return transportInteger(value, 1) as VehicleId
}
export function carCompanyId(value: unknown): VehicleCompanyId {
  return transportInteger(value, 1) as VehicleCompanyId
}
export function vehicleTypeId(value: unknown): VehicleTypeId {
  return transportInteger(value, 1) as VehicleTypeId
}
export function carTypeId(value: unknown): CarTypeId {
  return transportInteger(value, 1) as CarTypeId
}

export interface VehicleSearch {
  readonly pageIndex: number
  readonly pageSize: number
}

export interface VehicleRow {
  readonly id: VehicleId
  readonly driverId: number
  readonly fullName: string | null
  readonly carTypeName: string
  readonly carImage: string | null
  readonly carPlate: string
  readonly produnctionYear: number | null
  readonly capacity: number | null
  readonly companyName: string | null
  readonly companyTypeName: string | null
}

export const CAR_DOCUMENT_FIELDS = [
  'carImage',
  'carSmartCardImage',
  'carInsuranceImage',
  'carCardImage',
] as const
export type CarDocumentField = (typeof CAR_DOCUMENT_FIELDS)[number]
export interface VehicleImagePayload {
  readonly name: string
  readonly extension: string
  readonly data: string
  readonly deleteCurrentImage: false
}

export interface VehicleDetail {
  readonly id: VehicleId
  readonly driverId: number
  readonly vehicleTypeId: VehicleTypeId
  readonly carPlate: string
  readonly color: string | null
  readonly produnctionYear: number | null
  readonly capacity: number | null
  readonly carImage: string | null
  readonly carSmartCardImage: string | null
  readonly carInsuranceImage: string | null
  readonly carCardImage: string | null
}

export type VehicleDraft = Omit<
  VehicleDetail,
  'id' | 'carImage' | 'carSmartCardImage' | 'carInsuranceImage' | 'carCardImage'
> &
  Partial<Readonly<Record<CarDocumentField, VehicleImagePayload>>>

export interface VehicleWriteBody extends VehicleDraft {
  readonly id?: VehicleId
}

export interface CarType {
  readonly id: VehicleTypeId
  readonly carTypeId: CarTypeId | null
  readonly model: string
}

export interface CarTypeDraft {
  readonly carTypeId?: CarTypeId | null
  readonly model: string
}

export const CAR_MAX_BODY_BYTES = 1024 * 1024

function nullableText(value: unknown, field: string): string | null {
  if (value === null || typeof value === 'string') return value
  throw new TransportError('contract', 0, `The vehicle response contains an invalid ${field}.`)
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new TransportError('contract', 0, `The vehicle response contains an invalid ${field}.`)
}

function nullableImage(value: unknown, field: string): string | null {
  if (value === null || typeof value === 'string') return value
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const data = (value as Record<string, unknown>)['data']
    if (data === null || typeof data === 'string') return data
  }
  throw new TransportError('contract', 0, `The vehicle response contains an invalid ${field}.`)
}

export function decodeVehicleRow(value: unknown): VehicleRow {
  const row = transportRecord(value)
  const driverId = transportInteger(row['driverId'], 0)
  const fullName = nullableText(row['fullName'], 'driver name')
  const companyName = nullableText(row['companyName'], 'company name')
  const companyTypeName = nullableText(row['companyTypeName'], 'company type')
  const carTypeName = row['carTypeName']
  const carPlate = row['carPlate']
  if (typeof carTypeName !== 'string' || typeof carPlate !== 'string')
    throw new TransportError('contract', 0, 'The vehicle response is missing display fields.')
  return {
    id: carId(row['id']),
    driverId,
    fullName,
    carTypeName,
    carImage: nullableText(row['carImage'], 'vehicle image'),
    carPlate,
    produnctionYear: nullableNumber(row['produnctionYear'], 'production year'),
    capacity: nullableNumber(row['capacity'], 'capacity'),
    companyName,
    companyTypeName,
  }
}

export function decodeVehicleDetail(value: unknown): VehicleDetail {
  const row = transportRecord(value)
  const carPlate = row['carPlate']
  if (typeof carPlate !== 'string')
    throw new TransportError('contract', 0, 'The vehicle response has no plate value.')
  return {
    id: carId(row['id']),
    driverId: transportInteger(row['driverId'], 1),
    vehicleTypeId: vehicleTypeId(row['vehicleTypeId']),
    carPlate,
    color: nullableText(row['color'], 'color'),
    produnctionYear: nullableNumber(row['produnctionYear'], 'production year'),
    capacity: nullableNumber(row['capacity'], 'capacity'),
    carImage: nullableImage(row['carImage'], 'vehicle image'),
    carSmartCardImage: nullableImage(row['carSmartCardImage'], 'smart-card image'),
    carInsuranceImage: nullableImage(row['carInsuranceImage'], 'insurance image'),
    carCardImage: nullableImage(row['carCardImage'], 'vehicle-card image'),
  }
}

export function decodeCarType(value: unknown): CarType {
  const row = transportRecord(value)
  const id = row['id'] ?? row['carTypeId']
  if (typeof row['model'] !== 'string' || !row['model'].trim())
    throw new TransportError('contract', 0, 'The car-type response has no model.')
  return {
    id: vehicleTypeId(id),
    carTypeId: row['carTypeId'] == null ? null : carTypeId(row['carTypeId']),
    model: row['model'],
  }
}

/** Preserve the legacy wire spelling and omit images the editor did not change. */
export function vehicleWrite(id: VehicleId | null, draft: VehicleDraft): VehicleWriteBody {
  if (!Number.isSafeInteger(draft.driverId) || draft.driverId < 1)
    throw new TransportError('validation', 0, 'Select an existing driver.', {
      driverId: ['Select a driver.'],
    })
  vehicleTypeId(draft.vehicleTypeId)
  if (typeof draft.carPlate !== 'string' || draft.carPlate.length !== 8)
    throw new TransportError('validation', 0, 'The vehicle plate must contain 8 characters.', {
      carPlate: ['Enter an 8-character plate.'],
    })
  for (const field of ['produnctionYear', 'capacity'] as const) {
    const value = draft[field]
    if (value !== null && !Number.isFinite(value))
      throw new TransportError('validation', 0, `Enter a valid ${field}.`, {
        [field]: ['Enter a valid number.'],
      })
  }

  const images: Partial<Record<CarDocumentField, VehicleImagePayload>> = {}
  for (const field of CAR_DOCUMENT_FIELDS) {
    const image = draft[field]
    if (image === undefined) continue
    if (
      !image ||
      image.deleteCurrentImage !== false ||
      typeof image.name !== 'string' ||
      !image.name.trim()
    )
      throw new TransportError(
        'validation',
        0,
        'Only image replacement is supported until removal semantics are approved.',
      )
    const mime =
      image.extension === '.jpg' || image.extension === '.jpeg'
        ? 'image/jpeg'
        : image.extension === '.png'
          ? 'image/png'
          : image.extension === '.webp'
            ? 'image/webp'
            : ''
    images[field] = {
      name: image.name,
      ...transportImageUpload({ mime, extension: image.extension, dataUrl: image.data }),
    }
  }
  const body: VehicleWriteBody = {
    ...(id === null ? {} : { id: carId(id) }),
    driverId: transportInteger(draft.driverId, 1),
    vehicleTypeId: vehicleTypeId(draft.vehicleTypeId),
    carPlate: draft.carPlate,
    color: draft.color,
    produnctionYear: draft.produnctionYear,
    capacity: draft.capacity,
    ...images,
  }
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > CAR_MAX_BODY_BYTES)
    throw new TransportError(
      'validation',
      0,
      'The combined vehicle image payload exceeds the 1 MiB limit.',
    )
  return body
}

export function carTypeWrite(draft: CarTypeDraft) {
  const model = draft.model.trim()
  if (!model)
    throw new TransportError('validation', 0, 'Enter a car type.', { model: ['Enter a car type.'] })
  return { carTypeId: draft.carTypeId == null ? null : carTypeId(draft.carTypeId), model }
}
