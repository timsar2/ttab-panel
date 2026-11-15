import { signal } from '@angular/core'
import { of } from 'rxjs'
import { createInspectionRoutes, parseInspectionRouteId } from './inspection.routes'

const config = {
  path: 'inspections',
  apiUrl: '/api',
  endpoints: {
    collection: 'v1/inspections',
    search: 'v1/inspections/search',
    defects: 'v1/inspections/defects',
    correctiveActions: 'v1/inspections/corrective-actions',
    status: 'v1/inspections/status',
  },
  access: () => () => of(true),
  language: () => signal<'en' | 'fa'>('en'),
  scope: () => signal<number | null>(4),
  lookups: {
    drivers: () => () => of([]),
    vehicles: () => () => of({ items: [], pageNumber: 1, hasNext: false }),
  },
  lookupProviders: [],
}

describe('Inspection route factory', () => {
  it('mounts list and detail lazily with route-scoped providers', () => {
    const route = createInspectionRoutes(config)[0]
    expect(route.path).toBe('inspections')
    expect(route.providers).toBeDefined()
    expect(route.children?.map(child => child.path)).toEqual(['', 'new', ':id'])
    expect(route.children?.[2].data?.['breadcrumb']).toBeNull()
    expect(route.children?.every(child => typeof child.loadComponent === 'function')).toBe(true)
  })

  it.each([
    ['1', 1],
    ['2147483647', 2147483647],
    ['0', null],
    ['-1', null],
    ['1.2', null],
    ['9007199254740992', null],
    [null, null],
  ] as const)('validates inspection IDs in routes: %s', (value, expected) =>
    expect(parseInspectionRouteId(value)).toBe(expected),
  )
})
