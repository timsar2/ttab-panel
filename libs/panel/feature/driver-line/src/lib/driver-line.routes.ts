import { InjectionToken, Signal, makeEnvironmentProviders } from '@angular/core'
import { Routes } from '@angular/router'
import { DriversDataConfig, provideDriversData } from '@org/transport-drivers-data-access'
import {
  PeopleDataConfig,
  PeopleSearchStore,
  providePeopleData,
} from '@org/transport-people-data-access'
import type { AutocompleteLanguage } from '@org/ui-forms'
import { DriverLinePage } from './ui/driver-line-page'
import { DriverLineState } from './driver-line-state'

export interface DriverLineFeatureConfig {
  readonly path: string
  readonly apiUrl: string
  readonly company: () => Signal<number | null>
  readonly language: () => Signal<AutocompleteLanguage>
  readonly canManage: () => Signal<boolean>
  readonly drivers: DriversDataConfig
  readonly people: PeopleDataConfig
}

export const DRIVER_LINE_CONFIG = new InjectionToken<DriverLineFeatureConfig>('DRIVER_LINE_CONFIG')

export function provideDriverLineFeature(config: DriverLineFeatureConfig) {
  return makeEnvironmentProviders([
    { provide: DRIVER_LINE_CONFIG, useValue: config },
    DriverLineState,
    provideDriversData(config.drivers),
    providePeopleData(config.people),
    PeopleSearchStore,
  ])
}

export function createDriverLineRoutes(config: DriverLineFeatureConfig): Routes {
  return [
    {
      path: config.path,
      providers: [provideDriverLineFeature(config)],
      children: [
        { path: '', pathMatch: 'full', component: DriverLinePage },
        { path: 'new', component: DriverLinePage },
        { path: 'detail/:id', component: DriverLinePage },
        { path: 'detail/:id/edit', component: DriverLinePage },
      ],
    },
  ]
}
