import { hasPassengerAccess } from './passenger.routes'

describe('Passenger role policy', () => {
  it('allows the Client role issued by mobile OTP authentication', () => {
    expect(hasPassengerAccess(['Client'])).toBe(true)
  })

  it('rejects Driver sessions, including sessions with multiple roles', () => {
    expect(hasPassengerAccess(['Client', 'Driver'])).toBe(false)
    expect(hasPassengerAccess(['Driver'])).toBe(false)
  })

  it('rejects roles that are not Passenger clients', () => {
    expect(hasPassengerAccess(['Admin'])).toBe(false)
    expect(hasPassengerAccess([])).toBe(false)
  })

  it.each(['Admin', 'Manager', 'Oprator', 'Operator'])(
    'rejects staff sessions even if they also carry the Client role: %s',
    role => expect(hasPassengerAccess(['Client', role])).toBe(false),
  )
})
