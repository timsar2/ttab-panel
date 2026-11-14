import { createPlatformServerConfig } from '@org/platform/node'
import { appConfig } from './app.config'
import { serverRoutes } from './app.routes.server'

export const config = createPlatformServerConfig(appConfig, serverRoutes)
