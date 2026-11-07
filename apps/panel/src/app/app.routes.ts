import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Panel | Sign in',
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  { path: '**', redirectTo: 'login' },
];
