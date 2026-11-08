import { Routes } from '@angular/router'
import { guestGuard } from '@org/auth-data-access'

export function createAuthRoutes(options: { path?: string; title?: string } = {}): Routes {
  return [
    {
      path: options.path ?? 'login',
      title: options.title ?? 'Sign in',
      canActivate: [guestGuard],
      loadComponent: () => import('./login.page').then(module => module.LoginPage),
    },
  ]
}
