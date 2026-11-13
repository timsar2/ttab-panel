import { navigationFor } from './app.routes'

describe('panel navigation', () => {
  it('enables the Shift link in the selected company workspace', () => {
    const shift = navigationFor(2, false).find(item => item.id === 'shifts')

    expect(shift?.commands).toEqual(['/client', 2, 'shift'])
    expect(shift?.hint).toBeUndefined()
  })

  it('keeps Shift unavailable until a company is selected', () => {
    const shift = navigationFor(null, false).find(item => item.id === 'shifts')

    expect(shift?.commands).toBeUndefined()
    expect(shift?.hint).toBe('Choose a company first')
  })

  it('shows the Driver-Line link and opens its company list in Persian', () => {
    const driverLine = navigationFor(2, true).find(item => item.id === 'driver-line')

    expect(driverLine?.label).toBe('خط راننده')
    expect(driverLine?.commands).toEqual(['/client', 2, 'driver-line'])
  })
})
