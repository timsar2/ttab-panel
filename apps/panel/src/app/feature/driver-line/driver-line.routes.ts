import { computed, inject } from '@angular/core'
import { SessionStore } from '@org/auth-data-access'
import { createDriverLineRoutes } from '@org/panel-driver-line'
import { driverCompanyId } from '@org/transport-drivers-data-access'
import { peopleCompanyId } from '@org/transport-people-data-access'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { of } from 'rxjs'
import { PreferencesStore } from '../../core/preferences/preferences.store'
import { DriverLinePageHost } from './driver-line.page'

const managementRoles = ['Admin', 'Manager']

export function createPanelDriverLineRoutes() {
  const routes = createDriverLineRoutes({
    path: '',
    apiUrl: '/api',
    language: () => inject(PreferencesStore).language,
    company: () => {
      const context = inject(CompanyContextStore)
      return computed(() => (context.status() === 'ready' ? (context.company()?.id ?? null) : null))
    },
    canManage: () => {
      const session = inject(SessionStore)
      return computed(
        () => session.user()?.roles.some(role => managementRoles.includes(role)) ?? false,
      )
    },
    drivers: {
      apiUrl: '/api',
      endpoints: { collection: 'v1/drivers', search: 'v1/drivers/search', save: 'v1/drivers' },
      company: () => {
        const context = inject(CompanyContextStore)
        return computed(() => {
          const id = context.status() === 'ready' ? context.company()?.id : null
          try {
            return id ? driverCompanyId(id) : null
          } catch {
            return null
          }
        })
      },
      access: () => {
        const context = inject(CompanyContextStore)
        const session = inject(SessionStore)
        return request =>
          of(
            ['search', 'detail'].includes(request.action) &&
              context.status() === 'ready' &&
              context.company()?.id === request.companyId &&
              (session.user()?.roles.some(role => managementRoles.includes(role)) ?? false),
          )
      },
    },
    people: {
      apiUrl: '/api',
      company: () => {
        const context = inject(CompanyContextStore)
        return computed(() => {
          const id = context.status() === 'ready' ? context.company()?.id : null
          try {
            return id ? peopleCompanyId(id) : null
          } catch {
            return null
          }
        })
      },
      access: () => {
        const context = inject(CompanyContextStore)
        const session = inject(SessionStore)
        return request =>
          of(
            ['search', 'detail'].includes(request.action) &&
              context.status() === 'ready' &&
              context.company()?.id === request.companyId &&
              (session.user()?.roles.some(role => managementRoles.includes(role)) ?? false),
          )
      },
    },
  })
  return routes.map(route => ({ ...route, component: DriverLinePageHost }))
}
