import { computed, inject, signal } from '@angular/core'
import { SessionStore, PreferencesStore } from '@org/platform'
import { createDepartureTimeRoutes } from '@org/panel-departure-times'
import { departureCompanyId } from '@org/transport-departure-times-data-access'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { of } from 'rxjs'

export function createPanelShiftTimeRoutes() {
  return [
    {
      path: 'add',
      pathMatch: 'full' as const,
      redirectTo: 'new',
    },
    {
      path: 'detail/:shiftTimeId',
      pathMatch: 'full' as const,
      redirectTo: ':shiftTimeId/edit',
    },
    ...createDepartureTimeRoutes({
      path: '',
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
      access: () => {
        const context = inject(CompanyContextStore)
        const session = inject(SessionStore)
        return request =>
          of(
            (request.action === 'list' ||
              request.action === 'detail' ||
              request.action === 'update') &&
              !!session.user() &&
              context.status() === 'ready' &&
              context.company()?.id === request.companyId,
          )
      },
      canManage: () => signal(true),
      canCreate: () => signal(false),
      canUpdate: () => signal(true),
      deniedMessage: {
        en: 'Departure-time access is not enabled until company and entity permissions are approved.',
        fa: 'دسترسی به زمان‌های حرکت تا زمان تأیید مجوزهای شرکت و موجودیت فعال نشده است.',
      },
    }),
  ]
}
