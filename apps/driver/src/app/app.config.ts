import { ApplicationConfig, afterNextRender, inject, provideAppInitializer } from '@angular/core'
import { providePlatformApp } from '@org/platform'
import { PreferencesStore } from '@org/platform'
import { appRoutes } from './app.routes'
import { AuthBackend } from '@org/platform'
import { driverAuthBackend } from './driver/mobile-auth.backend'

export const appConfig: ApplicationConfig = {
  providers: [
    ...providePlatformApp({
      id: 'driver',
      brandName: 'Driver',
      auth: { mode: 'cookie', apiUrl: '/api', afterLoginUrl: '/driver/route-selection' },
      routes: appRoutes,
    }),
    { provide: AuthBackend, useFactory: driverAuthBackend },
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
  ],
}
