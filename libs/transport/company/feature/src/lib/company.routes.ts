import { InjectionToken } from '@angular/core'
import { Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import type { CompanyRow } from '@org/transport-company-data-access'
import { provideTransportHttp } from '@org/transport-http'

export interface CompanyFeatureConfig {
  readonly path: string
  readonly apiUrl: string
  readonly heading?: string
  readonly actionLabel?: string
  /** Emits intent only. The consumer must independently authorize any selected workspace. */
  readonly onAction?: (company: CompanyRow) => void
}

export const COMPANY_FEATURE = new InjectionToken<CompanyFeatureConfig>('COMPANY_FEATURE')

export function createCompanyRoutes(config: CompanyFeatureConfig): Routes {
  return [
    {
      path: config.path,
      title: config.heading ?? 'Companies',
      canActivate: [authGuard],
      providers: [
        provideTransportHttp({ apiUrl: config.apiUrl }),
        { provide: COMPANY_FEATURE, useValue: config },
      ],
      loadComponent: () => import('./company-page').then(module => module.CompanyPage),
    },
  ]
}
