import { computed, inject } from '@angular/core'
import { SessionStore, hasAnyRole, requireAnyRole, PreferencesStore } from '@org/platform'
import { createRouteRoutes, ROUTE_DIRECTION_ID } from '@org/transport-routes-feature'
import { createPanelLineRoutes } from './line.routes'
import type { RouteAccessRequest } from '@org/transport-routes-data-access'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { panelConfig } from '../panel.config'
import { of } from 'rxjs'

const routeManagementRoles = ['Admin', 'Manager', 'Operator', 'Operator'] as const
const allowedRouteActions = new Set<RouteAccessRequest['action']>([
  'search',
  'detail',
  'stations',
  'price',
  'create',
  'update',
  'savePrice',
  'stationDetail',
  'saveStation',
])

function activeCompany(context = inject(CompanyContextStore)) {
  return computed(() => (context.status() === 'ready' ? (context.company()?.id ?? null) : null))
}

export function canReadRouteRequest(
  request: RouteAccessRequest,
  activeCompanyId: number | null,
  roles: readonly string[] | undefined,
) {
  return (
    activeCompanyId === request.companyId &&
    allowedRouteActions.has(request.action) &&
    hasAnyRole(roles, routeManagementRoles)
  )
}

/** Route operations are scoped to the selected company and management roles. */
export function createPanelRouteRoutes() {
  return createRouteRoutes({
    path: '',
    apiUrl: panelConfig.apiUrl,
    endpoints: {
      routes: 'v1/directions',
      search: 'v1/directions/search',
      stations: 'v1/stations/search',
      save: 'v1/directions',
      prices: 'v1/directionprices',
      stationSave: 'v1/stations',
    },
    company: () => activeCompany(),
    access: () => {
      const context = inject(CompanyContextStore)
      const session = inject(SessionStore)
      const company = activeCompany(context)
      return request => of(canReadRouteRequest(request, company(), session.user()?.roles))
    },
    canActivate: requireAnyRole(routeManagementRoles),
    language: () => inject(PreferencesStore).language,
    canManage: () => {
      const session = inject(SessionStore)
      return computed(() => hasAnyRole(session.user()?.roles, routeManagementRoles))
    },
    neshanMapApiKey: panelConfig.neshanMapApiKey,
    neshanServiceApiKey: panelConfig.neshanServiceApiKey,
    lineRoutes: () => createPanelLineRoutes(inject(ROUTE_DIRECTION_ID)),
    heading: 'Routes',
    deniedMessage: {
      en: 'Route access requires an Admin, Manager, or Operator role and the selected company.',
      fa: 'دسترسی به مسیر به نقش مدیر، سرپرست یا اپراتور و انتخاب شرکت نیاز دارد.',
    },
  })
}
