import { Route } from '@angular/router'
import { computed, inject, signal } from '@angular/core'
import { createAuthRoutes } from '@org/auth-feature'
import { createCompanyRoutes } from '@org/transport-company-feature'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { createPeopleRoutes } from '@org/panel-people'
import { createDepartureTimeRoutes } from '@org/panel-departure-times'
import { departureCompanyId } from '@org/transport-departure-times-data-access'
import { peopleCompanyId } from '@org/transport-people-data-access'
import { createCompanyShellRoutes, createWorkspaceRoutes } from '@org/transport-shell-feature'
import { of } from 'rxjs'
import { PreferencesStore } from './core/preferences/preferences.store'

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  ...createAuthRoutes({ path: 'login', title: 'Panel | Sign in' }),
  { path: 'auth/login', pathMatch: 'full', redirectTo: 'login' },
  { path: 'companys', pathMatch: 'full', redirectTo: 'companies' },
  { path: 'companys/add', pathMatch: 'full', redirectTo: 'companies/new' },
  {
    path: 'companys/detail/:companyId',
    pathMatch: 'full',
    redirectTo: 'companies/:companyId/edit',
  },
  ...createCompanyRoutes({
    path: 'companies',
    apiUrl: '/api/v1',
    heading: 'Companies',
    actionLabel: 'Open workspace',
    actionCommands: company => ['/client', company.id],
    editor: {
      geographyApiUrl: '/api',
      maxLogoBytes: 256 * 1024,
      canCreate: roles => roles.some(role => role === 'Admin' || role === 'Manager'),
      canEdit: roles => roles.some(role => role === 'Admin' || role === 'Manager'),
    },
  }),
  ...createCompanyShellRoutes(
    {
      path: 'client/:companyId',
      companyParam: 'companyId',
      apiUrl: '/api/v1',
      brand: 'Panel',
      companiesCommands: ['/companies'],
      loginUrl: '/login',
      links: [
        { path: 'people', label: 'People' },
        { path: 'departure-times', label: 'Departure times' },
      ],
    },
    [
      { path: 'shift-time', pathMatch: 'full', redirectTo: 'departure-times' },
      { path: 'shift-time/add', pathMatch: 'full', redirectTo: 'departure-times/new' },
      { path: 'shift-time/detail/:id', pathMatch: 'full', redirectTo: 'departure-times/:id/edit' },
      ...createPeopleRoutes({
        path: 'people',
        apiUrl: '/api',
        company: () => {
          const context = inject(CompanyContextStore)
          return computed(() => {
            const company = context.company()
            return context.status() === 'ready' && company ? peopleCompanyId(company.id) : null
          })
        },
        // A company detail read is not proof of Person access; keep live reads gated.
        access: () => () => of(false),
        deniedMessage:
          'People access is not enabled until company membership and person-read permissions are approved.',
      }),
      ...createDepartureTimeRoutes({
        path: 'departure-times',
        apiUrl: '/api',
        endpoints: { collection: 'v1/shiftTimes', save: 'v1/shiftTimes/set-shift-time' },
        company: () => {
          const context = inject(CompanyContextStore)
          return computed(() => {
            const company = context.company()
            return context.status() === 'ready' && company ? departureCompanyId(company.id) : null
          })
        },
        access: () => () => of(false),
        canManage: () => signal(false),
        deniedMessage:
          'Departure-time access is not enabled until company and entity permissions are approved.',
      }),
    ],
  ),
  ...createWorkspaceRoutes({
    path: 'workspace',
    brand: 'Panel',
    companiesCommands: ['/companies'],
    loginUrl: '/login',
    text: () => {
      const preferences = inject(PreferencesStore)
      return computed(() =>
        preferences.isRtl()
          ? {
              navigation: 'ناوبری',
              workspace: 'فضای کاری',
              administration: 'پنل مدیریت',
              signOut: 'خروج',
              heading: 'ورود با موفقیت انجام شد',
              description: 'برای ورود به فضای کاری، یک شرکت را انتخاب کنید.',
              chooseCompany: 'انتخاب شرکت',
            }
          : {
              navigation: 'Navigation',
              workspace: 'Workspace',
              administration: 'Administration',
              signOut: 'Sign out',
              heading: 'You are signed in',
              description: 'Choose a company to open its workspace.',
              chooseCompany: 'Choose a company',
            },
      )
    },
  }),
  { path: '**', redirectTo: 'login' },
]
