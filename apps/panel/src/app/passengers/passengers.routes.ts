import { computed, inject } from '@angular/core'
import { createPassengerRoutes } from '@org/panel-passengers'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { PreferencesStore } from '../core/preferences/preferences.store'

/** Adapt company and locale state into the reusable passenger workflow. */
export function createPanelPassengerRoutes() {
  return createPassengerRoutes({
    apiUrl: '/api',
    language: () => inject(PreferencesStore).language,
    companyId: () => {
      const context = inject(CompanyContextStore)
      return computed(() => (context.status() === 'ready' ? (context.company()?.id ?? null) : null))
    },
    endpoints: {
      search: 'v1/passengers/search',
      directions: 'v1/directions/search',
      shifts: 'v1/shifts/get-shift',
      stations: 'v1/stations/search',
      lines: 'v1/lines/search',
      assign: 'v1/companys/batch',
    },
  })
}
