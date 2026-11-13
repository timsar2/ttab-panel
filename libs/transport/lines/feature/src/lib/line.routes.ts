import { InjectionToken, Signal, makeEnvironmentProviders, signal } from '@angular/core'
import { CanActivateFn, CanDeactivateFn, Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import {
  DepartureTimesDataConfig,
  DepartureTimesStore,
  provideDepartureTimesData,
} from '@org/transport-departure-times-data-access'
import { RouteId } from '@org/transport-routes-data-access'
import { LinesDataConfig, provideLinesData } from '@org/transport-lines-data-access'
import type { AutocompleteLanguage, BilingualText } from '@org/ui-forms'
import type { LineEditor } from './ui/line-editor'

export interface LineFeatureConfig extends LinesDataConfig {
  readonly path: string
  readonly directionId: () => Signal<RouteId | null>
  readonly departureTimes: DepartureTimesDataConfig
  readonly language?: () => Signal<AutocompleteLanguage>
  readonly canManage?: () => Signal<boolean>
  readonly canActivate?: CanActivateFn
  readonly deniedMessage?: BilingualText
}

export const LINE_FEATURE = new InjectionToken<LineFeatureConfig>('LINE_FEATURE')
export const LINE_DIRECTION_ID = new InjectionToken<Signal<RouteId | null>>('LINE_DIRECTION_ID')
export const LINE_LANGUAGE = new InjectionToken<Signal<AutocompleteLanguage>>('LINE_LANGUAGE')
export const LINE_MANAGE = new InjectionToken<Signal<boolean>>('LINE_MANAGE')

export function provideLineFeature(config: LineFeatureConfig) {
  return makeEnvironmentProviders([
    provideLinesData(config),
    provideDepartureTimesData(config.departureTimes),
    { provide: LINE_FEATURE, useValue: config },
    { provide: LINE_DIRECTION_ID, useFactory: config.directionId },
    {
      provide: LINE_LANGUAGE,
      useFactory: config.language ?? (() => signal<AutocompleteLanguage>('fa')),
    },
    { provide: LINE_MANAGE, useFactory: config.canManage ?? (() => signal(false)) },
    DepartureTimesStore,
  ])
}

export function createLineRoutes(config: LineFeatureConfig): Routes {
  const canLeave: CanDeactivateFn<LineEditor> = component => component?.confirmLeave() ?? true
  return [
    {
      path: config.path,
      canActivate: [config.canActivate ?? authGuard],
      providers: [provideLineFeature(config)],
      data: { breadcrumb: 'Lines' },
      children: [
        {
          path: '',
          pathMatch: 'full',
          loadComponent: () => import('./ui/lines-page').then(module => module.LinesPage),
        },
        {
          path: 'add',
          data: { breadcrumb: null },
          canDeactivate: [canLeave],
          loadComponent: () => import('./ui/line-editor').then(module => module.LineEditor),
        },
        { path: 'new', pathMatch: 'full', redirectTo: 'add' },
        {
          path: 'detail/:lineId',
          data: { breadcrumb: null },
          canDeactivate: [canLeave],
          loadComponent: () => import('./ui/line-editor').then(module => module.LineEditor),
        },
      ],
    },
  ]
}
