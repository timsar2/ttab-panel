import { appRoutes } from './app.routes'
import { hasInspectorRole } from './inspection-role.guard'

describe('Inspection portal routes', () => {
  it('reuses the shared authentication feature for /login', () => {
    expect(appRoutes.some(route => route.path === 'login' && route.loadComponent)).toBe(true)
    expect(appRoutes.some(route => route.path === '' && route.redirectTo === 'login')).toBe(true)
  })

  it('mounts Inspector pages behind the role-gated app entry and offers a denied route', () => {
    const featureHost = appRoutes.find(route => route.path === '' && route.children)
    expect(
      featureHost?.children?.some(route => route.path === 'inspections' && route.loadChildren),
    ).toBe(true)
    expect(
      featureHost?.children?.some(route => route.path === 'access-denied' && route.loadComponent),
    ).toBe(true)
  })

  it('requires the exact Inspector role claim', () => {
    expect(hasInspectorRole(['Inspector'])).toBe(true)
    expect(hasInspectorRole(['Client', 'Inspector', 'Basic'])).toBe(true)
    expect(hasInspectorRole(['Inspection'])).toBe(false)
    expect(hasInspectorRole(['Admin', 'Client'])).toBe(false)
    expect(hasInspectorRole(undefined)).toBe(false)
  })
})
