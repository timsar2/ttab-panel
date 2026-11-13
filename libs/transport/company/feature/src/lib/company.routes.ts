import { InjectionToken, makeEnvironmentProviders, signal } from '@angular/core'
import type { Signal } from '@angular/core'
import { Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import type { CompanyRow } from '@org/transport-company-data-access'
import type { AutocompleteLanguage } from '@org/ui-forms'
import { provideTransportHttp } from '@org/transport-http'
import { provideCompanyLookups } from '@org/transport-company-data-access'
import type { CompanyEditor } from './company-editor'

export interface CompanyFeatureConfig {
  readonly path: string
  readonly apiUrl: string
  readonly language?: () => Signal<AutocompleteLanguage>
  readonly heading?: string
  readonly actionLabel?: string
  /** Emits intent only. The consumer must independently authorize any selected workspace. */
  readonly onAction?: (company: CompanyRow) => void
  readonly actionCommands?: (company: CompanyRow) => readonly (string | number)[]
  readonly editor?: {
    readonly geographyApiUrl: string
    readonly canCreate: (roles: readonly string[]) => boolean
    readonly canEdit: (roles: readonly string[], companyId: number) => boolean
    /** Consumer-owned upload budget; omission disables logo replacement. */
    readonly maxLogoBytes?: number
  }
}

export const COMPANY_FEATURE = new InjectionToken<CompanyFeatureConfig>('COMPANY_FEATURE')
export const COMPANY_LANGUAGE = new InjectionToken<Signal<AutocompleteLanguage>>('COMPANY_LANGUAGE')

export function provideCompanyFeature(config: CompanyFeatureConfig) {
  const maximum = config.editor?.maxLogoBytes
  if (maximum !== undefined && (!Number.isSafeInteger(maximum) || maximum <= 0)) {
    throw new Error('Configure a positive company logo byte limit.')
  }
  return makeEnvironmentProviders([
    provideTransportHttp({ apiUrl: config.apiUrl }),
    { provide: COMPANY_FEATURE, useValue: config },
    {
      provide: COMPANY_LANGUAGE,
      useFactory: config.language ?? (() => signal<AutocompleteLanguage>('en')),
    },
    ...(config.editor ? [provideCompanyLookups(config.editor)] : []),
  ])
}

export function createCompanyRoutes(config: CompanyFeatureConfig): Routes {
  const canLeave = (component: CompanyEditor) => component.confirmLeave()
  const editorRoutes: Routes = config.editor
    ? [
        {
          path: `${config.path}/new`,
          canActivate: [authGuard],
          canDeactivate: [canLeave],
          providers: [provideCompanyFeature(config)],
          loadComponent: () => import('./company-editor').then(module => module.CompanyEditor),
        },
        {
          path: `${config.path}/:companyId/edit`,
          canActivate: [authGuard],
          canDeactivate: [canLeave],
          providers: [provideCompanyFeature(config)],
          loadComponent: () => import('./company-editor').then(module => module.CompanyEditor),
        },
      ]
    : []
  return [
    ...editorRoutes,
    {
      path: config.path,
      title: config.heading ?? 'Companies',
      canActivate: [authGuard],
      providers: [provideCompanyFeature(config)],
      loadComponent: () => import('./company-page').then(module => module.CompanyPage),
    },
  ]
}
