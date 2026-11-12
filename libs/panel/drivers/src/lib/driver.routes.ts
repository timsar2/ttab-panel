import { InjectionToken, Signal, makeEnvironmentProviders, signal } from '@angular/core'
import { Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import { DriversDataConfig, provideDriversData } from '@org/transport-drivers-data-access'
import { PeopleDataConfig, providePeopleData } from '@org/transport-people-data-access'
import type { DriverEditor } from './ui/driver-editor'

export interface DriverFeatureConfig extends DriversDataConfig {
  readonly path: string
  readonly heading?: string
  readonly deniedMessage?: string
  readonly people: PeopleDataConfig
  readonly canManage?: () => Signal<boolean>
  /** Opt in only after approving account creation and welcome-message side effects. */
  readonly canRegisterPerson?: () => Signal<boolean>
  /** Approved geography lookup adapter, owned by the consumer; absent means preserve city. */
  readonly personCities?: () => Signal<readonly { value: string; label: string }[]>
  readonly legacyPaths?: { readonly add?: string; readonly detail?: string }
}
export const DRIVER_FEATURE = new InjectionToken<DriverFeatureConfig>('DRIVER_FEATURE')
export const DRIVER_MANAGE = new InjectionToken<Signal<boolean>>('DRIVER_MANAGE')
export const DRIVER_REGISTER = new InjectionToken<Signal<boolean>>('DRIVER_REGISTER')
export const DRIVER_PERSON_CITIES = new InjectionToken<
  Signal<readonly { value: string; label: string }[]>
>('DRIVER_PERSON_CITIES')
export function provideDriverFeature(config: DriverFeatureConfig) {
  return makeEnvironmentProviders([
    provideDriversData(config),
    providePeopleData(config.people),
    { provide: DRIVER_FEATURE, useValue: config },
    { provide: DRIVER_MANAGE, useFactory: config.canManage ?? (() => signal(false)) },
    { provide: DRIVER_REGISTER, useFactory: config.canRegisterPerson ?? (() => signal(false)) },
    { provide: DRIVER_PERSON_CITIES, useFactory: config.personCities ?? (() => signal([])) },
  ])
}
export function createDriverRoutes(config: DriverFeatureConfig): Routes {
  const canLeave = (component: DriverEditor | null) => component?.confirmLeave() ?? true
  return [
    {
      path: config.path,
      canActivate: [authGuard],
      providers: [provideDriverFeature(config)],
      data: { breadcrumb: config.heading ?? 'Drivers' },
      children: [
        {
          path: '',
          pathMatch: 'full',
          loadComponent: () => import('./ui/driver-page').then(m => m.DriverPage),
        },
        {
          path: 'new',
          canDeactivate: [canLeave],
          loadComponent: () => import('./ui/driver-editor').then(m => m.DriverEditor),
        },
        { path: config.legacyPaths?.add ?? 'add', pathMatch: 'full', redirectTo: 'new' },
        { path: config.legacyPaths?.detail ?? 'detail/:id', pathMatch: 'full', redirectTo: ':id' },
        {
          path: ':id/edit',
          canDeactivate: [canLeave],
          runGuardsAndResolvers: 'pathParamsChange',
          loadComponent: () => import('./ui/driver-editor').then(m => m.DriverEditor),
        },
        {
          path: ':id',
          runGuardsAndResolvers: 'pathParamsChange',
          loadComponent: () => import('./ui/driver-detail').then(m => m.DriverDetailPage),
        },
      ],
    },
  ]
}
