import { createPlatformSsrServer } from '@org/platform/node'
import { environment } from '@org/platform'

const { reqHandler } = createPlatformSsrServer({
  appId: 'driver',
  environment,
  moduleUrl: import.meta.url,
})

export { reqHandler }
