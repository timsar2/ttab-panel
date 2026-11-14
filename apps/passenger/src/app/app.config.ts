import { ApplicationConfig } from '@angular/core'
import { providePlatformApp } from '@org/platform'
import { appRoutes } from './app.routes'

export const appConfig: ApplicationConfig = {
  providers: providePlatformApp({
    id: 'passenger',
    brandName: 'Passenger',
    routes: appRoutes,
  }),
}
