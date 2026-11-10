import {
  TransportError,
  transportCoordinate,
  transportImageUpload,
  transportRecord,
} from '@org/transport-http'
import type { TransportImageUpload } from '@org/transport-http'
import { peopleCompanyId, personId } from './person.models'
import type { PeopleCompanyId, PersonDetail, PersonId } from './person.models'

export interface PersonDraft {
  firstName: string
  lastName: string
  email: string
  nationalId: string
  cityId: string
  address: string
  postalCode: string
  latitude: string
  longitude: string
  mobileNumber: string
  phoneNumber: string
}

interface PersonBodyFields {
  readonly companyId: PeopleCompanyId
  readonly firstName: string | null
  readonly lastName: string | null
  readonly email: string | null
  readonly nationalId: string | null
  readonly cityId: number | null
  readonly address: string | null
  readonly postalCode: string | null
  readonly coordinate: { readonly lat: number; readonly lng: number; readonly srid: 4326 } | null
  readonly phoneNumber: string | null
  readonly profileImage: TransportImageUpload | null
}

export interface PersonCreateBody extends PersonBodyFields {
  readonly mobileNumber: string
}

export interface PersonUpdateBody extends PersonBodyFields {
  readonly id: PersonId
}

export function personDraft(original: PersonDetail | null): PersonDraft {
  return {
    firstName: original?.firstName ?? '',
    lastName: original?.lastName ?? '',
    email: original?.email ?? '',
    nationalId: original?.nationalId ?? '',
    cityId: original?.cityId?.toString() ?? '',
    address: original?.address ?? '',
    postalCode: original?.postalCode ?? '',
    latitude: original?.lat?.toString() ?? '',
    longitude: original?.lng?.toString() ?? '',
    mobileNumber: original?.mobileNumber ?? '',
    phoneNumber: original?.phoneNumber ?? '',
  }
}

function scalar(value: string): string {
  if (typeof value !== 'string') throw new TransportError('validation', 0, 'Enter a text value.')
  return value
}

function nullable(value: string): string | null {
  return scalar(value) === '' ? null : value
}

function name(value: string): string | null {
  if (scalar(value).length > 75)
    throw new TransportError('validation', 0, 'Names must not exceed 75 characters.')
  return nullable(value)
}

function bodyFields(
  companyId: number,
  draft: PersonDraft,
  original: PersonDetail | null,
  image: TransportImageUpload | null,
): PersonBodyFields {
  const company = peopleCompanyId(companyId)
  const city = scalar(draft.cityId)
  if (
    city !== '' &&
    (!/^-?\d+$/.test(city) ||
      !Number.isSafeInteger(Number(city)) ||
      Number(city) < -32768 ||
      Number(city) > 32767)
  ) {
    throw new TransportError('validation', 0, 'Choose a valid city.')
  }
  const latitude = scalar(draft.latitude).trim()
  const longitude = scalar(draft.longitude).trim()
  if (!latitude && !longitude && original && (original.lat !== null || original.lng !== null)) {
    throw new TransportError(
      'validation',
      0,
      'Clearing existing coordinates requires a confirmed backend contract.',
    )
  }
  let profileImage: TransportImageUpload | null = null
  if (image !== null) {
    const upload = transportRecord(image)
    if (
      upload['deleteCurrentImage'] !== false ||
      typeof upload['extension'] !== 'string' ||
      typeof upload['data'] !== 'string'
    ) {
      throw new TransportError(
        'validation',
        0,
        'Choose a supported image; image removal is not supported.',
      )
    }
    profileImage = transportImageUpload({
      extension: upload['extension'],
      mime: /^data:([^;,]+);base64,/.exec(upload['data'])?.[1] ?? '',
      dataUrl: upload['data'],
    })
  }
  return {
    companyId: company,
    firstName: name(draft.firstName),
    lastName: name(draft.lastName),
    email: nullable(draft.email),
    nationalId: nullable(draft.nationalId),
    cityId: city === '' ? null : Number(city),
    address: nullable(draft.address),
    postalCode: nullable(draft.postalCode),
    coordinate:
      !latitude && !longitude
        ? null
        : {
            lat: transportCoordinate(latitude, -90, 90),
            lng: transportCoordinate(longitude, -180, 180),
            srid: 4326,
          },
    phoneNumber: nullable(draft.phoneNumber),
    // Null is the confirmed keep-image operation, never the existing read path.
    profileImage,
  }
}

export function personCreate(
  companyId: number,
  draft: PersonDraft,
  image: TransportImageUpload | null = null,
): PersonCreateBody {
  const fields = bodyFields(companyId, draft, null, image)
  return {
    companyId: fields.companyId,
    firstName: fields.firstName,
    lastName: fields.lastName,
    email: fields.email,
    nationalId: fields.nationalId,
    cityId: fields.cityId,
    address: fields.address,
    postalCode: fields.postalCode,
    coordinate: fields.coordinate,
    mobileNumber: scalar(draft.mobileNumber),
    phoneNumber: fields.phoneNumber,
    profileImage: fields.profileImage,
  }
}

export function personUpdate(
  companyId: number,
  original: PersonDetail,
  draft: PersonDraft,
  image: TransportImageUpload | null = null,
): PersonUpdateBody {
  const id = personId(original.id)
  const fields = bodyFields(companyId, draft, original, image)
  return {
    id,
    companyId: fields.companyId,
    firstName: fields.firstName,
    lastName: fields.lastName,
    email: fields.email,
    nationalId: fields.nationalId,
    cityId: fields.cityId,
    address: fields.address,
    postalCode: fields.postalCode,
    coordinate: fields.coordinate,
    phoneNumber: fields.phoneNumber,
    profileImage: fields.profileImage,
  }
}
