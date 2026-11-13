import { InjectionToken, Signal, makeEnvironmentProviders, signal } from '@angular/core'
import { Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import type { CanActivateFn } from '@angular/router'
import { HttpClient } from '@angular/common/http'
import { inject } from '@angular/core'
import { TRANSPORT_IMAGE_FILE_TYPES, transportImageUpload } from '@org/transport-http'
import type { UploadSelection } from '@org/ui-forms'

export interface UserFeatureConfig {
  readonly path: string
  readonly apiUrl: string
  readonly companyId: () => Signal<number | null>
  readonly canManage: () => Signal<boolean>
  readonly language?: () => Signal<'en' | 'fa'>
  readonly heading?: string
  /** Consumer-owned role/access guard; authorization must also be enforced by the API. */
  readonly canActivate?: CanActivateFn
}

export interface UserRow {
  readonly id: number
  readonly fullName?: string | null
  readonly nationalId?: string | null
  readonly profileImage?: string | null
}

export interface UserDetail {
  readonly id: number
  readonly firstName?: string | null
  readonly lastName?: string | null
  readonly email?: string | null
  readonly nationalId?: string | null
  readonly provinceName?: string | null
  readonly cityName?: string | null
  readonly cityId: number
  readonly address?: string | null
  readonly postalCode?: string | null
  readonly lat: number | null
  readonly lng: number | null
  readonly mobileNumber: string
  readonly phoneNumber?: string | null
  readonly profileImage?: string | null
}

export interface UserSearchResponse {
  readonly result: {
    readonly list: readonly UserRow[]
    readonly pagination: {
      readonly currentPage: number
      readonly totalPages: number
      readonly pageSize: number
      readonly hasPreviousPage: boolean
      readonly hasNextPage: boolean
    }
  }
}

export const USER_FEATURE = new InjectionToken<UserFeatureConfig>('USER_FEATURE')
export const USER_COMPANY_ID = new InjectionToken<Signal<number | null>>('USER_COMPANY_ID')
export const USER_CAN_MANAGE = new InjectionToken<Signal<boolean>>('USER_CAN_MANAGE')
export const USER_LANGUAGE = new InjectionToken<Signal<'en' | 'fa'>>('USER_LANGUAGE')

export function provideUserFeature(config: UserFeatureConfig) {
  return makeEnvironmentProviders([
    { provide: USER_FEATURE, useValue: config },
    { provide: USER_COMPANY_ID, useFactory: config.companyId },
    { provide: USER_CAN_MANAGE, useFactory: config.canManage },
    { provide: USER_LANGUAGE, useFactory: config.language ?? (() => signal<'en' | 'fa'>('en')) },
  ])
}

export function createUserRoutes(config: UserFeatureConfig): Routes {
  return [
    {
      path: config.path,
      canActivate: [config.canActivate ?? authGuard],
      providers: [provideUserFeature(config)],
      data: { breadcrumb: config.heading ?? 'Users' },
      children: [
        {
          path: '',
          pathMatch: 'full',
          loadComponent: () => import('./users-page').then(m => m.UsersPage),
        },
        {
          path: ':id',
          data: { breadcrumb: null },
          loadComponent: () => import('./user-detail-page').then(m => m.UserDetailPage),
        },
      ],
    },
  ]
}

export function userSearch(
  http: HttpClient,
  config: UserFeatureConfig,
  query: {
    companyId: number
    fullName: string
    nationalId: string
    pageNumber: number
    pageSize: number
  },
) {
  return http.post<UserSearchResponse>(`${config.apiUrl}/users/search`, query)
}

export function userDetail(http: HttpClient, config: UserFeatureConfig, id: number) {
  return http.get<{ result: UserDetail }>(`${config.apiUrl}/users/${id}`)
}

export interface SetUserPayload {
  readonly id: number
  readonly companyId: number
  readonly mobileNumber: string
  readonly phoneNumber: string | null
  readonly firstName: string | null
  readonly lastName: string | null
  readonly email: string | null
  readonly cityId: number
  readonly nationalId: string | null
  readonly address: string
  readonly postalCode: string | null
  readonly coordinate: { readonly lat: number; readonly lng: number } | null
  readonly profileImage?: UserProfileImagePayload
}

export interface UserProfileImagePayload {
  readonly name: string | null
  readonly extension: string | null
  readonly data: string | null
  readonly deleteCurrentImage: boolean
}

export function userProfileImagePayload(
  selection: UploadSelection,
): UserProfileImagePayload | undefined {
  if (selection.kind === 'keep') return undefined
  if (selection.kind === 'remove') {
    return { name: null, extension: null, data: null, deleteCurrentImage: true }
  }
  if (selection.kind !== 'replace') return undefined
  const upload = transportImageUpload(selection.file)
  return { name: selection.file.name, ...upload }
}

export const USER_IMAGE_FILE_TYPES = TRANSPORT_IMAGE_FILE_TYPES

export function updateUser(http: HttpClient, config: UserFeatureConfig, payload: SetUserPayload) {
  return http.put<{ result: UserDetail }>(`${config.apiUrl}/users`, payload)
}

export function deleteUser(http: HttpClient, config: UserFeatureConfig, id: number) {
  return http.delete(`${config.apiUrl}/users/${id}`)
}

export function userHttp() {
  return inject(HttpClient)
}
