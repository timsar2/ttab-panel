import {
  decodeShiftDetail,
  decodeShiftGroup,
  decodeShiftListItem,
  decodeShiftTime,
  decodeShiftType,
} from './scheduling.models'

describe('legacy Shift API response decoders', () => {
  it('decodes the existing get-shift list response without group-detail fields', () => {
    const response = {
      name: 'ثابت خط تولید',
      shiftGroupId: 3,
      shiftGroupName: 'خط تولید',
      startTime: '07:30:00',
      endTime: '19:30:00',
      entranceShiftTimeName: 'سرویس صبح',
      returnShiftTimeName: 'سرویس عصر',
      orderNo: 1,
      id: 7,
    }

    expect(decodeShiftListItem(response)).toEqual(response)
  })

  it('decodes legacy group, type, time, and detail models without requiring unrelated fields', () => {
    expect(decodeShiftGroup({ id: 3, name: 'خط تولید' })).toEqual({
      id: 3,
      name: 'خط تولید',
      companyId: undefined,
      shiftTypeId: undefined,
      startDate: undefined,
      offShift: undefined,
      saturdayHoliday: undefined,
      thursdayHoliday: undefined,
      fridayHoliday: undefined,
      publicHoliday: undefined,
      rateCycle: undefined,
    })
    expect(decodeShiftType({ id: 2, name: 'ثابت' })).toEqual({ id: 2, name: 'ثابت' })
    expect(
      decodeShiftTime({ id: 5, companyId: 12, name: 'سرویس صبح', shiftTime: '07:30:00' }),
    ).toEqual({ id: 5, companyId: 12, name: 'سرویس صبح', shiftTime: '07:30:00' })
    expect(
      decodeShiftDetail({
        id: 7,
        shiftGroupName: 'خط تولید',
        name: 'ثابت خط تولید',
        shiftGroupId: 3,
        entranceShiftTimeId: 5,
        returnShiftTimeId: 6,
        orderNo: 1,
      }).id,
    ).toBe(7)
  })

  it('rejects malformed list records rather than substituting a guessed Shift Group DTO', () => {
    expect(() => decodeShiftListItem({ id: 7, name: 'Invalid' })).toThrow()
    expect(() => decodeShiftGroup({ id: 3 })).toThrow()
  })
})
