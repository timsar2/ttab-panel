import { buildViolationReportFields, violationOptionLabel } from './support-form'

describe('Passenger support form mapping', () => {
  it('displays only the violation title', () => {
    expect(violationOptionLabel({ id: 8, code: 'INTERNAL-CODE', title: 'Unsafe driving' })).toBe(
      'Unsafe driving',
    )
  })

  it('maps selected numeric IDs, Gregorian occurrence time, and required active TripId', () => {
    const fields = buildViolationReportFields({
      reportedPersonId: 176,
      tripId: 72,
      violationIds: [8, 9],
      occurredDate: '۱۴۰۳/۰۱/۰۱',
      occurredTime: '08:30',
    })
    expect(fields).toEqual({
      ReportedPersonId: 176,
      TripId: 72,
      ViolationTypeIds: '8,9',
      OccureAt: '2024-03-20T08:30:00',
    })
    expect(fields).not.toHaveProperty('Code')
  })
})
