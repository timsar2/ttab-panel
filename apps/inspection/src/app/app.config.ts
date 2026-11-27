import { ApplicationConfig, isDevMode } from '@angular/core'
import { providePlatformApp } from '@org/platform'
import { appRoutes } from './app.routes'
import { provideServiceWorker } from '@angular/service-worker'

export const appConfig: ApplicationConfig = {
  providers: [
    ...providePlatformApp({
      id: 'inspection',
      brandName: 'Inspection',
      auth: { afterLoginUrl: '/inspections', loginField: 'email' },
      routes: appRoutes,
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
}
