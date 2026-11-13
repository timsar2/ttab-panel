import { InjectionToken, Signal, makeEnvironmentProviders } from '@angular/core'
import { Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import { provideSchedulingData, SchedulingDataConfig } from '@org/transport-scheduling-data-access'
import { SchedulingStore } from '@org/transport-scheduling-data-access'

export interface ShiftFeatureConfig extends SchedulingDataConfig {
  readonly path: string
  readonly canManage: () => Signal<boolean>
  readonly language: () => Signal<'en' | 'fa'>
  readonly deniedMessage?: string
}

export const SHIFT_FEATURE = new InjectionToken<ShiftFeatureConfig>('SHIFT_FEATURE')
export const SHIFT_MANAGE = new InjectionToken<Signal<boolean>>('SHIFT_MANAGE')
export const SHIFT_LANGUAGE = new InjectionToken<Signal<'en' | 'fa'>>('SHIFT_LANGUAGE')

export function provideShiftFeature(config: ShiftFeatureConfig) {
  return makeEnvironmentProviders([
    provideSchedulingData(config),
    { provide: SHIFT_FEATURE, useValue: config },
    { provide: SHIFT_MANAGE, useFactory: config.canManage },
    { provide: SHIFT_LANGUAGE, useFactory: config.language },
  ])
}

export function createShiftRoutes(config: ShiftFeatureConfig): Routes {
  return [
    {
      path: config.path,
      canActivate: [authGuard],
      providers: [provideShiftFeature(config), SchedulingStore],
      data: { breadcrumb: 'Shifts' },
      children: [
        {
          path: '',
          pathMatch: 'full',
          loadComponent: () => import('./ui/shift-page').then(module => module.ShiftPage),
        },
        {
          path: 'add',
          data: { breadcrumb: 'Add shift' },
          loadComponent: () => import('./ui/shift-editor').then(module => module.ShiftEditor),
        },
        {
          path: 'detail/:id',
          data: { breadcrumb: 'Shift details' },
          loadComponent: () => import('./ui/shift-editor').then(module => module.ShiftEditor),
        },
      ],
    },
  ]
}
