import { createPlatformSsrServer } from '@org/platform/node'
import { environment } from './environments/environment'

const { reqHandler } = createPlatformSsrServer({
  appId: 'passenger',
  environment,
  moduleUrl: import.meta.url,
})

export { reqHandler }
