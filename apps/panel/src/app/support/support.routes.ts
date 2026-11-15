import { computed, inject } from '@angular/core'
import { SessionStore } from '@org/platform'
import { createSupportRoutes } from '@org/panel-support'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { supportCompanyId } from '@org/transport-support-data-access'
import { PreferencesStore } from '@org/platform'
import { of } from 'rxjs'

function globalStaff(roles: readonly string[] | undefined): boolean {
  return roles?.some(role => role === 'Admin' || role === 'Manager') ?? false
}

function companyOperator(roles: readonly string[] | undefined): boolean {
  return roles?.includes('Oprator') ?? false
}

/** Adapt the selected company and authenticated staff policy to the reusable Support feature. */
export function createPanelSupportRoutes() {
  return createSupportRoutes({
    path: '',
    apiUrl: '/api',
    language: () => inject(PreferencesStore).language,
    endpoints: {
      collection: 'v1/support',
      search: 'v1/support/search',
      messages: 'v1/support',
      sendMessage: 'v1/support/messages',
      violationTypes: 'v1/support/violation-types',
    },
    company: () => {
      const context = inject(CompanyContextStore)
      return computed(() => {
        const company = context.company()
        if (context.status() !== 'ready' || !company) return null
        try {
          return supportCompanyId(company.id)
        } catch {
          return null
        }
      })
    },
    access: () => {
      const context = inject(CompanyContextStore)
      const session = inject(SessionStore)
      return request => {
        const user = session.user()
        const selectedCompany = context.company()?.id
        const roleAllowed = globalStaff(user?.roles) || companyOperator(user?.roles)
        const scopeAllowed =
          context.status() === 'ready' &&
          selectedCompany === request.companyId &&
          (globalStaff(user?.roles) || user?.companyId === request.companyId)
        return of(!!user && roleAllowed && scopeAllowed)
      }
    },
    canReply: () => {
      const context = inject(CompanyContextStore)
      const session = inject(SessionStore)
      return computed(() => {
        const user = session.user()
        const company = context.company()?.id
        return (
          context.status() === 'ready' &&
          company !== undefined &&
          (globalStaff(user?.roles) ||
            (companyOperator(user?.roles) && user?.companyId === company))
        )
      })
    },
  })
}
