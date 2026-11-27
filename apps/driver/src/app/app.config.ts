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
import { driverAuthBackend } from './driver/mobile-auth.backend'
import { ShiftTimesStore } from '@org/transport-scheduling-data-access'
import { provideServiceWorker } from '@angular/service-worker'

export const appConfig: ApplicationConfig = {
  providers: [
    ...providePlatformApp({
      id: 'driver',
      brandName: 'Driver',
      auth: { afterLoginUrl: '/driver/route-selection' },
      routes: appRoutes,
    }),
    { provide: AuthBackend, useFactory: driverAuthBackend },
    provideAppInitializer(() => {
      inject(ShiftTimesStore)
    }),
    provideAppInitializer(() => {
      const preferences = inject(PreferencesStore)
      afterNextRender(() => {
        try {
          const language = localStorage.getItem('driver.language.v1')
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
