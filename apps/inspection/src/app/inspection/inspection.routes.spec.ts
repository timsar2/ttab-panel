import { createInspectorRoutes } from './inspection.routes'
import { InspectorShell } from './inspector-shell'

describe('Inspector routes', () => {
  it('shows the Inspector visit list at the app entry and retains create/detail routes', () => {
    const [route] = createInspectorRoutes()
    expect(route.path).toBe('')
    expect(route.component).toBe(InspectorShell)
    expect(route.canActivate?.length).toBe(1)
    expect(route.children?.[0]).toMatchObject({ path: '', pathMatch: 'full' })
    expect(route.children?.[0].loadComponent).toBeDefined()
    expect(route.children?.map(child => child.path)).toEqual(['', 'new', ':id'])
  })
})
