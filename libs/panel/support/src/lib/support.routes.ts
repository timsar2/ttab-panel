import { InjectionToken, Signal, makeEnvironmentProviders } from '@angular/core'
import { Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import {
  SupportDataConfig,
  SupportId,
  SupportStore,
  provideSupportData,
  supportId,
} from '@org/transport-support-data-access'
import type { AutocompleteLanguage } from '@org/ui-forms'

export interface SupportFeatureConfig extends SupportDataConfig {
  readonly path: string
  readonly language: () => Signal<AutocompleteLanguage>
  readonly canReply: () => Signal<boolean>
}

export const SUPPORT_FEATURE = new InjectionToken<SupportFeatureConfig>('SUPPORT_FEATURE')
export const SUPPORT_LANGUAGE = new InjectionToken<Signal<AutocompleteLanguage>>('SUPPORT_LANGUAGE')
export const SUPPORT_CAN_REPLY = new InjectionToken<Signal<boolean>>('SUPPORT_CAN_REPLY')

export function provideSupportFeature(config: SupportFeatureConfig) {
  return makeEnvironmentProviders([
    provideSupportData(config),
    SupportStore,
    { provide: SUPPORT_FEATURE, useValue: config },
    { provide: SUPPORT_LANGUAGE, useFactory: config.language },
    { provide: SUPPORT_CAN_REPLY, useFactory: config.canReply },
  ])
}

export function parseSupportRouteId(value: string | null): SupportId | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null
  const number = Number(value)
  if (!Number.isSafeInteger(number)) return null
  try {
    return supportId(number)
  } catch {
    return null
  }
}

export function createSupportRoutes(config: SupportFeatureConfig): Routes {
  return [
    {
      path: config.path,
      canActivate: [authGuard],
      providers: [provideSupportFeature(config)],
      data: { breadcrumb: 'Support' },
      children: [
        {
          path: '',
          pathMatch: 'full',
          loadComponent: () => import('./ui/support-page').then(module => module.SupportPage),
        },
        {
          path: ':id',
          pathMatch: 'full',
          runGuardsAndResolvers: 'pathParamsChange',
          data: { breadcrumb: null },
          loadComponent: () =>
            import('./ui/support-detail').then(module => module.SupportDetailPage),
        },
      ],
    },
  ]
}
