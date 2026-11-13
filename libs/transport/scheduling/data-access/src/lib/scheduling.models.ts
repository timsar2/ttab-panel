import { TransportError, transportInteger, transportRecord } from '@org/transport-http'

export interface ShiftType {
  readonly id: number
  readonly name: string
}

export interface ShiftGroup {
  readonly id: number
  readonly companyId: number
  readonly shiftTypeId: number
  readonly name: string
  readonly startDate: string
  readonly rateCycle: number
  readonly saturdayHoliday: boolean | null
  readonly thursdayHoliday: boolean | null
  readonly fridayHoliday: boolean | null
  readonly publicHoliday: boolean | null
}

export interface ShiftTime {
  readonly id: number
  readonly name: string
  readonly shiftTime: string
}

export interface Shift {
  readonly id: number
  readonly shiftGroupId: number
  readonly shiftGroupName: string
  readonly name: string
  readonly rateCycle: number | null
  readonly offShift: boolean | null
  readonly orderNo: number | null
  readonly entranceShiftTimeId: number | null
  readonly returnShiftTimeId: number | null
  readonly startTime?: string | null
  readonly endTime?: string | null
  readonly entranceShiftTimeName?: string | null
  readonly returnShiftTimeName?: string | null
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
  readonly rateCycle: number
  readonly offShift: boolean
  readonly orderNo: number
  readonly entranceShiftTimeId: number | null
  readonly returnShiftTimeId: number | null
}

export function schedulingId(value: unknown): number {
  return transportInteger(value, 1, 2147483647)
}

function nullableBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'boolean')
    throw new TransportError('contract', 0, 'Invalid shift boolean field.')
  return value
}

export function decodeShiftType(value: unknown): ShiftType {
  const row = transportRecord(value)
  if (typeof row['name'] !== 'string')
    throw new TransportError('contract', 0, 'Invalid shift type.')
  return { id: schedulingId(row['id']), name: row['name'] }
}

export function decodeShiftGroup(value: unknown): ShiftGroup {
  const row = transportRecord(value)
  if (typeof row['name'] !== 'string' || typeof row['startDate'] !== 'string')
    throw new TransportError('contract', 0, 'Invalid shift group.')
  return {
    id: schedulingId(row['id']),
    companyId: schedulingId(row['companyId']),
    shiftTypeId: schedulingId(row['shiftTypeId']),
    name: row['name'],
    startDate: row['startDate'],
    rateCycle: transportInteger(row['rateCycle'], 1, 32767),
    saturdayHoliday: nullableBoolean(row['saturdayHoliday']),
    thursdayHoliday: nullableBoolean(row['thursdayHoliday']),
    fridayHoliday: nullableBoolean(row['fridayHoliday']),
    publicHoliday: nullableBoolean(row['publicHoliday']),
  }
}

export function decodeShift(value: unknown): Shift {
  const row = transportRecord(value)
  if (typeof row['name'] !== 'string') throw new TransportError('contract', 0, 'Invalid shift.')
  const nullableId = (id: unknown) => (id == null ? null : schedulingId(id))
  return {
    id: schedulingId(row['id']),
    shiftGroupId: schedulingId(row['shiftGroupId']),
    shiftGroupName: typeof row['shiftGroupName'] === 'string' ? row['shiftGroupName'] : '',
    name: row['name'],
    rateCycle: row['rateCycle'] == null ? null : transportInteger(row['rateCycle'], 1, 32767),
    offShift: nullableBoolean(row['offShift']),
    orderNo: row['orderNo'] == null ? null : transportInteger(row['orderNo'], 0, 32767),
    entranceShiftTimeId: nullableId(row['entranceShiftTimeId']),
    returnShiftTimeId: nullableId(row['returnShiftTimeId']),
    startTime: typeof row['startTime'] === 'string' ? row['startTime'] : null,
    endTime: typeof row['endTime'] === 'string' ? row['endTime'] : null,
    entranceShiftTimeName:
      typeof row['entranceShiftTimeName'] === 'string' ? row['entranceShiftTimeName'] : null,
    returnShiftTimeName:
      typeof row['returnShiftTimeName'] === 'string' ? row['returnShiftTimeName'] : null,
  }
}
