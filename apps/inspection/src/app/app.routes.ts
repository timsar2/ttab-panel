import { createPortalRoutes } from '@org/platform'

export const appRoutes = createPortalRoutes({
  brandName: 'Inspection',
  featureRoutes: [
    {
      path: 'access-denied',
      loadComponent: () => import('./access-denied.page').then(module => module.AccessDeniedPage),
      title: 'Inspection | Access denied',
    },
    {
      path: 'inspections',
      loadChildren: () =>
        import('./inspection/inspection.routes').then(module => module.createInspectorRoutes()),
    },
  ],
})
