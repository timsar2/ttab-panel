import { computed, inject } from '@angular/core'
import { SessionStore } from '@org/auth-data-access'
import { createUserRoutes } from '@org/panel-users'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { PreferencesStore } from '../../core/preferences/preferences.store'

function canManageUsers(roles: readonly string[] | undefined) {
  return roles?.some(role => role === 'Admin' || role === 'Manager') ?? false
}

/** App adapter for company-scoped User routes; backend ownership checks remain required. */
export function createPanelUserRoutes() {
  return createUserRoutes({
    path: '',
    apiUrl: '/api',
    heading: 'Users',
    companyId: () => {
      const context = inject(CompanyContextStore)
      return computed(() => (context.status() === 'ready' ? (context.company()?.id ?? null) : null))
    },
    canManage: () => {
      const session = inject(SessionStore)
      return computed(() => canManageUsers(session.user()?.roles))
    },
    language: () => inject(PreferencesStore).language,
  })
}
