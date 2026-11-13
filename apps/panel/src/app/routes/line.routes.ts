import { computed, inject } from '@angular/core'
import type { Signal } from '@angular/core'
import { hasAnyRole, requireAnyRole, SessionStore } from '@org/auth-data-access'
import { departureCompanyId } from '@org/transport-departure-times-data-access'
import type {
  DepartureTimeAccessRequest,
  DepartureTimesDataConfig,
} from '@org/transport-departure-times-data-access'
import { ROUTE_DIRECTION_ID } from '@org/transport-routes-feature'
import type { RouteId } from '@org/transport-routes-data-access'
import type { LineAccessRequest } from '@org/transport-lines-data-access'
import { createLineRoutes } from '@org/transport-lines-feature'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { PreferencesStore } from '../core/preferences/preferences.store'
import { panelConfig } from '../panel.config'
import { of } from 'rxjs'

const lineRoles = ['Admin', 'Manager'] as const
const lineActions = new Set<LineAccessRequest['action']>(['search', 'detail', 'create', 'update'])

interface CompanyContextReader {
  status(): string
  company(): { readonly id: number } | null
}

function selectedCompany(context: CompanyContextReader) {
  return context.status() === 'ready' ? (context.company()?.id ?? null) : null
}

function canAccessLine(
  request: LineAccessRequest,
  companyId: number | null,
  routeId: RouteId | null,
  roles: readonly string[] | undefined,
) {
  return (
    companyId === request.companyId &&
    routeId !== null &&
    routeId === request.directionId &&
    lineActions.has(request.action) &&
    hasAnyRole(roles, lineRoles)
  )
}

function departureTimesConfig(): DepartureTimesDataConfig {
  return {
    apiUrl: panelConfig.apiUrl,
    endpoints: { collection: 'v1/shiftTimes', save: 'v1/shiftTimes/set-shift-time' },
    company: () => {
      const context = inject(CompanyContextStore)
      return computed(() => {
        const selected = selectedCompany(context)
        try {
          return selected === null ? null : departureCompanyId(selected)
        } catch {
          return null
        }
      })
    },
    access: () => {
      const context = inject(CompanyContextStore)
      const session = inject(SessionStore)
      return (request: DepartureTimeAccessRequest) =>
        of(
          request.action === 'list' &&
            selectedCompany(context) === request.companyId &&
            hasAnyRole(session.user()?.roles, lineRoles),
        )
    },
  }
}

/** Configure nested Line routes with Admin/Manager scope bound to the parent Route. */
export function createPanelLineRoutes(directionId: Signal<RouteId | null>) {
  return createLineRoutes({
    path: '',
    apiUrl: panelConfig.apiUrl,
    endpoints: { collection: 'v1/lines', search: 'v1/lines/search', save: 'v1/lines' },
    company: () => {
      const context = inject(CompanyContextStore)
      return computed(() => selectedCompany(context))
    },
    directionId: () => directionId,
    access: () => {
      const context = inject(CompanyContextStore)
      const session = inject(SessionStore)
      return request =>
        of(canAccessLine(request, selectedCompany(context), directionId(), session.user()?.roles))
    },
    departureTimes: departureTimesConfig(),
    canActivate: requireAnyRole(lineRoles),
    language: () => inject(PreferencesStore).language,
    canManage: () => {
      const session = inject(SessionStore)
      return computed(() => hasAnyRole(session.user()?.roles, lineRoles))
    },
    deniedMessage: {
      en: 'Line access requires the owning Route, selected company and an Admin/Manager role.',
      fa: 'دسترسی خط به مسیر مالک، شرکت انتخاب‌شده و نقش مدیر نیاز دارد.',
    },
  })
}
