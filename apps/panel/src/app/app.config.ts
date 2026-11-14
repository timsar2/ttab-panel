import { ApplicationConfig } from '@angular/core'
import { providePlatformApp } from '@org/platform'
import { appRoutes } from './app.routes'
import { panelConfig } from './panel.config'

export const appConfig: ApplicationConfig = {
  providers: providePlatformApp({
    id: 'panel',
    brandName: panelConfig.brandName,
    auth: panelConfig,
    routes: appRoutes,
  }),
}
