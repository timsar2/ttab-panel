import { describe, expect, it } from 'vitest'
import { passengerSearchPayload } from './passengers.models'

describe('passengerSearchPayload', () => {
  it('scopes the legacy assignment filters to the active company', () => {
    expect(passengerSearchPayload(17, true, '  Sara  ')).toEqual({
      companyId: 17,
      hasShift: true,
      hasStation: true,
      fullName: 'Sara',
      pageNumber: 1,
      pageSize: 100,
    })
  })

  it('requests unassigned passengers without a blank name filter', () => {
    expect(passengerSearchPayload(4, false, '   ')).toEqual({
      companyId: 4,
      hasShift: false,
      hasStation: false,
      pageNumber: 1,
      pageSize: 100,
    })
  })
})
