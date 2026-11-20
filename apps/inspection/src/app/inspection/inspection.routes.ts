import { computed, inject } from '@angular/core'
import { CanActivateFn, Route, Router } from '@angular/router'
import { PreferencesStore, SessionStore } from '@org/platform'
import { createInspectorRoutes as createInspectorFeatureRoutes } from '@org/inspection-feature'
import { DriversApi, driverCompanyId, provideDriversData } from '@org/transport-drivers-data-access'
import { providePeopleData, peopleCompanyId } from '@org/transport-people-data-access'
import { VehiclesApi, carCompanyId, provideVehiclesData } from '@org/transport-vehicles-data-access'
import { map, of } from 'rxjs'
import { hasInspectorRole } from '../inspection-role.guard'
import { InspectorShell } from './inspector-shell'

function createInspectorRoutes(): Route[] {
  return createInspectorFeatureRoutes({
    path: '',
    apiUrl: '/api',
    language: () => inject(PreferencesStore).language,
    companyId: () => {
      const session = inject(SessionStore)
      return computed(() => session.companyId())
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
      return request =>
        of(
          hasInspectorRole(session.user()?.roles) &&
            (request.action === 'create' ||
              request.action === 'detail' ||
              request.action === 'search'),
        )
    },
    lookupProviders: [
      providePeopleData({
        apiUrl: '/api',
        company: () => {
          const session = inject(SessionStore)
          return computed(() => {
            const companyId = session.companyId()
            try {
              return companyId ? peopleCompanyId(companyId) : null
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
          const session = inject(SessionStore)
          return computed(() => {
            const companyId = session.companyId()
            try {
              return companyId ? driverCompanyId(companyId) : null
            } catch {
              return null
            }
          })
        },
        access: () => {
          const session = inject(SessionStore)
          return request =>
            of(
              request.action === 'search' &&
                hasInspectorRole(session.user()?.roles) &&
                session.companyId() === request.companyId,
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
          const session = inject(SessionStore)
          return computed(() => {
            const companyId = session.companyId()
            try {
              return companyId ? carCompanyId(companyId) : null
            } catch {
              return null
            }
          })
        },
        access: () => {
          const session = inject(SessionStore)
          return request =>
            of(
              request.action === 'search' &&
                hasInspectorRole(session.user()?.roles) &&
                session.companyId() === request.companyId,
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
  }).map(featureRoute => ({
    ...featureRoute,
    component: InspectorShell,
    canActivate: [...(featureRoute.canActivate ?? []), inspectorOnlyGuard],
    data: { ...featureRoute.data, breadcrumb: 'Inspections' },
    children: (featureRoute.children ?? []).map(child =>
      child.path === '' && child.redirectTo === 'new'
        ? {
            path: '',
            pathMatch: 'full' as const,
            loadComponent: () =>
              import('@org/inspection-feature-list').then(
                module => module.InspectorInspectionListPage,
              ),
          }
        : child,
    ),
  }))
}

const inspectorOnlyGuard: CanActivateFn = () => {
  const session = inject(SessionStore)
  const router = inject(Router)
  return hasInspectorRole(session.user()?.roles) || router.parseUrl('/access-denied')
}

export { createInspectorRoutes }
