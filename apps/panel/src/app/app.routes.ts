import { Route } from '@angular/router'
import { computed, inject, signal } from '@angular/core'
import { createAuthRoutes, type LayoutNavItem } from '@org/platform'
import { createCompanyRoutes } from '@org/transport-company-feature'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { createPeopleRoutes } from '@org/panel-people'
import { createDepartureTimeRoutes } from '@org/panel-departure-times'
import { SessionStore } from '@org/platform'
import { departureCompanyId } from '@org/transport-departure-times-data-access'
import { peopleCompanyId } from '@org/transport-people-data-access'
import { createCompanyShellRoutes } from '@org/platform'
import { of } from 'rxjs'
import { PreferencesStore } from '@org/platform'
import { CompanyAdminShell, PANEL_ADMIN_NAVIGATION } from './company-admin-shell'
import {
  lucideLayoutDashboard,
  lucideBuilding2,
  lucideUsers,
  lucideIdCard,
  lucideBus,
  lucideClock,
  lucideCalendarDays,
  lucideRoute,
  lucideMapPin,
  lucideWaypoints,
  lucideUserRoundCheck,
  lucideMap,
  lucideLifeBuoy,
  lucideUserRoundCog,
  lucideClipboardCheck,
} from '@ng-icons/lucide'

export function navigationFor(
  companyId: number | null,
  rtl: boolean,
  roles: readonly string[] = [],
): readonly LayoutNavItem[] {
  const choose = rtl ? 'ابتدا یک شرکت انتخاب کنید' : 'Choose a company first'
  const planned = rtl ? 'به‌زودی' : 'Not implemented yet'
  const administration = rtl ? 'مدیریت' : 'Administration'
  const operations = rtl ? 'عملیات حمل‌ونقل' : 'Transport operations'
  const scheduling = rtl ? 'برنامه‌ریزی' : 'Scheduling'
  const items: LayoutNavItem[] = [
    {
      id: 'companies',
      label: rtl ? 'شرکت‌ها' : 'Companies',
      icon: lucideBuilding2,
      group: administration,
      commands: ['/companies'],
    },
    {
      id: 'people',
      label: rtl ? 'افراد' : 'People',
      icon: lucideUsers,
      group: operations,
      commands: companyId ? ['/client', companyId, 'people'] : undefined,
      hint: choose,
    },
    {
      id: 'dashboard',
      label: rtl ? 'داشبورد' : 'Dashboard',
      icon: lucideLayoutDashboard,
      group: operations,
      commands: companyId ? ['/client', companyId, 'dashboard'] : undefined,
      hint: companyId ? undefined : choose,
    },
    {
      id: 'users',
      label: rtl ? 'کاربران' : 'Users',
      icon: lucideUsers,
      group: administration,
      commands: companyId ? ['/client', companyId, 'users'] : undefined,
      hint: choose,
    },
    {
      id: 'drivers',
      label: rtl ? 'رانندگان' : 'Drivers',
      icon: lucideIdCard,
      group: operations,
      commands: companyId ? ['/client', companyId, 'drivers'] : undefined,
      hint: choose,
    },
    {
      id: 'vehicles',
      label: rtl ? 'خودروها' : 'Vehicles',
      icon: lucideBus,
      group: operations,
      commands: companyId ? ['/client', companyId, 'vehicles'] : undefined,
      hint: choose,
    },
    {
      id: 'routes',
      label: rtl ? 'مسیرها' : 'Routes',
      icon: lucideRoute,
      group: operations,
      commands: companyId ? ['/client', companyId, 'direction'] : undefined,
      hint: choose,
    },
    {
      id: 'lines',
      label: rtl ? 'خطوط' : 'Lines',
      icon: lucideWaypoints,
      group: operations,
      hint: planned,
    },
    {
      id: 'stations',
      label: rtl ? 'ایستگاه‌ها' : 'Stations',
      icon: lucideMapPin,
      group: operations,
      hint: planned,
    },
    {
      id: 'assignments',
      label: rtl ? 'تخصیص رانندگان' : 'Driver assignments',
      icon: lucideUserRoundCheck,
      group: operations,
      hint: planned,
    },
    {
      id: 'driver-line',
      label: rtl ? 'خط راننده' : 'Driver-line assignments',
      icon: lucideUserRoundCog,
      group: operations,
      commands: companyId ? ['/client', companyId, 'driver-line'] : undefined,
      hint: choose,
    },
    {
      id: 'passengers',
      label: rtl ? 'مسافران' : 'Passengers',
      icon: lucideUsers,
      group: operations,
      commands: companyId ? ['/client', companyId, 'passengers'] : undefined,
      hint: companyId ? undefined : choose,
    },
    {
      id: 'departure-times',
      label: rtl ? 'زمان‌های حرکت' : 'Departure times',
      icon: lucideClock,
      group: scheduling,
      commands: companyId ? ['/client', companyId, 'shift-time'] : undefined,
      hint: companyId ? undefined : choose,
    },
    {
      id: 'shifts',
      label: rtl ? 'شیفت‌ها' : 'Shifts',
      icon: lucideCalendarDays,
      group: scheduling,
      commands: companyId ? ['/client', companyId, 'shift'] : undefined,
      hint: companyId ? undefined : choose,
    },
    {
      id: 'tracking',
      label: rtl ? 'ردیابی زنده' : 'Live tracking',
      icon: lucideMap,
      group: rtl ? 'نظارت و پشتیبانی' : 'Monitoring and support',
      groupCommands: companyId ? ['/client', companyId, 'support'] : undefined,
      hint: planned,
    },
    {
      id: 'support',
      label: rtl ? 'درخواست‌های پشتیبانی' : 'Support requests',
      icon: lucideLifeBuoy,
      group: rtl ? 'نظارت و پشتیبانی' : 'Monitoring and support',
      commands: companyId ? ['/client', companyId, 'support'] : undefined,
      hint: companyId ? undefined : choose,
    },
    {
      id: 'inspections',
      label: rtl ? 'بازرسی‌ها' : 'Inspections',
      icon: lucideClipboardCheck,
      group: rtl ? 'نظارت و پشتیبانی' : 'Monitoring and support',
      commands: companyId ? ['/client', companyId, 'inspections'] : undefined,
      hint: companyId ? undefined : choose,
    },
  ]
  return items.filter(item => {
    if (item.id === 'inspections') return roles.some(role => role === 'Admin' || role === 'Manager')
    if (item.id === 'support')
      return roles.some(role => ['Admin', 'Manager', 'Operator'].includes(role))
    return true
  })
}

function panelNavigation() {
  const preferences = inject(PreferencesStore)
  const context = inject(CompanyContextStore, { optional: true })
  const session = inject(SessionStore)
  return computed(() =>
    navigationFor(
      context?.status() === 'ready' ? (context.company()?.id ?? null) : null,
      preferences.isRtl(),
      session.user()?.roles,
    ),
  )
}

function companyShellTranslations() {
  const preferences = inject(PreferencesStore)
  return computed<Readonly<Record<string, string | undefined>>>(() =>
    preferences.isRtl()
      ? {
          'Company navigation': 'ناوبری شرکت',
          Companies: 'شرکت‌ها',
          'Choose a company': 'انتخاب شرکت',
          'Switch company': 'تغییر شرکت',
          'Company workspace': 'فضای کاری شرکت',
          'Sign out': 'خروج',
          Breadcrumbs: 'مسیر راهنما',
          'Signed-in account': 'حساب واردشده',
          Drivers: 'رانندگان',
          Passengers: 'مسافران',
          'Driver-line assignments': 'خط راننده',
          Routes: 'مسیرها',
          Route: 'مسیر',
          Vehicles: 'خودروها',
          Vehicle: 'خودرو',
          Users: 'کاربران',
          User: 'کاربر',
          user: 'کاربران',
          People: 'افراد',
          'Departure times': 'زمان‌های حرکت',
          'Support requests': 'درخواست‌های پشتیبانی',
          Dashboard: 'داشبورد',
          'Live tracking': 'ردیابی زنده',
          Inspections: 'بازرسی‌ها',
          Details: 'جزئیات',
          Shifts: 'شیفت‌ها',
          'Shift details': 'جزئیات شیفت',
          'Shift list': 'فهرست شیفت‌ها',
          'Shift groups': 'گروه‌های شیفت',
          'Shift group': 'گروه شیفت',
          'Add shift': 'افزودن شیفت',
          'Edit shift': 'ویرایش شیفت',
          'Create shift group': 'ایجاد گروه شیفت',
          'Shift type': 'نوع شیفت',
          'Shift name': 'نام شیفت',
          'Start time': 'ساعت شروع',
          'End time': 'ساعت پایان',
          Create: 'ایجاد',
          Edit: 'ویرایش',
        }
      : {},
  )
}

function panelCompanyRoutes(routes: Route[]): Route[] {
  const list = routes.find(route => route.path === 'companies')
  if (!list) throw new Error('The panel company list route is required.')
  const editors = routes
    .filter(route => route.path?.startsWith('companies/'))
    .map(route => {
      const path = route.path!.slice('companies/'.length)
      return {
        ...route,
        path,
        data: {
          ...route.data,
          breadcrumb: path === 'new' ? 'Create company' : 'Edit company',
        },
      }
    })

  return [
    {
      path: 'companies',
      component: CompanyAdminShell,
      providers: [{ provide: PANEL_ADMIN_NAVIGATION, useFactory: panelNavigation }],
      children: [...editors, { ...list, path: '', data: { ...list.data, breadcrumb: null } }],
    },
  ]
}

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'companies' },
  ...createAuthRoutes({ path: 'login', title: 'Panel | Sign in' }),
  { path: 'auth/login', pathMatch: 'full', redirectTo: 'login' },
  { path: 'companys', pathMatch: 'full', redirectTo: 'companies' },
  { path: 'companys/add', pathMatch: 'full', redirectTo: 'companies/new' },
  {
    path: 'companys/detail/:companyId',
    pathMatch: 'full',
    redirectTo: 'companies/:companyId/edit',
  },
  ...panelCompanyRoutes(
    createCompanyRoutes({
      path: 'companies',
      apiUrl: '/api/v1',
      language: () => inject(PreferencesStore).language,
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
  ),
  ...createCompanyShellRoutes(
    {
      path: 'client/:companyId',
      companyParam: 'companyId',
      apiUrl: '/api/v1',
      brand: 'Panel',
      companiesCommands: ['/companies'],
      loginUrl: '/login',
      navigation: panelNavigation,
      translations: companyShellTranslations,
      links: [
        { path: 'people', label: 'People' },
        { path: 'users', label: 'Users' },
        { path: 'drivers', label: 'Drivers' },
        { path: 'passengers', label: 'Passengers' },
        { path: 'driver-line', label: 'Driver-line assignments' },
        { path: 'vehicles', label: 'Vehicles' },
        { path: 'direction', label: 'Routes' },
        { path: 'departure-times', label: 'Departure times' },
        { path: 'support', label: 'Support requests' },
        { path: 'dashboard', label: 'Dashboard' },
        { path: 'shift', label: 'Shifts' },
        { path: 'inspections', label: 'Inspections' },
      ],
    },
    [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'passenger', pathMatch: 'full', redirectTo: 'passengers' },
      { path: 'passenger/add', pathMatch: 'full', redirectTo: 'passengers/add' },
      {
        path: 'shift-time',
        loadChildren: () =>
          import('./feature/shift-time/shift-time.routes').then(({ createPanelShiftTimeRoutes }) =>
            createPanelShiftTimeRoutes(),
          ),
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./dashboard/dashboard.routes').then(({ createPanelDashboardRoutes }) =>
            createPanelDashboardRoutes(),
          ),
      },
      {
        path: 'support',
        loadChildren: () =>
          import('./support/support.routes').then(({ createPanelSupportRoutes }) =>
            createPanelSupportRoutes(),
          ),
      },
      {
        path: 'inspections',
        loadChildren: () =>
          import('./inspection/inspection.routes').then(({ createPanelInspectionRoutes }) =>
            createPanelInspectionRoutes(),
          ),
      },
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
        language: () => inject(PreferencesStore).language,
        company: () => {
          const context = inject(CompanyContextStore)
          return computed(() => {
            const company = context.company()
            return context.status() === 'ready' && company ? departureCompanyId(company.id) : null
          })
        },
        access: () => () => of(false),
        canManage: () => signal(false),
        deniedMessage: {
          en: 'Departure-time access is not enabled until company and entity permissions are approved.',
          fa: 'دسترسی به زمان‌های حرکت تا زمان تأیید مجوزهای شرکت و موجودیت فعال نشده است.',
        },
      }),
      {
        path: 'shift',
        loadChildren: () =>
          import('./feature/shift/shift.routes').then(({ createPanelShiftRoutes }) =>
            createPanelShiftRoutes(),
          ),
      },
      {
        path: 'users',
        loadChildren: () =>
          import('./features/user/user.routes').then(({ createPanelUserRoutes }) =>
            createPanelUserRoutes(),
          ),
      },
      {
        path: 'direction',
        loadChildren: () =>
          import('./routes/routes.routes').then(({ createPanelRouteRoutes }) =>
            createPanelRouteRoutes(),
          ),
      },
      {
        path: 'vehicles',
        loadChildren: () =>
          import('./vehicles/vehicle.routes').then(({ createPanelVehicleRoutes }) =>
            createPanelVehicleRoutes(),
          ),
      },
      {
        path: 'drivers',
        loadChildren: () =>
          import('./driver/driver.routes').then(({ createPanelDriverRoutes }) =>
            createPanelDriverRoutes(),
          ),
      },
      {
        path: 'passengers',
        loadChildren: () =>
          import('./passengers/passengers.routes').then(({ createPanelPassengerRoutes }) =>
            createPanelPassengerRoutes(),
          ),
      },
      {
        path: 'driver-line',
        loadChildren: () =>
          import('./feature/driver-line/driver-line.routes').then(
            ({ createPanelDriverLineRoutes }) => createPanelDriverLineRoutes(),
          ),
      },
    ],
  ),
  { path: '**', redirectTo: 'login' },
]
