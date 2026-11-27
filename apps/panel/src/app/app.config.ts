import { ApplicationConfig, isDevMode } from '@angular/core'
import { providePlatformApp } from '@org/platform'
import { appRoutes } from './app.routes'
import { panelConfig } from './panel.config'
import { provideServiceWorker } from '@angular/service-worker'

export const appConfig: ApplicationConfig = {
  providers: [
    ...providePlatformApp({
      id: 'panel',
      brandName: panelConfig.brandName,
      auth: { afterLoginUrl: panelConfig.afterLoginUrl, loginField: 'email' },
      routes: appRoutes,
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
}
