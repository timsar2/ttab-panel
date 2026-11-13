import { InjectionToken, Signal, makeEnvironmentProviders, signal } from '@angular/core'
import { CanActivateFn, CanDeactivateFn, Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import { DriversDataConfig, provideDriversData } from '@org/transport-drivers-data-access'
import { PeopleDataConfig, providePeopleData } from '@org/transport-people-data-access'
import { provideVehiclesData, VehiclesDataConfig } from '@org/transport-vehicles-data-access'
import type { AutocompleteLanguage, BilingualText } from '@org/ui-forms'
import type { VehicleEditor } from './ui/vehicle-editor'

export interface VehicleFeatureConfig extends VehiclesDataConfig {
  readonly path: string
  readonly heading?: string
  readonly language?: () => Signal<AutocompleteLanguage>
  readonly canManage?: () => Signal<boolean>
  readonly deniedMessage?: BilingualText
  readonly canActivate?: CanActivateFn
  readonly drivers: DriversDataConfig
  readonly people: PeopleDataConfig
  readonly legacyPaths?: { readonly add?: string; readonly detail?: string }
}

export const VEHICLE_FEATURE = new InjectionToken<VehicleFeatureConfig>('VEHICLE_FEATURE')
export const VEHICLE_LANGUAGE = new InjectionToken<Signal<AutocompleteLanguage>>('VEHICLE_LANGUAGE')
export const VEHICLE_MANAGE = new InjectionToken<Signal<boolean>>('VEHICLE_MANAGE')

export function provideVehicleFeature(config: VehicleFeatureConfig) {
  return makeEnvironmentProviders([
    provideVehiclesData(config),
    providePeopleData(config.people),
    provideDriversData(config.drivers),
    { provide: VEHICLE_FEATURE, useValue: config },
    {
      provide: VEHICLE_LANGUAGE,
      useFactory: config.language ?? (() => signal<AutocompleteLanguage>('en')),
    },
    { provide: VEHICLE_MANAGE, useFactory: config.canManage ?? (() => signal(false)) },
  ])
}

export function createVehicleRoutes(config: VehicleFeatureConfig): Routes {
  const canLeave: CanDeactivateFn<VehicleEditor> = component => component?.confirmLeave() ?? true
  return [
    {
      path: config.path,
      canActivate: [config.canActivate ?? authGuard],
      providers: [provideVehicleFeature(config)],
      data: { breadcrumb: config.heading ?? 'Vehicles' },
      children: [
        {
          path: '',
          pathMatch: 'full',
          loadComponent: () => import('./ui/vehicle-page').then(module => module.VehiclePage),
        },
        {
          path: 'new',
          data: { breadcrumb: null },
          canDeactivate: [canLeave],
          loadComponent: () => import('./ui/vehicle-editor').then(module => module.VehicleEditor),
        },
        { path: config.legacyPaths?.add ?? 'add', pathMatch: 'full', redirectTo: 'new' },
        { path: config.legacyPaths?.detail ?? 'detail/:id', pathMatch: 'full', redirectTo: ':id' },
        {
          path: ':id/edit',
          data: { breadcrumb: null },
          runGuardsAndResolvers: 'pathParamsChange',
          canDeactivate: [canLeave],
          loadComponent: () => import('./ui/vehicle-editor').then(module => module.VehicleEditor),
        },
        {
          path: ':id',
          data: { breadcrumb: null },
          runGuardsAndResolvers: 'pathParamsChange',
          loadComponent: () =>
            import('./ui/vehicle-detail').then(module => module.VehicleDetailPage),
        },
      ],
    },
  ]
}
