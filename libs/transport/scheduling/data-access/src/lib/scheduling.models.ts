import { TransportError, transportInteger, transportRecord } from '@org/transport-http'

export interface ShiftType {
  readonly id: number
  readonly name: string
}

/** Mirrors the legacy IShiftGroup/IShiftGroupDetail DTOs. */
export interface ShiftGroup {
  readonly id: number
  readonly companyId?: number
  readonly shiftTypeId?: number
  readonly name: string
  readonly startDate?: string
  readonly offShift?: boolean
  readonly saturdayHoliday?: boolean
  readonly thursdayHoliday?: boolean
  readonly fridayHoliday?: boolean
  readonly publicHoliday?: boolean
  readonly rateCycle?: number
}

/** Mirrors the legacy IShiftTime response. */
export interface ShiftTime {
  readonly id: number
  readonly companyId: number
  readonly name: string
  readonly shiftTime: string
}

/** Mirrors the legacy IShift list response plus its returned group id. */
export interface ShiftListItem {
  readonly id: number
  readonly shiftGroupId: number
  readonly shiftGroupName: string
  readonly name: string
  readonly startTime: string
  readonly endTime: string
  readonly orderNo: number
  readonly entranceShiftTimeId?: number
  readonly entranceShiftTimeName?: string
  readonly returnShiftTimeId?: number
  readonly returnShiftTimeName?: string
}

/** Mirrors the legacy IShiftDetail response; the legacy DTO omits rateCycle/offShift. */
export interface ShiftDetail {
  readonly id?: number
  readonly shiftGroupName: string
  readonly name: string
  readonly shiftGroupId?: number
  readonly entranceShiftTimeId: number
  readonly returnShiftTimeId: number
  readonly orderNo: number
}

/** Mirrors the legacy ISetShift response. */
export interface ShiftWriteResult {
  readonly id?: number
  readonly shiftGroupId?: number
  readonly offShift: boolean
  readonly name: string
  readonly rateCycle: number | null
  readonly orderNo: number | null
  readonly entranceShiftTimeId?: number
  readonly returnShiftTimeId?: number
}

export interface ShiftGroupDraft {
  readonly shiftTypeId: number
  readonly name: string
  readonly startDate: string
  readonly rateCycle: number
  readonly saturdayHoliday: boolean
  readonly thursdayHoliday: boolean
  readonly fridayHoliday: boolean
  readonly publicHoliday: boolean
}

export interface ShiftDraft {
  readonly shiftGroupId: number
  readonly name: string
  readonly rateCycle: number | null
  readonly offShift: boolean
  readonly orderNo: number | null
  readonly entranceShiftTimeId: number | null
  readonly returnShiftTimeId: number | null
}

export function schedulingId(value: unknown): number {
  return transportInteger(value, 1, 2147483647)
}

function optionalId(value: unknown): number | undefined {
  return value === null || value === undefined ? undefined : schedulingId(value)
}

function optionalString(row: Record<string, unknown>, key: string): string | undefined {
  const value = row[key]
  if (value === null || value === undefined) return undefined
  if (typeof value !== 'string')
    throw new TransportError('contract', 0, `Invalid ${key} in Shift response.`)
  return value
}

function optionalBoolean(row: Record<string, unknown>, key: string): boolean | undefined {
  const value = row[key]
  if (value === null || value === undefined) return undefined
  if (typeof value !== 'boolean')
    throw new TransportError('contract', 0, `Invalid ${key} in Shift response.`)
  return value
}

export function decodeShiftType(value: unknown): ShiftType {
  const row = transportRecord(value)
  if (typeof row['name'] !== 'string')
    throw new TransportError('contract', 0, 'Invalid Shift Type response.')
  return { id: schedulingId(row['id']), name: row['name'] }
}

export function decodeShiftGroup(value: unknown): ShiftGroup {
  const row = transportRecord(value)
  if (typeof row['name'] !== 'string')
    throw new TransportError('contract', 0, 'Invalid Shift Group response.')
  const rateCycle =
    row['rateCycle'] == null ? undefined : transportInteger(row['rateCycle'], 1, 32767)
  return {
    id: schedulingId(row['id']),
    companyId: optionalId(row['companyId']),
    shiftTypeId: optionalId(row['shiftTypeId']),
    name: row['name'],
    startDate: optionalString(row, 'startDate'),
    offShift: optionalBoolean(row, 'offShift'),
    saturdayHoliday: optionalBoolean(row, 'saturdayHoliday'),
    thursdayHoliday: optionalBoolean(row, 'thursdayHoliday'),
    fridayHoliday: optionalBoolean(row, 'fridayHoliday'),
    publicHoliday: optionalBoolean(row, 'publicHoliday'),
    rateCycle,
  }
}

export function decodeShiftTime(value: unknown): ShiftTime {
  const row = transportRecord(value)
  if (typeof row['name'] !== 'string' || typeof row['shiftTime'] !== 'string')
    throw new TransportError('contract', 0, 'Invalid Shift Time response.')
  return {
    id: schedulingId(row['id']),
    companyId: schedulingId(row['companyId']),
    name: row['name'],
    shiftTime: row['shiftTime'],
  }
}

export function decodeShiftListItem(value: unknown): ShiftListItem {
  const row = transportRecord(value)
  if (
    typeof row['name'] !== 'string' ||
    typeof row['shiftGroupName'] !== 'string' ||
    typeof row['startTime'] !== 'string' ||
    typeof row['endTime'] !== 'string'
  )
    throw new TransportError('contract', 0, 'Invalid Shift list response.')
  return {
    id: schedulingId(row['id']),
    shiftGroupId: schedulingId(row['shiftGroupId']),
    shiftGroupName: row['shiftGroupName'],
    name: row['name'],
    startTime: row['startTime'],
    endTime: row['endTime'],
    orderNo: transportInteger(row['orderNo'], 0, 32767),
    entranceShiftTimeId: optionalId(row['entranceShiftTimeId']),
    entranceShiftTimeName: optionalString(row, 'entranceShiftTimeName'),
    returnShiftTimeId: optionalId(row['returnShiftTimeId']),
    returnShiftTimeName: optionalString(row, 'returnShiftTimeName'),
  }
}

export function decodeShiftDetail(value: unknown): ShiftDetail {
  const row = transportRecord(value)
  if (typeof row['name'] !== 'string' || typeof row['shiftGroupName'] !== 'string')
    throw new TransportError('contract', 0, 'Invalid Shift detail response.')
  return {
    id: optionalId(row['id']),
    shiftGroupName: row['shiftGroupName'],
    name: row['name'],
    shiftGroupId: optionalId(row['shiftGroupId']),
    entranceShiftTimeId: schedulingId(row['entranceShiftTimeId']),
    returnShiftTimeId: schedulingId(row['returnShiftTimeId']),
    orderNo: transportInteger(row['orderNo'], 0, 32767),
  }
}

export function decodeShiftWriteResult(value: unknown): ShiftWriteResult {
  const row = transportRecord(value)
  if (typeof row['name'] !== 'string' || typeof row['offShift'] !== 'boolean')
    throw new TransportError('contract', 0, 'Invalid saved Shift response.')
  return {
    id: optionalId(row['id']),
    shiftGroupId: optionalId(row['shiftGroupId']),
    offShift: row['offShift'],
    name: row['name'],
    rateCycle: row['rateCycle'] === null ? null : transportInteger(row['rateCycle'], 1, 32767),
    orderNo: row['orderNo'] === null ? null : transportInteger(row['orderNo'], 0, 32767),
    entranceShiftTimeId: optionalId(row['entranceShiftTimeId']),
    returnShiftTimeId: optionalId(row['returnShiftTimeId']),
  }
}
