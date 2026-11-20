import { signal } from '@angular/core'
import { of } from 'rxjs'
import { createInspectorRoutes } from './inspector.routes'

describe('Inspector route factory', () => {
  it('redirects the protected app entry to visit creation and lazy-loads own detail', () => {
    const [route] = createInspectorRoutes({
      path: '',
      apiUrl: '/api',
      endpoints: {
        collection: 'v1/inspections',
        search: 'v1/inspections/search',
        defects: 'v1/inspections/defects',
        correctiveActions: 'v1/inspections/corrective-actions',
        status: 'v1/inspections/status',
      },
      access: () => () => of(true),
      language: () => signal<'fa' | 'en'>('fa'),
      companyId: () => signal<number | null>(null),
      lookups: {
        drivers: () => () => of([]),
        vehicles: () => () => of({ items: [], pageNumber: 1, hasNext: false }),
      },
      lookupProviders: [],
    })
    expect(route.path).toBe('')
    expect(route.children?.map(child => child.path)).toEqual(['', 'new', ':id'])
    expect(route.children?.[0].redirectTo).toBe('new')
    expect(route.children?.[2].data?.['breadcrumb']).toBeNull()
  })
})
