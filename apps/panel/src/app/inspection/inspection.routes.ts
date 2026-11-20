import { computed, inject } from '@angular/core'
import { SessionStore } from '@org/platform'
import { createInspectionRoutes } from '@org/panel-inspection'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { DriversApi, driverCompanyId, provideDriversData } from '@org/transport-drivers-data-access'
import { providePeopleData, peopleCompanyId } from '@org/transport-people-data-access'
import { VehiclesApi, carCompanyId, provideVehiclesData } from '@org/transport-vehicles-data-access'
import { PreferencesStore } from '@org/platform'
import { map, of } from 'rxjs'

function isInspectionStaff(roles: readonly string[] | undefined): boolean {
  return roles?.some(role => role === 'Admin' || role === 'Manager') ?? false
}

/** Inspection APIs are global and currently restricted to Admin/Manager by the backend. */
export function createPanelInspectionRoutes() {
  return createInspectionRoutes({
    path: '',
    apiUrl: '/api',
    language: () => inject(PreferencesStore).language,
    scope: () => {
      const context = inject(CompanyContextStore)
      return computed(() => {
        const company = context.company()
        return context.status() === 'ready' && company ? company.id : null
      })
    },
    canManageActions: () => {
      const session = inject(SessionStore)
      return computed(() => isInspectionStaff(session.user()?.roles))
    },
    endpoints: {
      collection: 'v1/inspections',
      search: 'v1/inspections/search',
      defects: 'v1/inspections/defects',
      correctiveActions: 'v1/inspections/corrective-actions',
      status: 'v1/inspections/status',
    },
    access: () => {
      const session = inject(SessionStore)
      return () => of(isInspectionStaff(session.user()?.roles))
    },
    lookupProviders: [
      providePeopleData({
        apiUrl: '/api',
        company: () => {
          const context = inject(CompanyContextStore)
          return computed(() => {
            const company = context.company()
            try {
              return context.status() !== 'ready' || !company ? null : peopleCompanyId(company.id)
            } catch {
              return null
            }
          })
        },
        access: () => () => of(false),
      }),
      provideDriversData({
        apiUrl: '/api',
        endpoints: { collection: 'v1/drivers', search: 'v1/drivers/search', save: 'v1/drivers' },
        company: () => {
          const context = inject(CompanyContextStore)
          return computed(() => {
            const company = context.company()
            try {
              return context.status() !== 'ready' || !company ? null : driverCompanyId(company.id)
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
              request.action === 'search' &&
                context.status() === 'ready' &&
                context.company()?.id === request.companyId &&
                isInspectionStaff(session.user()?.roles),
            )
        },
      }),
      provideVehiclesData({
        apiUrl: '/api',
        endpoints: {
          collection: 'v1/vehicle',
          search: 'v1/vehicle/search',
          types: 'v1/vehicle/types',
          save: 'v1/vehicle',
        },
        company: () => {
          const context = inject(CompanyContextStore)
          return computed(() => {
            const company = context.company()
            try {
              return context.status() !== 'ready' || !company ? null : carCompanyId(company.id)
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
              request.action === 'search' &&
                context.status() === 'ready' &&
                context.company()?.id === request.companyId &&
                isInspectionStaff(session.user()?.roles),
            )
        },
      }),
    ],
    lookups: {
      drivers: () => {
        const api = inject(DriversApi)
        return query =>
          api.search({ pageIndex: 0, pageSize: 50, fullName: query, nationalId: '' }).pipe(
            map(page =>
              page.items.map(driver => ({
                id: driver.id,
                label: driver.fullName || `#${driver.id}`,
              })),
            ),
          )
      },
      vehicles: () => {
        const api = inject(VehiclesApi)
        return pageNumber =>
          api.search({ pageIndex: pageNumber - 1, pageSize: 50 }).pipe(
            map(page => ({
              items: page.items
                .filter(vehicle => vehicle.id <= 32767)
                .map(vehicle => ({
                  id: vehicle.id,
                  label: `${vehicle.carPlate} · ${vehicle.carTypeName}`,
                })),
              pageNumber: page.pagination.currentPage,
              hasNext: page.pagination.currentPage < page.pagination.totalPages,
            })),
          )
      },
    },
  })
}
