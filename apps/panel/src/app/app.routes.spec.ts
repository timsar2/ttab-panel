import { appRoutes, navigationFor } from './app.routes'

describe('panel navigation', () => {
  it('lands on Companies and opens each selected workspace on Dashboard', () => {
    expect(appRoutes[0]).toMatchObject({ path: '', pathMatch: 'full', redirectTo: 'companies' })
    expect(appRoutes.some(route => route.path === 'workspace')).toBe(false)
    const company = appRoutes.find(route => route.path === 'client/:companyId')
    expect(company?.children?.[0]).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'dashboard',
    })
  })

  it('exposes Companies in the sidebar for company management routes', () => {
    const companies = navigationFor(null, false).find(item => item.id === 'companies')
    expect(companies?.commands).toEqual(['/companies'])
    expect(companies?.label).toBe('Companies')
  })

  it('mounts company list and editor pages under the panel layout shell', () => {
    const companies = appRoutes.find(route => route.path === 'companies')
    expect(companies?.component).toBeDefined()
    expect(companies?.children?.map(route => route.path)).toEqual(['new', ':companyId/edit', ''])
    expect(companies?.children?.map(route => route.data?.['breadcrumb'])).toEqual([
      'Create company',
      'Edit company',
      null,
    ])
  })

  it('adds the Dashboard link to the selected company workspace in Persian', () => {
    const dashboard = navigationFor(5, true).find(item => item.id === 'dashboard')
    expect(dashboard?.label).toBe('داشبورد')
    expect(dashboard?.commands).toEqual(['/client', 5, 'dashboard'])
  })

  it('keeps Dashboard unavailable until a company is selected', () => {
    const dashboard = navigationFor(null, false).find(item => item.id === 'dashboard')
    expect(dashboard?.commands).toBeUndefined()
    expect(dashboard?.hint).toBe('Choose a company first')
  })

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
    const support = navigationFor(5, false, ['Operator']).find(item => item.id === 'support')
    expect(support?.commands).toEqual(['/client', 5, 'support'])
    expect(support?.hint).toBeUndefined()
    const unavailable = navigationFor(null, false, ['Operator']).find(item => item.id === 'support')
    expect(unavailable?.commands).toBeUndefined()
    expect(unavailable?.hint).toBe('Choose a company first')
    expect(navigationFor(5, false, ['Driver']).some(item => item.id === 'support')).toBe(false)
  })

  it('links the Monitoring and support group heading to Support in a selected company', () => {
    const groupHeading = navigationFor(5, true, ['Operator']).find(item => item.id === 'tracking')
    expect(groupHeading?.group).toBe('نظارت و پشتیبانی')
    expect(groupHeading?.groupCommands).toEqual(['/client', 5, 'support'])
    expect(
      navigationFor(null, true, ['Operator']).find(item => item.id === 'tracking')?.groupCommands,
    ).toBeUndefined()
  })

  it('shows the global-list Inspection feature only to backend-authorized staff', () => {
    expect(
      navigationFor(5, false, ['Admin']).find(item => item.id === 'inspections')?.commands,
    ).toEqual(['/client', 5, 'inspections'])
    expect(navigationFor(null, false, ['Operator']).some(item => item.id === 'inspections')).toBe(
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
