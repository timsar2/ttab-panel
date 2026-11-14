import { InjectionToken, Signal, makeEnvironmentProviders } from '@angular/core'
import { Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import {
  DepartureTimesDataConfig,
  provideDepartureTimesData,
} from '@org/transport-departure-times-data-access'
import type { DepartureTimeEditor } from './ui/departure-time-editor'
import type { DepartureTimeLanguage } from './departure-time-text'

export interface DepartureTimeFeatureConfig extends DepartureTimesDataConfig {
  readonly path: string
  readonly language: () => Signal<DepartureTimeLanguage>
  readonly deniedMessage?: Partial<Record<DepartureTimeLanguage, string>>
  /** UI affordance only; the data access decision and backend must enforce the operation. */
  readonly canManage: () => Signal<boolean>
  readonly canCreate?: () => Signal<boolean>
  readonly canUpdate?: () => Signal<boolean>
}

export const DEPARTURE_TIME_FEATURE = new InjectionToken<DepartureTimeFeatureConfig>(
  'DEPARTURE_TIME_FEATURE',
)
export const DEPARTURE_TIME_MANAGE = new InjectionToken<Signal<boolean>>('DEPARTURE_TIME_MANAGE')
export const DEPARTURE_TIME_CREATE = new InjectionToken<Signal<boolean>>('DEPARTURE_TIME_CREATE')
export const DEPARTURE_TIME_UPDATE = new InjectionToken<Signal<boolean>>('DEPARTURE_TIME_UPDATE')
export const DEPARTURE_TIME_LANGUAGE = new InjectionToken<Signal<DepartureTimeLanguage>>(
  'DEPARTURE_TIME_LANGUAGE',
)

export function provideDepartureTimeFeature(config: DepartureTimeFeatureConfig) {
  return makeEnvironmentProviders([
    provideDepartureTimesData(config),
    { provide: DEPARTURE_TIME_FEATURE, useValue: config },
    { provide: DEPARTURE_TIME_MANAGE, useFactory: config.canManage },
    { provide: DEPARTURE_TIME_CREATE, useFactory: config.canCreate ?? config.canManage },
    { provide: DEPARTURE_TIME_UPDATE, useFactory: config.canUpdate ?? config.canManage },
    { provide: DEPARTURE_TIME_LANGUAGE, useFactory: config.language },
  ])
}

export function createDepartureTimeRoutes(config: DepartureTimeFeatureConfig): Routes {
  // Context loss/logout can destroy the protected outlet before deactivation runs.
  const canLeave = (component: DepartureTimeEditor | null) => component?.confirmLeave() ?? true
  return [
    {
      path: config.path,
      canActivate: [authGuard],
      data: { breadcrumb: config.heading ?? 'Departure times' },
      providers: [provideDepartureTimeFeature(config)],
      children: [
        {
          path: '',
          pathMatch: 'full',
          loadComponent: () => import('./ui/departure-time-page').then(m => m.DepartureTimePage),
        },
        {
          path: 'new',
          canDeactivate: [canLeave],
          data: { breadcrumb: 'Create' },
          loadComponent: () =>
            import('./ui/departure-time-editor').then(m => m.DepartureTimeEditor),
        },
        {
          path: ':id',
          pathMatch: 'full',
          runGuardsAndResolvers: 'pathParamsChange',
          data: { breadcrumb: 'Details' },
          loadComponent: () =>
            import('./ui/departure-time-detail').then(m => m.DepartureTimeDetail),
        },
        {
          path: ':id/edit',
          runGuardsAndResolvers: 'pathParamsChange',
          canDeactivate: [canLeave],
          data: { breadcrumb: 'Edit' },
          loadComponent: () =>
            import('./ui/departure-time-editor').then(m => m.DepartureTimeEditor),
        },
      ],
    },
  ]
}
