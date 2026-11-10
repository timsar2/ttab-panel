import { HttpErrorResponse } from '@angular/common/http'

export class TransportError extends Error {
  constructor(
    readonly kind: 'network' | 'http' | 'business' | 'validation' | 'contract',
    readonly status: number,
    message: string,
    readonly fieldErrors: Readonly<Record<string, readonly string[]>> = {},
    readonly code: string | null = null,
  ) {
    super(message)
    this.name = 'TransportError'
  }
}

export function transportRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TransportError('contract', 0, 'The server returned an invalid response.')
  }
  return value as Record<string, unknown>
}

/** Opt-in only; the backend also has raw array/object endpoints. */
export function unwrapTransport<T>(value: unknown, decode: (result: unknown) => T): T {
  const envelope = transportRecord(value)
  if (
    typeof envelope['code'] !== 'string' ||
    !(envelope['massage'] === null || typeof envelope['massage'] === 'string') ||
    !Object.prototype.hasOwnProperty.call(envelope, 'result')
  )
    throw new TransportError('contract', 0, 'The server returned an invalid response envelope.')
  if (envelope['code'] !== '2000') {
    throw new TransportError('business', 0, message(envelope['massage']), {}, envelope['code'])
  }
  return decode(envelope['result'])
}

function message(value: unknown, fallback = 'The request could not be completed.'): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

export function normalizeTransportError(error: unknown): TransportError {
  if (error instanceof TransportError) return error
  if (!(error instanceof HttpErrorResponse)) {
    return new TransportError('contract', 0, 'The server returned an invalid response.')
  }
  if (error.status === 0) return new TransportError('network', 0, 'Unable to reach the server.')
  if (error.status >= 500)
    return new TransportError('http', error.status, 'The request could not be completed.')
  const body = error.error
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const fields: Record<string, readonly string[]> = Object.create(null)
    if (body.errors && typeof body.errors === 'object' && !Array.isArray(body.errors)) {
      for (const [key, values] of Object.entries(body.errors)) {
        if (Array.isArray(values) && values.every(value => typeof value === 'string')) {
          fields[key] = values
        }
      }
      if (Object.keys(fields).length) {
        return new TransportError(
          'validation',
          error.status,
          'Check the highlighted fields.',
          fields,
        )
      }
    }
    if (typeof body.code === 'string' && Object.prototype.hasOwnProperty.call(body, 'result')) {
      return new TransportError('business', error.status, message(body.massage), {}, body.code)
    }
    // Exception diagnostics stay out of UI state, including database details in 5xx messages.
    if (error.status < 500 && Array.isArray(body.messages)) {
      const messages = body.messages.filter(
        (value: unknown) => typeof value === 'string' && value.trim(),
      )
      if (messages.length) return new TransportError('http', error.status, messages.join('\n'))
    }
  }
  return new TransportError('http', error.status, 'The request could not be completed.')
}

export interface TransportPage<T> {
  readonly items: readonly T[]
  readonly pagination: {
    readonly currentPage: number
    readonly totalPages: number
    readonly totalCount: number
    readonly pageSize: number
    readonly hasPreviousPage: boolean
    readonly hasNextPage: boolean
  }
}

export function transportInteger(
  value: unknown,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new TransportError('contract', 0, 'The server returned an invalid integer.')
  }
  return value
}

/** Decimal coordinate parsing without map-provider or geofence assumptions. */
export function transportCoordinate(value: string, minimum: number, maximum: number): number {
  const trimmed = value.trim()
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) {
    throw new TransportError('validation', 0, 'Enter a decimal coordinate.')
  }
  const number = Number(trimmed)
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new TransportError(
      'validation',
      0,
      `Coordinate must be between ${minimum} and ${maximum}.`,
    )
  }
  return number
}

/** Explicit conversion from TanStack's zero-based index; no unconfirmed endpoint size limit. */
export function transportPageRequest(pageIndex: number, pageSize: number) {
  return {
    pageNumber: transportInteger(pageIndex, 0, Number.MAX_SAFE_INTEGER - 1) + 1,
    pageSize: transportInteger(pageSize, 1),
  }
}

export function decodeTransportPage<T>(
  value: unknown,
  decode: (item: unknown) => T,
): TransportPage<T> {
  const page = transportRecord(value)
  const pagination = transportRecord(page['pagination'])
  const list = page['list']
  if (
    !(list === null || Array.isArray(list)) ||
    typeof pagination['hasPreviousPage'] !== 'boolean' ||
    typeof pagination['hasNextPage'] !== 'boolean'
  ) {
    throw new TransportError('contract', 0, 'The server returned an invalid page.')
  }
  return {
    items: list === null ? [] : list.map(decode),
    pagination: {
      currentPage: transportInteger(pagination['currentPage'], 1),
      totalPages: transportInteger(pagination['totalPages']),
      totalCount: transportInteger(pagination['totalCount']),
      pageSize: transportInteger(pagination['pageSize'], 1),
      hasPreviousPage: pagination['hasPreviousPage'],
      hasNextPage: pagination['hasNextPage'],
    },
  }
}
