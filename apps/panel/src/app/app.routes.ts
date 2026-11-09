import { Route } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import { createAuthRoutes } from '@org/auth-feature'
import { createCompanyRoutes } from '@org/transport-company-feature'

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  ...createAuthRoutes({ path: 'login', title: 'Panel | Sign in' }),
  { path: 'auth/login', pathMatch: 'full', redirectTo: 'login' },
  ...createCompanyRoutes({ path: 'companies', apiUrl: '/api/v1', heading: 'Companies' }),
  {
    path: 'workspace',
    canActivate: [authGuard],
    loadComponent: () => import('./workspace.page').then(m => m.WorkspacePage),
  },
  { path: '**', redirectTo: 'login' },
]
