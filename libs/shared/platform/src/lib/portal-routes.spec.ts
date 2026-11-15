import { createPortalRoutes } from './portal-routes'

describe('createPortalRoutes', () => {
  it('shares login, authenticated workspace, and guarded feature mounts', () => {
    const routes = createPortalRoutes({
      brandName: 'Driver',
      featureRoutes: [{ path: 'trips', children: [{ path: ':tripId' }] }],
    })

    expect(routes.map(route => route.path)).toEqual(['', 'login', 'workspace', '', '**'])
    expect(routes.find(route => route.path === 'workspace')?.canActivate).toHaveLength(1)
    const protectedFeatures = routes.find(route => route.path === '' && route.children)
    expect(protectedFeatures?.canActivate).toHaveLength(1)
    expect(protectedFeatures?.children?.[0].path).toBe('trips')
  })

  it('allows a portal to provide app-specific lazy login routes', () => {
    const loginRoutes = [{ path: 'login', loadComponent: async () => class Login {} }]
    const routes = createPortalRoutes({ brandName: 'Passenger', loginRoutes })
    expect(routes).toContain(loginRoutes[0])
    expect(routes.some(route => route.path === 'login' && route.loadComponent)).toBe(true)
  })
})
