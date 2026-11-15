import { TransportError, transportInteger, transportRecord } from '@org/transport-http'

export type InspectionId = number & { readonly __inspectionId: unique symbol }
export function inspectionId(value: unknown): InspectionId {
  return transportInteger(value, 1, 2147483647) as InspectionId
}

export const INSPECTION_CHECKS = [
  'tiresCondition',
  'lightsCondition',
  'seatsCondition',
  'hasSeatBelt',
  'heaterCondition',
  'airConditionerCondition',
  'hasFirstAidKit',
  'hasFireExtinguisher',
  'hasTurnSignals',
  'wipersCondition',
  'windowsCondition',
  'hasSafetyVestAndWarningTriangle',
] as const
export type InspectionCheck = (typeof INSPECTION_CHECKS)[number]

export interface InspectionSearch {
  readonly pageNumber: number
  readonly pageSize: number
  readonly orderBy: InspectionSort
}
export type InspectionSort =
  | 'Id'
  | 'Id DESC'
  | 'InspectionDate'
  | 'InspectionDate DESC'
  | 'InspectorName'
  | 'InspectorName DESC'
  | 'DriverName'
  | 'DriverName DESC'

export interface InspectionVisitRow {
  readonly id: InspectionId
  readonly inspectorId: number
  readonly inspectorName: string | null
  readonly inspectionDate: string
  readonly driverId: number
  readonly driverName: string | null
  readonly vehicleId: number
  readonly carPlate: string | null
  /** The procedure aliases the status display name as StatusTypeId. */
  readonly statusTypeId: string | null
}

export interface InspectionDefect {
  readonly id: number
  readonly inspectionVisitId: InspectionId
  readonly dueDate: string
  readonly description: string
}
export interface InspectionCorrectiveAction {
  readonly id: number
  readonly inspectionVisitId: InspectionId
  readonly completedAt: string
  readonly description: string
}
export interface InspectionDetail extends InspectionVisitRow {
  readonly tiresCondition: boolean
  readonly lightsCondition: boolean
  readonly seatsCondition: boolean
  readonly hasSeatBelt: boolean
  readonly heaterCondition: boolean
  readonly airConditionerCondition: boolean
  readonly hasFirstAidKit: boolean
  readonly hasFireExtinguisher: boolean
  readonly hasTurnSignals: boolean
  readonly wipersCondition: boolean
  readonly windowsCondition: boolean
  readonly hasSafetyVestAndWarningTriangle: boolean
  readonly description: string
  readonly defects: readonly InspectionDefect[]
  readonly correctiveActions: readonly InspectionCorrectiveAction[]
}

export type InspectionVisitDraft = {
  readonly id: 0
  readonly inspectionDate: string
  readonly driverId: number
  readonly vehicleId: number
  readonly description: string
} & Readonly<Record<InspectionCheck, boolean>>
export interface InspectionDefectDraft {
  readonly id: 0
  readonly inspectionVisitId: InspectionId
  readonly dueDate: string
  readonly description: string
}
export interface InspectionCorrectiveActionDraft {
  readonly id: 0
  readonly inspectionVisitId: InspectionId
  readonly completedAt: string
  readonly description: string
}

function fail(message: string): never {
  throw new TransportError('contract', 0, message)
}
function nullableText(value: unknown): string | null {
  if (value === null || typeof value === 'string') return value
  return fail('The inspection response contains invalid text.')
}
function text(value: unknown): string {
  if (typeof value === 'string') return value
  return fail('The inspection response contains invalid text.')
}
function date(value: unknown): string {
  if (typeof value !== 'string') return fail('The inspection response contains an invalid date.')
  const match = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(value)
  if (!match || !validDate(match[1]))
    return fail('The inspection response contains an invalid date.')
  return match[1]
}
function validDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}
export function inspectionDate(value: unknown): string {
  if (typeof value !== 'string' || !validDate(value))
    throw new TransportError('validation', 0, 'Enter a valid calendar date.')
  return value
}
function checkValues(row: Record<string, unknown>): Pick<InspectionDetail, InspectionCheck> {
  return {
    tiresCondition: bool(row['tiresCondition']),
    lightsCondition: bool(row['lightsCondition']),
    seatsCondition: bool(row['seatsCondition']),
    hasSeatBelt: bool(row['hasSeatBelt']),
    heaterCondition: bool(row['heaterCondition']),
    airConditionerCondition: bool(row['airConditionerCondition']),
    hasFirstAidKit: bool(row['hasFirstAidKit']),
    hasFireExtinguisher: bool(row['hasFireExtinguisher']),
    hasTurnSignals: bool(row['hasTurnSignals']),
    wipersCondition: bool(row['wipersCondition']),
    windowsCondition: bool(row['windowsCondition']),
    hasSafetyVestAndWarningTriangle: bool(row['hasSafetyVestAndWarningTriangle']),
  }
}
function bool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  return fail('The inspection response contains an invalid check value.')
}
function visitFields(row: Record<string, unknown>): InspectionVisitRow {
  const vehicleId = transportInteger(row['vehicleId'], 1, 32767)
  return {
    id: inspectionId(row['id']),
    inspectorId: transportInteger(row['inspectorId'], 1),
    inspectorName: nullableText(row['inspectorName']),
    inspectionDate: date(row['inspectionDate']),
    driverId: transportInteger(row['driverId'], 1),
    driverName: nullableText(row['driverName']),
    vehicleId,
    carPlate: nullableText(row['carPlate']),
    statusTypeId: row['statusTypeId'] == null ? null : nullableText(row['statusTypeId']),
  }
}
function decodeDefect(value: unknown): InspectionDefect {
  const row = transportRecord(value)
  return {
    id: transportInteger(row['id'], 1),
    inspectionVisitId: inspectionId(row['inspectionVisitId']),
    dueDate: date(row['dueDate']),
    description: text(row['description']),
  }
}
function decodeAction(value: unknown): InspectionCorrectiveAction {
  const row = transportRecord(value)
  return {
    id: transportInteger(row['id'], 1),
    inspectionVisitId: inspectionId(row['inspectionVisitId']),
    completedAt: date(row['completedAt']),
    description: text(row['description']),
  }
}
export function decodeInspectionVisit(value: unknown): InspectionVisitRow {
  return visitFields(transportRecord(value))
}
export function decodeInspectionDetail(value: unknown): InspectionDetail {
  const row = transportRecord(value)
  if (!Array.isArray(row['defects']) || !Array.isArray(row['correctiveActions']))
    return fail('The inspection response has invalid remediation collections.')
  return {
    ...visitFields(row),
    ...checkValues(row),
    description: text(row['description']),
    defects: row['defects'].map(decodeDefect),
    correctiveActions: row['correctiveActions'].map(decodeAction),
  }
}
export function decodeInspectionList(
  value: unknown,
  request: InspectionSearch,
): readonly InspectionVisitRow[] {
  if (!Array.isArray(value)) return fail('The inspection list response is invalid.')
  const rows = value.map(decodeInspectionVisit)
  if (rows.length > request.pageSize || new Set(rows.map(row => row.id)).size !== rows.length)
    return fail('The inspection page is inconsistent.')
  return rows
}
export function inspectionVisitWrite(draft: InspectionVisitDraft) {
  const body: Record<string, unknown> = {
    id: 0,
    inspectionDate: inspectionDate(draft.inspectionDate),
    driverId: transportInteger(draft.driverId, 1),
    vehicleId: transportInteger(draft.vehicleId, 1, 32767),
    description: requiredText(draft.description, 1000),
  }
  for (const check of INSPECTION_CHECKS) body[check] = bool(draft[check])
  return body
}
export function inspectionDefectWrite(draft: InspectionDefectDraft) {
  return {
    id: 0,
    inspectionVisitId: inspectionId(draft.inspectionVisitId),
    dueDate: inspectionDate(draft.dueDate),
    description: requiredText(draft.description, 300),
  }
}
export function inspectionCorrectiveActionWrite(draft: InspectionCorrectiveActionDraft) {
  return {
    id: 0,
    inspectionVisitId: inspectionId(draft.inspectionVisitId),
    completedAt: inspectionDate(draft.completedAt),
    description: requiredText(draft.description, 300),
  }
}
function requiredText(value: string, maximum: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum)
    throw new TransportError('validation', 0, 'Enter a description within the allowed length.')
  return value.trim()
}
