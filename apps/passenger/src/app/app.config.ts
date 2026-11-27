import {
  ApplicationConfig,
  afterNextRender,
  inject,
  provideAppInitializer,
  isDevMode,
} from '@angular/core'
import { providePlatformApp } from '@org/platform'
import { PreferencesStore } from '@org/platform'
import { appRoutes } from './app.routes'
import { AuthBackend } from '@org/platform'
import { passengerAuthBackend } from './passenger/mobile-auth.backend'
import { ShiftTimesStore } from '@org/transport-scheduling-data-access'
import { provideServiceWorker } from '@angular/service-worker'

export const appConfig: ApplicationConfig = {
  providers: [
    ...providePlatformApp({
      id: 'passenger',
      brandName: 'Passenger',
      auth: { afterLoginUrl: '/passenger/home' },
      routes: appRoutes,
    }),
    { provide: AuthBackend, useFactory: passengerAuthBackend },
    provideAppInitializer(() => {
      inject(ShiftTimesStore)
    }),
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
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
}
