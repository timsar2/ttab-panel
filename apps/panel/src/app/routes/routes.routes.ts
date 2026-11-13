import { computed, inject } from '@angular/core'
import { SessionStore, hasAnyRole, requireAnyRole } from '@org/auth-data-access'
import { createRouteRoutes } from '@org/transport-routes-feature'
import type { RouteAccessRequest } from '@org/transport-routes-data-access'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { PreferencesStore } from '../core/preferences/preferences.store'
import { panelConfig } from '../panel.config'
import { of } from 'rxjs'

const routeManagementRoles = ['Admin', 'Manager'] as const
const readRouteActions = new Set<RouteAccessRequest['action']>(['search', 'detail', 'stations'])

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
    readRouteActions.has(request.action) &&
    hasAnyRole(roles, routeManagementRoles)
  )
}

/** Read-only until Route CRUD, Line/Station ownership, and map-key policy are approved. */
export function createPanelRouteRoutes() {
  return createRouteRoutes({
    path: '',
    apiUrl: panelConfig.apiUrl,
    endpoints: {
      routes: 'v1/directions',
      search: 'v1/directions/search',
      stations: 'v1/stations/search',
      save: 'v1/directions',
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
    heading: 'Routes',
    deniedMessage: {
      en: 'Route reads require an Admin/Manager role and the selected company. Writes await ownership approval.',
      fa: 'خواندن مسیر به نقش مدیر و شرکت انتخاب‌شده نیاز دارد. ثبت تغییرات تا تأیید مالکیت غیرفعال است.',
    },
  })
}
