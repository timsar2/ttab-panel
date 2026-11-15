import { appRoutes, navigationFor } from './app.routes'

describe('panel navigation', () => {
  it('enables the departure-time feature in the selected company workspace', () => {
    const departureTimes = navigationFor(2, false).find(item => item.id === 'departure-times')

    expect(departureTimes?.commands).toEqual(['/client', 2, 'shift-time'])
    expect(departureTimes?.hint).toBeUndefined()
  })

  it('keeps departure times unavailable until a company is selected', () => {
    const departureTimes = navigationFor(null, false).find(item => item.id === 'departure-times')

    expect(departureTimes?.commands).toBeUndefined()
    expect(departureTimes?.hint).toBe('Choose a company first')
  })

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

  it('mounts Support only within the selected company context', () => {
    const support = navigationFor(5, false, ['Oprator']).find(item => item.id === 'support')
    expect(support?.commands).toEqual(['/client', 5, 'support'])
    expect(support?.hint).toBeUndefined()
    const unavailable = navigationFor(null, false, ['Oprator']).find(item => item.id === 'support')
    expect(unavailable?.commands).toBeUndefined()
    expect(unavailable?.hint).toBe('Choose a company first')
    expect(navigationFor(5, false, ['Driver']).some(item => item.id === 'support')).toBe(false)
  })

  it('shows the global-list Inspection feature only to backend-authorized staff', () => {
    expect(
      navigationFor(5, false, ['Admin']).find(item => item.id === 'inspections')?.commands,
    ).toEqual(['/client', 5, 'inspections'])
    expect(navigationFor(null, false, ['Oprator']).some(item => item.id === 'inspections')).toBe(
      false,
    )
  })

  it('redirects the legacy singular Passenger list and add URLs to the new feature', () => {
    const companyRoute = appRoutes.find(route => route.path === 'client/:companyId')
    const listAlias = companyRoute?.children?.find(route => route.path === 'passenger')
    const addAlias = companyRoute?.children?.find(route => route.path === 'passenger/add')

    expect(listAlias).toMatchObject({ pathMatch: 'full', redirectTo: 'passengers' })
    expect(addAlias).toMatchObject({ pathMatch: 'full', redirectTo: 'passengers/add' })
  })

  it('lazy-loads the shift-time app feature entry', () => {
    const companyRoute = appRoutes.find(route => route.path === 'client/:companyId')
    const shiftTimeRoute = companyRoute?.children?.find(route => route.path === 'shift-time')

    expect(shiftTimeRoute?.loadChildren).toBeDefined()
  })

  it('lazy-loads Inspection inside the company shell without claiming list filtering', () => {
    const company = appRoutes.find(candidate => candidate.path === 'client/:companyId')
    const route = company?.children?.find(candidate => candidate.path === 'inspections')
    expect(route?.loadChildren).toBeDefined()
  })
})
