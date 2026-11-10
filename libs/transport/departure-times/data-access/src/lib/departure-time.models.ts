import {
  TransportError,
  normalizeTransportError,
  transportInteger,
  transportRecord,
} from '@org/transport-http'

declare const companyBrand: unique symbol
declare const idBrand: unique symbol
declare const timeBrand: unique symbol
export type DepartureCompanyId = number & { readonly [companyBrand]: true }
export type DepartureTimeId = number & { readonly [idBrand]: true }
/** .NET constant TimeSpan text, not a Date, UTC instant, or scheduling rule. */
export type DepartureTimeSpan = string & { readonly [timeBrand]: true }

export const departureCompanyId = (value: unknown): DepartureCompanyId =>
  transportInteger(value, 1, 32767) as DepartureCompanyId
export const departureTimeId = (value: unknown): DepartureTimeId =>
  transportInteger(value, 1, 32767) as DepartureTimeId

/** Preserve seconds, seven-digit tick precision, day and sign information without Date. */
export function departureTimeSpan(value: unknown): DepartureTimeSpan {
  const match =
    typeof value === 'string' && value.length <= 27
      ? /^(-)?(?:(\d+)\.)?([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.(\d{1,7}))?$/.exec(value)
      : null
  if (!match) {
    throw new TransportError('contract', 0, 'Expected a .NET TimeSpan, not a date instant.')
  }
  const ticks =
    BigInt(match[2] ?? '0') * 864000000000n +
    BigInt(match[3]) * 36000000000n +
    BigInt(match[4]) * 600000000n +
    BigInt(match[5]) * 10000000n +
    BigInt((match[6] ?? '').padEnd(7, '0'))
  if (ticks > (match[1] ? 9223372036854775808n : 9223372036854775807n)) {
    throw new TransportError('contract', 0, 'TimeSpan is outside the backend representation range.')
  }
  return value as DepartureTimeSpan
}

/** Minute-entry convenience only. Full TimeSpan input round-trips without truncation. */
export function departureTimeInput(value: string): DepartureTimeSpan {
  try {
    return departureTimeSpan(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? `${value}:00` : value)
  } catch {
    throw new TransportError('validation', 0, 'Enter HH:mm or an exact .NET TimeSpan.', {
      shiftTime: ['Invalid time representation.'],
    })
  }
}

/** Null means it cannot be represented as a same-day, unsigned clock without policy. */
export function departureClock(value: DepartureTimeSpan): string | null {
  const time = departureTimeSpan(value)
  return /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,7})?$/.test(time) ? time : null
}

export interface DepartureTimeDto {
  readonly id: DepartureTimeId
  readonly companyId: DepartureCompanyId
  readonly name: string
  readonly shiftTime: DepartureTimeSpan
}
export interface DepartureTimeSearch {
  readonly name: string
}
export interface DepartureTimeDraft {
  readonly name: string
  readonly shiftTime: string
}
export interface DepartureTimeWriteDto extends DepartureTimeDraft {
  readonly companyId: DepartureCompanyId
  readonly id?: DepartureTimeId
  readonly shiftTime: DepartureTimeSpan
}
export interface DepartureTimeListRequest {
  readonly companyId: DepartureCompanyId
  readonly name: string | null
}
export interface DepartureTimeList {
  readonly items: readonly DepartureTimeDto[]
  readonly limit: 1000
  readonly atLimit: boolean
  /** SQL is capped and provides no count/next-page metadata, even below the ceiling. */
  readonly completeness: 'unknown'
}

export function decodeDepartureTime(value: unknown): DepartureTimeDto {
  const dto = transportRecord(value)
  if (typeof dto['name'] !== 'string')
    throw new TransportError('contract', 0, 'Invalid departure-time name.')
  return {
    id: departureTimeId(dto['id']),
    companyId: departureCompanyId(dto['companyId']),
    name: dto['name'],
    shiftTime: departureTimeSpan(dto['shiftTime']),
  }
}

export function decodeDepartureTimeList(
  value: unknown,
  company: DepartureCompanyId,
): DepartureTimeList {
  if (!(value === null || Array.isArray(value)) || (Array.isArray(value) && value.length > 1000)) {
    throw new TransportError('contract', 0, 'Invalid bounded departure-time list.')
  }
  const items = (value ?? []).map(decodeDepartureTime)
  if (
    items.some(item => item.companyId !== company) ||
    new Set(items.map(item => item.id)).size !== items.length
  ) {
    throw new TransportError(
      'contract',
      0,
      'Departure-time list has duplicate or cross-company records.',
    )
  }
  return { items, limit: 1000, atLimit: items.length === 1000, completeness: 'unknown' }
}

export function departureTimeWrite(
  company: DepartureCompanyId,
  draft: DepartureTimeDraft,
  id?: DepartureTimeId,
): DepartureTimeWriteDto {
  if (typeof draft.name !== 'string' || !draft.name.trim()) {
    throw new TransportError('validation', 0, 'Enter a departure-time name.', {
      name: ['Name is required.'],
    })
  }
  return {
    companyId: departureCompanyId(company),
    name: draft.name.trim(),
    shiftTime: departureTimeInput(draft.shiftTime),
    ...(id === undefined ? {} : { id: departureTimeId(id) }),
  }
}

/** MVC/FluentValidation property names are PascalCase; retain unknown/global errors too. */
export function departureTimeError(value: unknown): TransportError {
  const error = normalizeTransportError(value)
  const fields: Record<string, readonly string[]> = Object.create(null)
  const names: Readonly<Record<string, string>> = {
    id: 'id',
    companyid: 'companyId',
    name: 'name',
    shifttime: 'shiftTime',
  }
  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    const field = Object.prototype.hasOwnProperty.call(names, key.toLowerCase())
      ? names[key.toLowerCase()]
      : key
    fields[field] = [...(fields[field] ?? []), ...messages]
  }
  return new TransportError(error.kind, error.status, error.message, fields, error.code)
}
