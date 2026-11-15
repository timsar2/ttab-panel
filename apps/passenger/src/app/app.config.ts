import { ApplicationConfig, afterNextRender, inject, provideAppInitializer } from '@angular/core'
import { providePlatformApp } from '@org/platform'
import { PreferencesStore } from '@org/platform'
import { appRoutes } from './app.routes'
import { AuthBackend } from '@org/platform'
import { passengerAuthBackend } from './passenger/mobile-auth.backend'

export const appConfig: ApplicationConfig = {
  providers: [
    ...providePlatformApp({
      id: 'passenger',
      brandName: 'Passenger',
      auth: { mode: 'cookie', apiUrl: '/api', afterLoginUrl: '/passenger/home' },
      routes: appRoutes,
    }),
    { provide: AuthBackend, useFactory: passengerAuthBackend },
    provideAppInitializer(() => {
      const preferences = inject(PreferencesStore)
      afterNextRender(() => {
        try {
          const language = localStorage.getItem('passenger.language.v1')
          if (language === 'fa' || language === 'en') preferences.setLanguage(language)
        } catch {
          /* Browser preferences are optional and stay at the shared default. */
        }
      })
    }),
  ],
}
