import { createPlatformCsrServer } from '@org/platform/node'
import { environment } from './environments/environment'

const { app } = createPlatformCsrServer({
  appId: 'panel',
  environment,
  moduleUrl: import.meta.url,
})

export { app }
