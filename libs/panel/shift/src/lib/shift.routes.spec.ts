import { signal } from '@angular/core'
import { of } from 'rxjs'
import { createShiftRoutes } from './shift.routes'

describe('Shift route factory', () => {
  it('exposes the company-scoped list, add, and detail route shapes', () => {
    const config = {
      apiUrl: '/api',
      endpoints: {
        shifts: 'v1/shifts/get-shift',
        shiftDetail: 'v1/shifts',
        groups: 'v1/shifts/shift-group',
        types: 'v1/shifts/shift-type',
        shiftTimes: 'v1/shiftTimes',
        saveGroup: 'v1/shifts/set-group',
        saveShift: 'v1/shifts/set-shift',
      },
      company: () => signal(1),
      access: () => () => of(true),
      canManage: () => signal(true),
      language: () => signal<'en' | 'fa'>('en'),
    }
    for (const path of ['shift', 'scheduling']) {
      const root = createShiftRoutes({ ...config, path })[0]
      expect(root.path).toBe(path)
      expect(root.children?.map(route => route.path)).toEqual(['', 'add', 'detail/:id'])
    }
  })
})
