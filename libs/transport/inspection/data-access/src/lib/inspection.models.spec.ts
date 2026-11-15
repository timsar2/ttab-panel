import {
  INSPECTION_CHECKS,
  inspectionDate,
  inspectionDefectWrite,
  inspectionCorrectiveActionWrite,
  inspectionVisitWrite,
} from './inspection.models'

describe('Inspection contract validation', () => {
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
