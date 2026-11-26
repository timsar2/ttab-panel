import { createPlatformSsrServer } from '@org/platform/node'
import { environment } from './environments/environment'

const { reqHandler } = createPlatformSsrServer({
  appId: 'panel',
  environment,
  moduleUrl: import.meta.url,
})

export { reqHandler }
