import { computed, inject } from '@angular/core'
import { SessionStore } from '@org/auth-data-access'
import { createDriverRoutes, driverTextPair } from '@org/panel-drivers'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { peopleCompanyId } from '@org/transport-people-data-access'
import { of } from 'rxjs'
import { PreferencesStore } from '../core/preferences/preferences.store'
import { DriverPage } from './driver.page'

function canManageDrivers(roles: readonly string[] | undefined): boolean {
  return roles?.some(role => role === 'Admin' || role === 'Manager') ?? false
}

/** Bind the reusable driver page library to this panel's company, session, and locale. */
export function createPanelDriverRoutes() {
  const routes = createDriverRoutes({
    path: '',
    apiUrl: '/api',
    language: () => inject(PreferencesStore).language,
    endpoints: {
      collection: 'v1/drivers',
      search: 'v1/drivers/search',
      save: 'v1/drivers',
    },
    company: () => {
      const context = inject(CompanyContextStore)
      return computed(() => {
        const company = context.company()
        return context.status() === 'ready' && company ? peopleCompanyId(company.id) : null
      })
    },
    // Detail and upsert require privileged roles because backend entity ownership
    // checks are not yet implemented for company operators.
    access: () => {
      const context = inject(CompanyContextStore)
      const session = inject(SessionStore)
      return request => {
        const user = session.user()
        const roleAllowed =
          !!user &&
          (request.action === 'search'
            ? user.roles.some(role => ['Admin', 'Manager', 'Oprator'].includes(role))
            : canManageDrivers(user.roles))
        const companyAllowed = Boolean(
          context.status() === 'ready' &&
          context.company()?.id === request.companyId &&
          (canManageDrivers(user?.roles) || user?.companyId === request.companyId),
        )
        return of(roleAllowed && companyAllowed)
      }
    },
    canManage: () => {
      const session = inject(SessionStore)
      return computed(() => canManageDrivers(session.user()?.roles))
    },
    canRegisterPerson: () => {
      const session = inject(SessionStore)
      return computed(() => canManageDrivers(session.user()?.roles))
    },
    people: {
      apiUrl: '/api',
      company: () => {
        const context = inject(CompanyContextStore)
        return computed(() => {
          const company = context.company()
          return context.status() === 'ready' && company ? peopleCompanyId(company.id) : null
        })
      },
      access: () => {
        const context = inject(CompanyContextStore)
        const session = inject(SessionStore)
        return request =>
          of(
            canManageDrivers(session.user()?.roles) &&
              context.status() === 'ready' &&
              context.company()?.id === request.companyId,
          )
      },
    },
    deniedMessage: driverTextPair('accessManageDenied'),
  })
  return routes.map(route => ({ ...route, component: DriverPage }))
}
