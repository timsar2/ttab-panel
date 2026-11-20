import {
  EnvironmentProviders,
  InjectionToken,
  Signal,
  makeEnvironmentProviders,
} from '@angular/core'
import { Routes } from '@angular/router'
import {
  InspectionDataConfig,
  InspectionStore,
  provideInspectionData,
} from '@org/transport-inspection-data-access'
import type { AutocompleteLanguage } from '@org/ui-forms'
import { Observable } from 'rxjs'

export interface InspectorLookupOption {
  readonly id: number
  readonly label: string
}

export interface InspectorVehiclePage {
  readonly items: readonly InspectorLookupOption[]
  readonly pageNumber: number
  readonly hasNext: boolean
}

export interface InspectorLookups {
  readonly drivers: () => (query: string) => Observable<readonly InspectorLookupOption[]>
  readonly vehicles: () => (pageNumber: number) => Observable<InspectorVehiclePage>
}

export interface InspectorFeatureConfig extends InspectionDataConfig {
  readonly path: string
  readonly language: () => Signal<AutocompleteLanguage>
  readonly companyId: () => Signal<number | null>
  readonly lookups: InspectorLookups
  readonly lookupProviders: readonly EnvironmentProviders[]
}

export const INSPECTOR_FEATURE = new InjectionToken<InspectorFeatureConfig>('INSPECTOR_FEATURE')
export const INSPECTOR_LANGUAGE = new InjectionToken<Signal<AutocompleteLanguage>>(
  'INSPECTOR_LANGUAGE',
)
export const INSPECTOR_COMPANY_ID = new InjectionToken<Signal<number | null>>(
  'INSPECTOR_COMPANY_ID',
)
export const INSPECTOR_LOOKUPS = new InjectionToken<InspectorLookups>('INSPECTOR_LOOKUPS')

export function provideInspectorFeature(config: InspectorFeatureConfig) {
  return makeEnvironmentProviders([
    provideInspectionData(config),
    InspectionStore,
    { provide: INSPECTOR_FEATURE, useValue: config },
    { provide: INSPECTOR_LANGUAGE, useFactory: config.language },
    { provide: INSPECTOR_COMPANY_ID, useFactory: config.companyId },
    { provide: INSPECTOR_LOOKUPS, useValue: config.lookups },
  ])
}

export function createInspectorRoutes(config: InspectorFeatureConfig): Routes {
  return [
    {
      path: config.path,
      providers: [...config.lookupProviders, provideInspectorFeature(config)],
      data: { breadcrumb: 'Inspections' },
      children: [
        {
          path: '',
          pathMatch: 'full',
          redirectTo: 'new',
        },
        {
          path: 'new',
          pathMatch: 'full',
          data: { breadcrumb: null },
          loadComponent: () =>
            import('./ui/inspector-visit-create').then(module => module.InspectorVisitCreatePage),
        },
        {
          path: ':id',
          pathMatch: 'full',
          data: { breadcrumb: null },
          loadComponent: () =>
            import('./ui/inspector-visit-detail').then(module => module.InspectorVisitDetailPage),
        },
      ],
    },
  ]
}
