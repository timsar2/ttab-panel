import { InjectionToken } from '@angular/core'
import { Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import { PeopleDataConfig, PersonRow, providePeopleData } from '@org/transport-people-data-access'

export interface PeopleFeatureConfig extends PeopleDataConfig {
  readonly path: string
  readonly heading?: string
  readonly deniedMessage?: string
  readonly actionLabel?: string
  readonly onSelect?: (person: PersonRow) => void
}

export const PEOPLE_FEATURE = new InjectionToken<PeopleFeatureConfig>('PEOPLE_FEATURE')

export function createPeopleRoutes(config: PeopleFeatureConfig): Routes {
  return [
    {
      path: config.path,
      canActivate: [authGuard],
      data: { breadcrumb: config.heading ?? 'People' },
      providers: [providePeopleData(config), { provide: PEOPLE_FEATURE, useValue: config }],
      loadComponent: () => import('./ui/people-page').then(module => module.PeoplePage),
    },
  ]
}
