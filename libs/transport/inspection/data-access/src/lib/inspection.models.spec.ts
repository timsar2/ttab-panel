import {
  INSPECTION_CHECKS,
  inspectionDate,
  decodeInspectionDetail,
  inspectionDefectWrite,
  inspectionCorrectiveActionWrite,
  inspectionCheckAnswerLabel,
  inspectionVisitWrite,
} from './inspection.models'
import { inspectionStatusLabel } from './inspection-status'

describe('Inspection contract validation', () => {
  it('localizes known automatic inspection statuses and preserves unknown server text', () => {
    expect(inspectionStatusLabel('Pending action', 'fa')).toBe('در انتظار اقدام')
    expect(inspectionStatusLabel('Pending approval', 'fa')).toBe('در انتظار تأیید')
    expect(inspectionStatusLabel('Approved', 'en')).toBe('Approved')
    expect(inspectionStatusLabel(1, 'en')).toBe('Pending action')
    expect(inspectionStatusLabel(2, 'fa')).toBe('در انتظار تأیید')
    expect(inspectionStatusLabel('Needs review', 'en')).toBe('Needs review')
    expect(inspectionStatusLabel(null, 'fa')).toBe('نامشخص')
  })
  it('decodes numeric status IDs when detail has no status name', () => {
    const checks = Object.fromEntries(INSPECTION_CHECKS.map(check => [check, false]))
    const detail = decodeInspectionDetail({
      id: 6,
      inspectorId: 331,
      inspectorName: 'Inspector',
      inspectionDate: '2026-11-20T00:00:00',
      driverId: 241,
      driverName: 'Driver',
      vehicleId: 92,
      carPlate: '62T15345',
      statusTypeId: 1,
      statusTypeName: null,
      description: 'Inspection',
      defects: [
        { id: 2, inspectionVisitId: 6, dueDate: '2026-11-20T00:00:00', description: 'sefr' },
      ],
      correctiveActions: [
        {
          id: 2,
          inspectionVisitId: 6,
          completedAt: '2026-11-26T00:00:00',
          description: 'corrected',
        },
      ],
      ...checks,
    })
    expect(detail.statusTypeId).toBe(1)
    expect(detail.statusTypeName).toBeNull()
    expect(detail.defects[0].dueDate).toBe('2026-11-20')
    expect(detail.correctiveActions[0].completedAt).toBe('2026-11-26')
    expect(inspectionStatusLabel(detail.statusTypeName ?? detail.statusTypeId, 'fa')).toBe(
      'در انتظار اقدام',
    )
  })
  it.each(['2024-02-29', '2026-11-15'])('accepts date-only values: %s', value =>
    expect(inspectionDate(value)).toBe(value),
  )
  it.each(['2026-02-29', '2026-13-01', '2026-11-5', '2026-11-15T12:00:00', ''])(
    'rejects invalid or non-date-only values: %s',
    value => expect(() => inspectionDate(value)).toThrow(),
  )
  it('keeps required actions and completed actions as distinct insert-only payloads', () => {
    expect(
      inspectionDefectWrite({
        id: 0,
        inspectionVisitId: 2 as never,
        dueDate: '2026-11-20',
        description: ' repair ',
      }),
    ).toEqual({ id: 0, inspectionVisitId: 2, dueDate: '2026-11-20', description: 'repair' })
    expect(
      inspectionCorrectiveActionWrite({
        id: 0,
        inspectionVisitId: 2 as never,
        completedAt: '2026-11-21',
        description: ' fixed ',
      }),
    ).toEqual({ id: 0, inspectionVisitId: 2, completedAt: '2026-11-21', description: 'fixed' })
  })
  it('requires all twelve explicit true/false inspection values', () => {
    const checks = Object.fromEntries(INSPECTION_CHECKS.map(check => [check, false]))
    const body = inspectionVisitWrite({
      id: 0,
      inspectionDate: '2026-11-15',
      driverId: 40000,
      vehicleId: 32000,
      description: 'Inspect vehicle',
      ...checks,
    })
    expect(Object.fromEntries(INSPECTION_CHECKS.map(check => [check, body[check]]))).toEqual(checks)
    expect(body).toMatchObject({ id: 0, driverId: 40000, vehicleId: 32000 })
  })
  it('maps each stored radio value to the same descriptive label key used on registration', () => {
    expect(inspectionCheckAnswerLabel('tiresCondition', true)).toBe('satisfactoryValue')
    expect(inspectionCheckAnswerLabel('tiresCondition', false)).toBe('needsAttentionValue')
    expect(inspectionCheckAnswerLabel('hasSeatBelt', true)).toBe('yesValue')
    expect(inspectionCheckAnswerLabel('hasSeatBelt', false)).toBe('noValue')
    expect(INSPECTION_CHECKS).toHaveLength(12)
    for (const check of INSPECTION_CHECKS) {
      expect(inspectionCheckAnswerLabel(check, true)).not.toBe('trueValue')
      expect(inspectionCheckAnswerLabel(check, false)).not.toBe('falseValue')
    }
  })
  it('rejects IDs outside SQL integer/smallint ranges and overlong descriptions', () => {
    const checks = Object.fromEntries(INSPECTION_CHECKS.map(check => [check, true]))
    const visit = (driverId: number, vehicleId: number, description: string) => () =>
      inspectionVisitWrite({
        id: 0,
        inspectionDate: '2026-11-15',
        driverId,
        vehicleId,
        description,
        ...checks,
      })
    expect(visit(0, 1, 'x')).toThrow()
    expect(visit(1, 32768, 'x')).toThrow()
    expect(visit(1, 1, 'x'.repeat(1001))).toThrow()
  })
})
