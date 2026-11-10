import { InjectionToken, inject, provideEnvironmentInitializer } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  NavigationCancel,
  NavigationError,
  Router,
  Routes,
} from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import { CompanyApi, CompanyContextStore } from '@org/transport-company-data-access'
import { provideTransportHttp } from '@org/transport-http'
import { from, isObservable, map, of, switchMap } from 'rxjs'

export interface CompanyShellLink {
  readonly path: string
  readonly label: string
  /** Navigation presentation only; the child route/API must also enforce access. */
  readonly visibleWhen?: (roles: readonly string[]) => boolean
}
export interface CompanyShellConfig {
  readonly path: string
  readonly companyParam: string
  readonly apiUrl: string
  readonly brand: string
  readonly companiesCommands: (string | number)[]
  readonly loginUrl: string
  readonly links?: readonly CompanyShellLink[]
  readonly labels?: Partial<CompanyShellLabels>
}

export interface CompanyShellLabels {
  readonly navigation: string
  readonly companies: string
  readonly chooseCompany: string
  readonly switchCompany: string
  readonly workspace: string
  readonly signOut: string
  readonly breadcrumbs: string
  readonly account: string
}

export const COMPANY_SHELL_CONFIG = new InjectionToken<CompanyShellConfig>('COMPANY_SHELL_CONFIG')

export function createCompanyShellRoutes(
  config: CompanyShellConfig,
  children: Routes = [],
): Routes {
  if (!config.path.split('/').includes(`:${config.companyParam}`)) {
    throw new Error('The company shell path must contain the configured company parameter.')
  }
  const guard: CanActivateFn = (route, state) => {
    const context = inject(CompanyContextStore)
    context.clear()
    const authenticated = authGuard(route, state)
    const checked = isObservable(authenticated)
      ? authenticated
      : from(Promise.resolve(authenticated))
    return checked.pipe(
      switchMap(result =>
        result === true
          ? context.prepare(route.paramMap.get(config.companyParam)).pipe(map(() => true))
          : of(result),
      ),
    )
  }
  return [
    {
      path: config.path,
      canActivate: [guard],
      canActivateChild: [
        child => {
          let route: ActivatedRouteSnapshot | null = child
          while (route && !route.paramMap.has(config.companyParam)) route = route.parent
          return inject(CompanyContextStore).canEnterRoute(
            route?.paramMap.get(config.companyParam) ?? null,
          )
        },
      ],
      runGuardsAndResolvers: 'paramsChange',
      providers: [
        provideTransportHttp({ apiUrl: config.apiUrl }),
        CompanyApi,
        CompanyContextStore,
        { provide: COMPANY_SHELL_CONFIG, useValue: config },
        provideEnvironmentInitializer(() => {
          const context = inject(CompanyContextStore)
          inject(Router)
            .events.pipe(takeUntilDestroyed())
            .subscribe(event => {
              if (event instanceof NavigationCancel || event instanceof NavigationError)
                context.discardPending()
            })
        }),
      ],
      loadComponent: () => import('./company-shell').then(module => module.CompanyShell),
      children,
    },
  ]
}
