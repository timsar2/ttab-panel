import { computed, inject } from '@angular/core'
import { SessionStore, hasAnyRole, requireAnyRole } from '@org/auth-data-access'
import { createVehicleRoutes } from '@org/transport-vehicles-feature'
import { carCompanyId } from '@org/transport-vehicles-data-access'
import type { VehicleAccessRequest } from '@org/transport-vehicles-data-access'
import { driverCompanyId } from '@org/transport-drivers-data-access'
import { peopleCompanyId } from '@org/transport-people-data-access'
import { of } from 'rxjs'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { PreferencesStore } from '../core/preferences/preferences.store'
import { VehiclesPageHost } from './vehicle.page'

const manageRoles = ['Admin', 'Manager'] as const
const vehicleReadActions = new Set<VehicleAccessRequest['action']>([
  'search',
  'detail',
  'list-types',
])
const driverReadActions = new Set(['search', 'detail'])
const peopleReadActions = new Set(['detail'])

interface CompanyContextReader {
  status(): string
  company(): { readonly id: number } | null
}

function canReadCompanyData(
  context: CompanyContextReader,
  session: SessionStore,
  requestedCompanyId: number,
  actions: ReadonlySet<string>,
  action: string,
) {
  const company = context.company()
  return (
    actions.has(action) &&
    context.status() === 'ready' &&
    company?.id === requestedCompanyId &&
    hasAnyRole(session.user()?.roles, manageRoles)
  )
}

export function canReadVehicleRequest(
  request: VehicleAccessRequest,
  activeCompanyId: number | null,
  roles: readonly string[] | undefined,
) {
  return (
    activeCompanyId === request.companyId &&
    vehicleReadActions.has(request.action) &&
    hasAnyRole(roles, manageRoles)
  )
}

function companyId(context = inject(CompanyContextStore)) {
  return computed(() => {
    const company = context.company()
    if (context.status() !== 'ready' || !company) return null
    try {
      return carCompanyId(company.id)
    } catch {
      return null
    }
  })
}

/** Allow selected-company management reads; the backend must enforce entity ownership. */
export function createPanelVehicleRoutes() {
  const routes = createVehicleRoutes({
    path: '',
    apiUrl: '/api',
    endpoints: {
      collection: 'v1/vehicle',
      search: 'v1/vehicle/search',
      types: 'v1/vehicle/types',
      save: 'v1/vehicle',
    },
    company: () => companyId(inject(CompanyContextStore)),
    access: () => {
      const context = inject(CompanyContextStore)
      const session = inject(SessionStore)
      return request => {
        const activeCompanyId =
          context.status() === 'ready' ? (context.company()?.id ?? null) : null
        return of(canReadVehicleRequest(request, activeCompanyId, session.user()?.roles))
      }
    },
    canActivate: requireAnyRole(manageRoles),
    language: () => inject(PreferencesStore).language,
    canManage: () => {
      const session = inject(SessionStore)
      return computed(() => hasAnyRole(session.user()?.roles, manageRoles))
    },
    deniedMessage: {
      en: 'Vehicle access requires an authorized role and the selected company. Changes remain disabled pending ownership approval.',
      fa: 'دسترسی خودرو به نقش مجاز و شرکت انتخاب‌شده نیاز دارد. تغییرات تا تأیید مالکیت غیرفعال است.',
    },
    legacyPaths: { add: 'add', detail: 'detail/:id' },
    drivers: {
      apiUrl: '/api',
      endpoints: { collection: 'v1/drivers', search: 'v1/drivers/search', save: 'v1/drivers' },
      company: () => {
        const context = inject(CompanyContextStore)
        const selectedCompanyId = companyId(context)
        return computed(() => {
          const id = selectedCompanyId()
          try {
            return id === null ? null : driverCompanyId(id)
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
            canReadCompanyData(
              context,
              session,
              request.companyId,
              driverReadActions,
              request.action,
            ),
          )
      },
    },
    people: {
      apiUrl: '/api',
      company: () => {
        const context = inject(CompanyContextStore)
        const selectedCompanyId = companyId(context)
        return computed(() => {
          const id = selectedCompanyId()
          try {
            return id === null ? null : peopleCompanyId(id)
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
            canReadCompanyData(
              context,
              session,
              request.companyId,
              peopleReadActions,
              request.action,
            ),
          )
      },
    },
  })
  return routes.map(route => ({ ...route, component: VehiclesPageHost }))
}
