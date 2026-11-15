import {
  EnvironmentProviders,
  InjectionToken,
  Signal,
  makeEnvironmentProviders,
} from '@angular/core'
import { Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import {
  InspectionDataConfig,
  InspectionStore,
  provideInspectionData,
} from '@org/transport-inspection-data-access'
import type { AutocompleteLanguage } from '@org/ui-forms'
import { Observable } from 'rxjs'

export interface InspectionLookupOption {
  readonly id: number
  readonly label: string
}
export interface InspectionVehiclePage {
  readonly items: readonly InspectionLookupOption[]
  readonly pageNumber: number
  readonly hasNext: boolean
}
export interface InspectionLookups {
  readonly drivers: () => (query: string) => Observable<readonly InspectionLookupOption[]>
  readonly vehicles: () => (pageNumber: number) => Observable<InspectionVehiclePage>
}

export interface InspectionFeatureConfig extends InspectionDataConfig {
  readonly path: string
  readonly language: () => Signal<AutocompleteLanguage>
  readonly scope: () => Signal<number | null>
  readonly lookups: InspectionLookups
  readonly lookupProviders: readonly EnvironmentProviders[]
}
export const INSPECTION_FEATURE = new InjectionToken<InspectionFeatureConfig>('INSPECTION_FEATURE')
export const INSPECTION_LANGUAGE = new InjectionToken<Signal<AutocompleteLanguage>>(
  'INSPECTION_LANGUAGE',
)
export const INSPECTION_SCOPE = new InjectionToken<Signal<number | null>>('INSPECTION_SCOPE')
export const INSPECTION_LOOKUPS = new InjectionToken<InspectionLookups>('INSPECTION_LOOKUPS')

export function provideInspectionFeature(config: InspectionFeatureConfig) {
  return makeEnvironmentProviders([
    provideInspectionData(config),
    InspectionStore,
    { provide: INSPECTION_FEATURE, useValue: config },
    { provide: INSPECTION_LANGUAGE, useFactory: config.language },
    { provide: INSPECTION_SCOPE, useFactory: config.scope },
    { provide: INSPECTION_LOOKUPS, useValue: config.lookups },
  ])
}

export function parseInspectionRouteId(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

export function createInspectionRoutes(config: InspectionFeatureConfig): Routes {
  return [
    {
      path: config.path,
      canActivate: [authGuard],
      providers: [...config.lookupProviders, provideInspectionFeature(config)],
      runGuardsAndResolvers: 'pathParamsChange',
      data: { breadcrumb: 'Inspections' },
      children: [
        {
          path: '',
          pathMatch: 'full',
          loadComponent: () => import('./ui/inspection-page').then(module => module.InspectionPage),
        },
        {
          path: 'new',
          pathMatch: 'full',
          data: { breadcrumb: null },
          loadComponent: () =>
            import('./ui/inspection-create').then(module => module.InspectionCreatePage),
        },
        {
          path: ':id',
          pathMatch: 'full',
          data: { breadcrumb: null },
          loadComponent: () =>
            import('./ui/inspection-detail').then(module => module.InspectionDetailPage),
        },
      ],
    },
  ]
}
