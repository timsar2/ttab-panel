import { computed, inject } from '@angular/core'
import { Route, Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import { createAuthRoutes } from '@org/auth-feature'
import { createWorkspaceRoutes } from '@org/transport-shell-feature'
import { PreferencesStore } from './preferences.store'

export interface PortalRoutesOptions {
  readonly brandName: string
  readonly featureRoutes?: Route[]
}

export function createPortalRoutes({ brandName, featureRoutes = [] }: PortalRoutesOptions): Routes {
  return [
    { path: '', pathMatch: 'full', redirectTo: 'login' },
    ...createAuthRoutes({ path: 'login', title: `${brandName} | Sign in` }),
    ...createWorkspaceRoutes({
      path: 'workspace',
      brand: brandName,
      loginUrl: '/login',
      navigation: () => {
        const preferences = inject(PreferencesStore)
        return computed(() => [
          {
            id: 'workspace',
            label: preferences.isRtl() ? 'فضای کاری' : 'Workspace',
            commands: ['/workspace'],
            exact: true,
          },
        ])
      },
      text: () => {
        const preferences = inject(PreferencesStore)
        return computed(() => {
          const fa = preferences.isRtl()
          return {
            navigation: fa ? `ناوبری ${brandName}` : `${brandName} navigation`,
            workspace: fa ? 'فضای کاری' : 'Workspace',
            administration: fa ? `سامانه ${brandName}` : `${brandName} portal`,
            signOut: fa ? 'خروج' : 'Sign out',
            heading: fa ? `به ${brandName} خوش آمدید` : `Welcome to ${brandName}`,
            description: fa
              ? `فضای کاری ${brandName} آماده است.`
              : `Your ${brandName.toLowerCase()} workspace is ready.`,
            chooseCompany: fa ? 'ورود به فضای کاری' : 'Open workspace',
          }
        })
      },
    }),
    ...(featureRoutes.length
      ? [{ path: '', canActivate: [authGuard], children: featureRoutes }]
      : []),
    { path: '**', redirectTo: 'login' },
  ]
}
