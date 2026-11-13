import { computed, inject } from '@angular/core'
import { SessionStore } from '@org/auth-data-access'
import { createShiftRoutes } from '@org/panel-shifts'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { of } from 'rxjs'
import { PreferencesStore } from '../../core/preferences/preferences.store'
import { ShiftPage } from './shift.page'

const isManager = (roles: readonly string[] | undefined) =>
  roles?.some(role => role === 'Admin' || role === 'Manager') ?? false

export function createPanelShiftRoutes() {
  const routes = createShiftRoutes({
    path: '',
    apiUrl: '/api',
    endpoints: {
      shifts: 'v1/shifts/get-shift',
      shiftDetail: 'v1/shifts',
      groups: 'v1/shifts/shift-group',
      types: 'v1/shifts/shift-type',
      shiftTimes: 'v1/shiftTimes',
      saveGroup: 'v1/shifts/set-group',
      saveShift: 'v1/shifts/set-shift',
    },
    language: () => inject(PreferencesStore).language,
    canManage: () => {
      const session = inject(SessionStore)
      return computed(() => isManager(session.user()?.roles))
    },
    company: () => {
      const context = inject(CompanyContextStore)
      return computed(() => (context.status() === 'ready' ? (context.company()?.id ?? null) : null))
    },
    access: () => {
      const context = inject(CompanyContextStore)
      const session = inject(SessionStore)
      return request => {
        const user = session.user()
        const manager = isManager(user?.roles)
        const operator = user?.roles.includes('Oprator') ?? false
        const companyMatches =
          context.status() === 'ready' && context.company()?.id === request.companyId
        const actionAllowed =
          request.action === 'list' || request.action === 'lookup'
            ? manager || (operator && user?.companyId === request.companyId)
            : manager
        return of(Boolean(user && companyMatches && actionAllowed))
      }
    },
    deniedMessage: 'Shift access is limited to authorized users in this company.',
  })
  return routes.map(route => ({ ...route, component: ShiftPage }))
}
