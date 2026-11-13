import { decodeShift, decodeShiftGroup, decodeShiftType } from './scheduling.models'

describe('scheduling API decoders', () => {
  it('decodes company-scoped group and shift records without date/time conversion', () => {
    const group = decodeShiftGroup({
      id: 4,
      companyId: 12,
      shiftTypeId: 2,
      name: 'Day shift',
      startDate: '2026-11-13T00:00:00',
      rateCycle: 1,
      saturdayHoliday: false,
      thursdayHoliday: false,
      fridayHoliday: true,
      publicHoliday: true,
    })
    expect(group.companyId).toBe(12)
    expect(group.startDate).toBe('2026-11-13T00:00:00')
    expect(decodeShiftType({ id: 2, name: 'Production' }).name).toBe('Production')
    expect(decodeShift({ id: 8, shiftGroupId: 4, name: 'Morning', orderNo: 1 }).shiftGroupId).toBe(
      4,
    )
  })

  it('rejects malformed ids and records', () => {
    expect(() => decodeShiftType({ id: 0, name: 'Invalid' })).toThrow()
    expect(() => decodeShift({ id: 8, shiftGroupId: 4 })).toThrow()
  })
})
