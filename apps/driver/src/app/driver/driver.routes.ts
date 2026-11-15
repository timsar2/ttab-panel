import { inject } from '@angular/core'
import { PreferencesStore } from '@org/platform'
import { SessionStore } from '@org/platform'
import { createDriverLoginRoutes, createDriverRoutes } from '@org/driver-pwa-feature'

const loginRoutes = createDriverLoginRoutes(() => {
  const preferences = inject(PreferencesStore)
  return {
    language: preferences.language,
    setLanguage: (language: 'fa' | 'en') => {
      preferences.setLanguage(language)
      try {
        localStorage.setItem('driver.language.v1', language)
      } catch {
        /* Preferences storage is optional. */
      }
    },
  }
})

const featureRoutes = createDriverRoutes(() => {
  const session = inject(SessionStore)
  const preferences = inject(PreferencesStore)
  return {
    language: preferences.language,
    identity: () => {
      const user = session.user()
      return {
        driverId: user?.businessEntityId ?? null,
        companyId: user?.companyId ?? null,
        userId: user?.businessEntityId ?? null,
      }
    },
  }
})

export const driverRoutes = [...loginRoutes, ...featureRoutes]
