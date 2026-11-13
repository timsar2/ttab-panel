import { InjectionToken, Signal, makeEnvironmentProviders, signal } from '@angular/core'
import { Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import { HttpClient } from '@angular/common/http'
import { inject } from '@angular/core'

export interface UserFeatureConfig {
  readonly path: string
  readonly apiUrl: string
  readonly companyId: () => Signal<number | null>
  readonly canManage: () => Signal<boolean>
  readonly language?: () => Signal<'en' | 'fa'>
  readonly heading?: string
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
  readonly lat: number
  readonly lng: number
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
      canActivate: [authGuard],
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
  readonly coordinate: { readonly lat: number; readonly lng: number }
}

export function updateUser(http: HttpClient, config: UserFeatureConfig, payload: SetUserPayload) {
  return http.put<{ result: UserDetail }>(`${config.apiUrl}/users`, payload)
}

export function userHttp() {
  return inject(HttpClient)
}
