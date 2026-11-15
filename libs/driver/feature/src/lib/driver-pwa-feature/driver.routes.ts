import { inject, InjectionToken, Signal } from '@angular/core'
import { CanActivateFn, Router, Routes } from '@angular/router'
import { AUTH_CONFIG, SessionStore } from '@org/platform'
import { map } from 'rxjs'
import { DriverApi, DRIVER_IDENTITY, DriverIdentity } from './driver.api'
import { DRIVER_LOGIN_LANGUAGE, DRIVER_SET_LANGUAGE } from './driver.login-config'

export interface DriverFeatureConfig {
  readonly identity: () => DriverIdentity
  readonly language: Signal<'fa' | 'en'>
}

export const DRIVER_FEATURE_CONFIG = new InjectionToken<DriverFeatureConfig>(
  'DRIVER_FEATURE_CONFIG',
)

export function hasDriverAccess(roles: readonly string[]): boolean {
  return roles.includes('Driver')
}

export const driverRoleGuard: CanActivateFn = () => {
  const session = inject(SessionStore)
  const router = inject(Router)
  const roles = session.user()?.roles ?? []
  return hasDriverAccess(roles) || router.parseUrl('/login?access=role')
}

const driverLoginGuard: CanActivateFn = () => {
  const session = inject(SessionStore)
  const config = inject(AUTH_CONFIG)
  const router = inject(Router)
  const destination = () => {
    const roles = session.user()?.roles ?? []
    return hasDriverAccess(roles) ? router.parseUrl('/driver/route-selection') : true
  }
  if (session.isAuthenticated()) return destination()
  if (config.mode === 'cookie')
    return session.restore().pipe(map(valid => (valid ? destination() : true)))
  return true
}

export function createDriverLoginRoutes(
  config: () => { language: Signal<'fa' | 'en'>; setLanguage: (language: 'fa' | 'en') => void },
): Routes {
  return [
    {
      path: 'login',
      canActivate: [driverLoginGuard],
      providers: [
        DriverApi,
        { provide: DRIVER_LOGIN_LANGUAGE, useFactory: () => config().language },
        { provide: DRIVER_SET_LANGUAGE, useFactory: () => config().setLanguage },
      ],
      loadComponent: () => import('../ui/login.page').then(m => m.DriverLoginPage),
      title: 'Driver | Sign in',
    },
  ]
}

export function createDriverRoutes(config: () => DriverFeatureConfig): Routes {
  return [
    {
      path: 'driver',
      canActivate: [driverRoleGuard],
      providers: [
        DriverApi,
        { provide: DRIVER_FEATURE_CONFIG, useFactory: config },
        {
          provide: DRIVER_IDENTITY,
          useFactory: () => inject(DRIVER_FEATURE_CONFIG).identity,
        },
      ],
      loadComponent: () => import('../ui/driver-shell').then(m => m.DriverShell),
      children: [
        { path: '', pathMatch: 'full', redirectTo: 'route-selection' },
        {
          path: 'route-selection',
          loadComponent: () => import('../ui/route-selection.page').then(m => m.RouteSelectionPage),
          title: 'Driver | Route Selection',
        },
        {
          path: 'route-management',
          loadComponent: () =>
            import('../ui/route-management.page').then(m => m.RouteManagementPage),
          title: 'Driver | Route Management',
        },
        {
          path: 'live-map',
          loadComponent: () => import('../ui/live-trip-map.page').then(m => m.LiveTripMapPage),
          title: 'Driver | Live Trip Map',
        },
        {
          path: 'station-operations/:stationId',
          loadComponent: () =>
            import('../ui/station-operations.page').then(m => m.StationOperationsPage),
          title: 'Driver | Station Operations',
        },
        {
          path: 'profile',
          loadComponent: () => import('../ui/profile.page').then(m => m.DriverProfilePage),
          title: 'Driver | Profile',
        },
        {
          path: 'vehicle-profile',
          loadComponent: () => import('../ui/vehicle-profile.page').then(m => m.VehicleProfilePage),
          title: 'Driver | Vehicle Profile',
        },
        {
          path: 'documents',
          loadComponent: () => import('../ui/document-upload.page').then(m => m.DocumentUploadPage),
          title: 'Driver | Documents',
        },
        {
          path: 'support',
          loadComponent: () => import('../ui/support.page').then(m => m.SupportPage),
          title: 'Driver | Support',
        },
        { path: '**', redirectTo: 'route-selection' },
      ],
    },
  ]
}
