import { Routes } from '@angular/router'

export function createPanelTrackingRoutes(): Routes {
  return [
    {
      path: '',
      loadComponent: () => import('./live-tracking.page').then(m => m.LiveTrackingPage),
      title: 'Live tracking',
    },
  ]
}
