import { shiftTableColumns } from './shift-page'

describe('Shift table localization', () => {
  it('translates every Shift list column for Persian and English', () => {
    expect(shiftTableColumns('fa').map(column => column.header)).toEqual([
      'شیفت',
      'گروه شیفت',
      'ساعت شروع',
      'سرویس رفت',
      'سرویس برگشت',
      'ساعت پایان',
      'ترتیب',
    ])
    expect(shiftTableColumns('en').map(column => column.header)).toEqual([
      'Shift',
      'Shift group',
      'Start time',
      'Outbound service',
      'Return service',
      'End time',
      'Order',
    ])
  })
})
