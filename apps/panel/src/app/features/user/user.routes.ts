import { computed, inject } from '@angular/core'
import { hasAnyRole, requireAnyRole, SessionStore } from '@org/auth-data-access'
import { createUserRoutes } from '@org/panel-users'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { PreferencesStore } from '../../core/preferences/preferences.store'

const userManagementRoles = ['Admin', 'Manager'] as const

/** App adapter for company-scoped User routes; backend ownership checks remain required. */
export function createPanelUserRoutes() {
  return createUserRoutes({
    path: '',
    apiUrl: '/api',
    heading: 'Users',
    canActivate: requireAnyRole(userManagementRoles),
    companyId: () => {
      const context = inject(CompanyContextStore)
      return computed(() => (context.status() === 'ready' ? (context.company()?.id ?? null) : null))
    },
    canManage: () => {
      const session = inject(SessionStore)
      return computed(() => hasAnyRole(session.user()?.roles, userManagementRoles))
    },
    language: () => inject(PreferencesStore).language,
  })
}
