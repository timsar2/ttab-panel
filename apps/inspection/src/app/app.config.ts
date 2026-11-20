import { ApplicationConfig } from '@angular/core'
import { providePlatformApp } from '@org/platform'
import { appRoutes } from './app.routes'

export const appConfig: ApplicationConfig = {
  providers: providePlatformApp({
    id: 'inspection',
    brandName: 'Inspection',
    auth: { afterLoginUrl: '/inspections', loginField: 'email' },
    routes: appRoutes,
  }),
}
