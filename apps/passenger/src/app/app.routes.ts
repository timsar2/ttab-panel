import { createPortalRoutes } from '@org/platform'

export const appRoutes = createPortalRoutes({
  brandName: 'Passenger',
  loginRoutes: [
    {
      path: 'login',
      loadChildren: () =>
        import('./passenger/passenger.routes').then(module =>
          module.passengerRoutes
            .filter(route => route.path === 'login')
            .map(route => ({ ...route, path: '' })),
        ),
    },
  ],
  featureRoutes: [
    {
      path: '',
      loadChildren: () =>
        import('./passenger/passenger.routes').then(module =>
          module.passengerRoutes.filter(route => route.path === 'passenger'),
        ),
    },
  ],
})
