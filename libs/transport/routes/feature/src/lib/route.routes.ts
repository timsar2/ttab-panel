import {
  InjectionToken,
  Signal,
  computed,
  inject,
  makeEnvironmentProviders,
  signal,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, CanActivateFn, CanDeactivateFn, Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import {
  RouteId,
  RoutesDataConfig,
  provideRoutesData,
  routeId,
} from '@org/transport-routes-data-access'
import type { AutocompleteLanguage, BilingualText } from '@org/ui-forms'
import type { RouteEditor } from './ui/route-editor'

export interface RouteFeatureConfig extends RoutesDataConfig {
  readonly path: string
  readonly heading?: string
  readonly language?: () => Signal<AutocompleteLanguage>
  readonly canManage?: () => Signal<boolean>
  readonly canActivate?: CanActivateFn
  readonly deniedMessage?: BilingualText
  readonly neshanMapApiKey?: string | null
  readonly lineRoutes?: () => Routes
  readonly legacyPaths?: { readonly add?: string; readonly map?: string }
}

export const ROUTE_FEATURE = new InjectionToken<RouteFeatureConfig>('ROUTE_FEATURE')
export const ROUTE_LANGUAGE = new InjectionToken<Signal<AutocompleteLanguage>>('ROUTE_LANGUAGE')
export const ROUTE_MANAGE = new InjectionToken<Signal<boolean>>('ROUTE_MANAGE')
export const ROUTE_DIRECTION_ID = new InjectionToken<Signal<RouteId | null>>('ROUTE_DIRECTION_ID')

function directionIdFromRoute() {
  const route = inject(ActivatedRoute)
  const params = toSignal(route.paramMap, { initialValue: route.snapshot.paramMap })
  return computed(() => {
    const value = params().get('id')
    if (!value || !/^[1-9]\d*$/.test(value)) return null
    try {
      return routeId(Number(value))
    } catch {
      return null
    }
  })
}

export function provideRouteFeature(config: RouteFeatureConfig) {
  return makeEnvironmentProviders([
    provideRoutesData(config),
    { provide: ROUTE_FEATURE, useValue: config },
    {
      provide: ROUTE_LANGUAGE,
      useFactory: config.language ?? (() => signal<AutocompleteLanguage>('fa')),
    },
    { provide: ROUTE_MANAGE, useFactory: config.canManage ?? (() => signal(false)) },
  ])
}

export function createRouteRoutes(config: RouteFeatureConfig): Routes {
  const canLeave: CanDeactivateFn<RouteEditor> = component => component?.confirmLeave() ?? true
  return [
    {
      path: config.path,
      canActivate: [config.canActivate ?? authGuard],
      providers: [provideRouteFeature(config)],
      data: { breadcrumb: config.heading ?? 'Routes' },
      children: [
        {
          path: '',
          pathMatch: 'full',
          loadComponent: () => import('./ui/routes-page').then(module => module.RoutesPage),
        },
        {
          path: config.legacyPaths?.add ?? 'add',
          canDeactivate: [canLeave],
          data: { breadcrumb: null },
          loadComponent: () => import('./ui/route-editor').then(module => module.RouteEditor),
        },
        { path: 'new', pathMatch: 'full', redirectTo: config.legacyPaths?.add ?? 'add' },
        {
          path: config.legacyPaths?.map ?? 'show-map',
          data: { breadcrumb: null },
          loadComponent: () => import('./ui/route-map-page').then(module => module.RouteMapPage),
        },
        {
          path: 'detail/:id/stations',
          data: { breadcrumb: null },
          loadComponent: () => import('./ui/route-map-page').then(module => module.RouteMapPage),
        },
        {
          path: 'detail/:id/lines',
          providers: [{ provide: ROUTE_DIRECTION_ID, useFactory: directionIdFromRoute }],
          data: { breadcrumb: null },
          loadChildren: () =>
            config.lineRoutes?.() ?? [
              {
                path: '',
                loadComponent: () =>
                  import('./ui/route-related-page').then(module => module.RouteRelatedPage),
              },
            ],
        },
        {
          path: 'detail/:id',
          canDeactivate: [canLeave],
          data: { breadcrumb: null },
          loadComponent: () => import('./ui/route-editor').then(module => module.RouteEditor),
        },
      ],
    },
  ]
}
