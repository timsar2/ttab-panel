import {
  TransportError,
  transportInteger,
  transportCoordinate as companyCoordinate,
  transportImageUpload as companyLogoUpload,
} from '@org/transport-http'
import type { TransportImageUpload } from '@org/transport-http'
import { CompanyDetail } from './company.models'

export interface CompanyDraft {
  name: string
  companyTypeId: string
  provinceId: string
  cityId: string
  address: string
  postalCode: string
  latitude: string
  longitude: string
  mobileNumber: string
  phoneNumber: string
  faxNumber: string
  description: string
}

export interface CompanyWrite {
  readonly id: number | null
  readonly name: string
  readonly companyTypeId: number
  readonly cityId: number | null
  readonly address: string | null
  readonly postalCode: string | null
  readonly coordinate: { readonly lat: number; readonly lng: number; readonly srid: 4326 } | null
  readonly mobileNumber: string | null
  readonly phoneNumber: string | null
  readonly faxNumber: string | null
  readonly description: string | null
  readonly companyLogo: CompanyLogoUpload | null
}

export type CompanyLogoUpload = TransportImageUpload
export { companyCoordinate, companyLogoUpload }
export { TRANSPORT_IMAGE_FILE_TYPES as COMPANY_LOGO_FILE_TYPES } from '@org/transport-http'

export function companyDraft(detail: CompanyDetail | null): CompanyDraft {
  return {
    name: detail?.name ?? '',
    companyTypeId: detail?.companyTypeId?.toString() ?? '',
    provinceId: detail?.provinceId?.toString() ?? '',
    cityId: detail?.cityId?.toString() ?? '',
    address: detail?.address ?? '',
    postalCode: detail?.postalCode ?? '',
    latitude: detail?.lat?.toString() ?? '',
    longitude: detail?.lng?.toString() ?? '',
    mobileNumber: detail?.mobileNumber ?? '',
    phoneNumber: detail?.phoneNumber ?? '',
    faxNumber: detail?.faxNumber ?? '',
    description: detail?.description ?? '',
  }
}

export function companyReference(value: string, maximum = 32767): number {
  if (!/^[1-9]\d*$/.test(value))
    throw new TransportError('validation', 0, 'Choose a valid reference.')
  return transportInteger(Number(value), 1, maximum)
}

/** Full-object writes: no read-only geography/name fields or existing image path leaks into the DTO. */
export function companyWrite(
  draft: CompanyDraft,
  original: CompanyDetail | null,
  logo: CompanyLogoUpload | null = null,
): CompanyWrite {
  if (logo?.deleteCurrentImage !== undefined && logo.deleteCurrentImage !== false) {
    throw new TransportError(
      'validation',
      0,
      'Logo removal is not supported by the confirmed backend contract.',
    )
  }
  const logoDto = logo
    ? companyLogoUpload({
        extension: logo.extension,
        mime: /^data:([^;,]+);base64,/.exec(logo.data)?.[1] ?? '',
        dataUrl: logo.data,
      })
    : null
  const name = draft.name.trim()
  if (!name) throw new TransportError('validation', 0, 'Company name is required.')
  const latitude = draft.latitude.trim()
  const longitude = draft.longitude.trim()
  const cityId = draft.cityId ? companyReference(draft.cityId) : null
  if (original?.cityId && cityId === null) {
    throw new TransportError(
      'validation',
      0,
      'Clearing an existing city is not supported by the confirmed contract.',
    )
  }
  if (!latitude && !longitude && original && (original.lat !== null || original.lng !== null)) {
    throw new TransportError(
      'validation',
      0,
      'Clearing existing coordinates requires a confirmed backend contract.',
    )
  }
  const nullable = (value: string) => value.trim() || null
  return {
    id: original ? transportInteger(original.id, 1, 32767) : null,
    name,
    companyTypeId: companyReference(draft.companyTypeId),
    cityId,
    address: nullable(draft.address),
    postalCode: nullable(draft.postalCode),
    coordinate:
      !latitude && !longitude
        ? null
        : {
            lat: companyCoordinate(latitude, -90, 90),
            lng: companyCoordinate(longitude, -180, 180),
            srid: 4326,
          },
    mobileNumber: nullable(draft.mobileNumber),
    phoneNumber: nullable(draft.phoneNumber),
    faxNumber: nullable(draft.faxNumber),
    description: nullable(draft.description),
    companyLogo: logoDto,
  }
}
