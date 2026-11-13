import { appRoutes, navigationFor } from './app.routes'

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

  it('enables the Passenger link in the selected company workspace', () => {
    const passengers = navigationFor(1, true).find(item => item.id === 'passengers')

    expect(passengers?.commands).toEqual(['/client', 1, 'passengers'])
    expect(passengers?.hint).toBeUndefined()
  })

  it('keeps Passenger unavailable until a company is selected', () => {
    const passengers = navigationFor(null, true).find(item => item.id === 'passengers')

    expect(passengers?.commands).toBeUndefined()
    expect(passengers?.hint).toBe('ابتدا یک شرکت انتخاب کنید')
  })

  it('redirects the legacy singular Passenger list and add URLs to the new feature', () => {
    const companyRoute = appRoutes.find(route => route.path === 'client/:companyId')
    const listAlias = companyRoute?.children?.find(route => route.path === 'passenger')
    const addAlias = companyRoute?.children?.find(route => route.path === 'passenger/add')

    expect(listAlias).toMatchObject({ pathMatch: 'full', redirectTo: 'passengers' })
    expect(addAlias).toMatchObject({ pathMatch: 'full', redirectTo: 'passengers/add' })
  })
})
