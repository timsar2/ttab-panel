import { createInspectorRoutes } from './inspection.routes'
import { InspectorShell } from './inspector-shell'

describe('Inspector routes', () => {
  it('reuses the shared Inspection create/detail routes and defaults to new visit creation', () => {
    const [route] = createInspectorRoutes()
    expect(route.path).toBe('')
    expect(route.component).toBe(InspectorShell)
    expect(route.canActivate?.length).toBe(1)
    expect(route.children?.[0]).toMatchObject({ path: '', pathMatch: 'full', redirectTo: 'new' })
    expect(route.children?.map(child => child.path)).toEqual(['', 'new', ':id'])
  })
})
