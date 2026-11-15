import { inject } from '@angular/core'
import { PreferencesStore } from '@org/platform'
import { SessionStore } from '@org/platform'
import { createPassengerLoginRoutes, createPassengerRoutes } from '@org/passenger-pwa-feature'

const loginRoutes = createPassengerLoginRoutes(() => {
  const preferences = inject(PreferencesStore)
  return {
    language: preferences.language,
    setLanguage: (language: 'fa' | 'en') => {
      preferences.setLanguage(language)
      try {
        localStorage.setItem('passenger.language.v1', language)
      } catch {
        /* Preferences storage is optional. */
      }
    },
  }
})

const featureRoutes = createPassengerRoutes(() => {
  const session = inject(SessionStore)
  const preferences = inject(PreferencesStore)
  return {
    language: preferences.language,
    identity: () => {
      const user = session.user()
      return {
        passengerId: user?.businessEntityId ?? null,
        companyId: user?.companyId ?? null,
        userId: user?.businessEntityId ?? null,
      }
    },
  }
})

export const passengerRoutes = [...loginRoutes, ...featureRoutes]
