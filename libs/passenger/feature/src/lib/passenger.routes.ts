import { inject, InjectionToken, Signal } from '@angular/core'
import { CanActivateFn, Router, Routes } from '@angular/router'
import { AUTH_CONFIG, SessionStore } from '@org/platform'
import { map } from 'rxjs'
import { PassengerApi, PASSENGER_IDENTITY, PassengerIdentity } from './passenger.api'
import { PASSENGER_LOGIN_LANGUAGE, PASSENGER_SET_LANGUAGE } from './passenger.login-config'

export interface PassengerFeatureConfig {
  readonly identity: () => PassengerIdentity
  readonly language: Signal<'fa' | 'en'>
}

export const PASSENGER_FEATURE_CONFIG = new InjectionToken<PassengerFeatureConfig>(
  'PASSENGER_FEATURE_CONFIG',
)

export function hasPassengerAccess(roles: readonly string[]): boolean {
  return roles.includes('Client') && !roles.includes('Driver')
}

export const passengerRoleGuard: CanActivateFn = () => {
  const session = inject(SessionStore)
  const router = inject(Router)
  const roles = session.user()?.roles ?? []
  return hasPassengerAccess(roles) || router.parseUrl('/login?access=role')
}

const passengerLoginGuard: CanActivateFn = () => {
  const session = inject(SessionStore)
  const config = inject(AUTH_CONFIG)
  const router = inject(Router)
  const destination = () => {
    const roles = session.user()?.roles ?? []
    return hasPassengerAccess(roles) ? router.parseUrl('/passenger/home') : true
  }
  if (session.isAuthenticated()) return destination()
  if (config.mode === 'cookie')
    return session.restore().pipe(map(valid => (valid ? destination() : true)))
  return true
}

export function createPassengerLoginRoutes(
  config: () => { language: Signal<'fa' | 'en'>; setLanguage: (language: 'fa' | 'en') => void },
): Routes {
  return [
    {
      path: 'login',
      canActivate: [passengerLoginGuard],
      providers: [
        PassengerApi,
        { provide: PASSENGER_LOGIN_LANGUAGE, useFactory: () => config().language },
        { provide: PASSENGER_SET_LANGUAGE, useFactory: () => config().setLanguage },
      ],
      loadComponent: () => import('./ui/login.page').then(m => m.PassengerLoginPage),
      title: 'Passenger | Sign in',
    },
  ]
}

export function createPassengerRoutes(config: () => PassengerFeatureConfig): Routes {
  return [
    {
      path: 'passenger',
      canActivate: [passengerRoleGuard],
      providers: [
        PassengerApi,
        { provide: PASSENGER_FEATURE_CONFIG, useFactory: config },
        {
          provide: PASSENGER_IDENTITY,
          useFactory: () => inject(PASSENGER_FEATURE_CONFIG).identity,
        },
      ],
      loadComponent: () => import('./ui/passenger-shell').then(m => m.PassengerShell),
      children: [
        { path: '', pathMatch: 'full', redirectTo: 'home' },
        {
          path: 'home',
          loadComponent: () => import('./ui/home.page').then(m => m.PassengerHomePage),
          title: 'Passenger | Home',
        },
        {
          path: 'assignment',
          loadComponent: () => import('./ui/assignment.page').then(m => m.PassengerAssignmentPage),
          title: 'Passenger | Assignment',
        },
        {
          path: 'profile',
          loadComponent: () => import('./ui/profile.page').then(m => m.PassengerProfilePage),
          title: 'Passenger | Profile',
        },
        {
          path: 'support',
          loadComponent: () => import('./ui/support.page').then(m => m.PassengerSupportPage),
          title: 'Passenger | Support',
        },
        { path: '**', redirectTo: 'home' },
      ],
    },
  ]
}
