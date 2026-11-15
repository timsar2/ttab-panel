import { createPortalRoutes } from '@org/platform'

export const appRoutes = createPortalRoutes({
  brandName: 'Driver',
  loginRoutes: [
    {
      path: 'login',
      loadChildren: () =>
        import('./driver/driver.routes').then(module =>
          module.driverRoutes
            .filter(route => route.path === 'login')
            .map(route => ({ ...route, path: '' })),
        ),
    },
  ],
  featureRoutes: [
    {
      path: '',
      loadChildren: () =>
        import('./driver/driver.routes').then(module =>
          module.driverRoutes.filter(route => route.path === 'driver'),
        ),
    },
  ],
})
