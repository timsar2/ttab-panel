import {
  DepartureCompanyId,
  DepartureTimeId,
  departureCompanyId,
  departureTimeId,
} from '@org/transport-departure-times-data-access'
import { RouteId, routeId } from '@org/transport-routes-data-access'
import { TransportError, transportInteger, transportRecord } from '@org/transport-http'

export type LineCompanyId = DepartureCompanyId
export type LineId = number & { readonly __lineId: unique symbol }

export function lineId(value: unknown): LineId {
  return transportInteger(value, 1) as LineId
}

export interface LineRow {
  readonly id: LineId
  readonly directionId: RouteId
  readonly directionName: string | null
  readonly name: string
  readonly entranceShiftTimeName: string | null
  readonly returnShiftTimeName: string | null
}

export interface LineDetail extends LineRow {
  readonly entranceShiftTimeId: DepartureTimeId | null
  readonly returnShiftTimeId: DepartureTimeId | null
}

export interface LineDraft {
  readonly directionId: RouteId
  readonly name: string
  readonly entranceShiftTimeId: DepartureTimeId | null
  readonly returnShiftTimeId: DepartureTimeId | null
}

export interface LineWriteDto extends LineDraft {
  readonly companyId: LineCompanyId
  readonly id?: LineId
}

export interface LineSearch {
  readonly pageIndex: number
  readonly pageSize: number
}

function optionalTimeId(value: unknown, field: string): DepartureTimeId | null {
  if (value == null) return null
  try {
    return departureTimeId(value)
  } catch {
    throw new TransportError('contract', 0, `The Line response contains an invalid ${field}.`)
  }
}

function optionalDisplayName(value: unknown, field: string): string | null {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  throw new TransportError('contract', 0, `The Line response contains an invalid ${field}.`)
}

export function decodeLineRow(value: unknown): LineRow {
  const row = transportRecord(value)
  if (typeof row['name'] !== 'string')
    throw new TransportError('contract', 0, 'The Line response is missing its name.')
  const directionName = row['directionName']
  if (directionName != null && typeof directionName !== 'string')
    throw new TransportError('contract', 0, 'The Line response contains an invalid Direction name.')
  return {
    id: lineId(row['id']),
    directionId: routeId(row['directionId']),
    directionName: directionName ?? null,
    name: row['name'],
    // Accept the legacy typo and the current API spelling; keep the value display-only.
    entranceShiftTimeName: optionalDisplayName(
      row['entranceShiftTimeName'] ?? row['enteranceShiftTimeName'],
      'entrance Shift Time name',
    ),
    returnShiftTimeName: optionalDisplayName(row['returnShiftTimeName'], 'return Shift Time name'),
  }
}

export function decodeLine(value: unknown): LineDetail {
  const row = transportRecord(value)
  return {
    ...decodeLineRow(row),
    entranceShiftTimeId: optionalTimeId(row['entranceShiftTimeId'], 'entrance Shift Time ID'),
    returnShiftTimeId: optionalTimeId(row['returnShiftTimeId'], 'return Shift Time ID'),
  }
}

export function lineWrite(
  companyIdValue: unknown,
  directionIdValue: unknown,
  draft: LineDraft,
  id?: LineId,
): LineWriteDto {
  const companyId = departureCompanyId(companyIdValue)
  const directionId = routeId(directionIdValue)
  if (directionId !== draft.directionId)
    throw new TransportError('validation', 0, 'The Line Direction does not match its route scope.')
  if (typeof draft.name !== 'string' || !draft.name.trim())
    throw new TransportError('validation', 0, 'Enter a Line name.', { name: ['Name is required.'] })
  return {
    companyId,
    directionId,
    name: draft.name.trim(),
    entranceShiftTimeId: optionalTimeId(draft.entranceShiftTimeId, 'entrance Shift Time ID'),
    returnShiftTimeId: optionalTimeId(draft.returnShiftTimeId, 'return Shift Time ID'),
    ...(id === undefined ? {} : { id: lineId(id) }),
  }
}
