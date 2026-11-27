import { createPlatformCsrServer } from '@org/platform/node'
import { environment } from './environments/environment'

const { app } = createPlatformCsrServer({
  appId: 'driver',
  environment,
  moduleUrl: import.meta.url,
})

export { app }
