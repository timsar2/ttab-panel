import { ApplicationConfig } from '@angular/core'
import { providePlatformApp } from '@org/platform'
import { appRoutes } from './app.routes'

export const appConfig: ApplicationConfig = {
  providers: providePlatformApp({
    id: 'driver',
    brandName: 'Driver',
    routes: appRoutes,
  }),
}
