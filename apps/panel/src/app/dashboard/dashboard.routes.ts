import { computed, inject } from '@angular/core'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { PreferencesStore } from '@org/platform'
import { createDashboardRoutes } from '@org/panel-dashboard'
import { panelConfig } from '../panel.config'

export function createPanelDashboardRoutes() {
  return createDashboardRoutes({
    path: '',
    apiUrl: panelConfig.apiUrl,
    companyId: () => {
      const context = inject(CompanyContextStore)
      return computed(() => (context.status() === 'ready' ? (context.company()?.id ?? null) : null))
    },
    language: () => inject(PreferencesStore).language,
    neshanMapApiKey: panelConfig.neshanMapApiKey,
    neshanServiceApiKey: panelConfig.neshanServiceApiKey,
  })
}
