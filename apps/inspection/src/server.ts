import { createPlatformSsrServer } from '@org/platform/node'
import { environment } from '@org/platform'

const { reqHandler } = createPlatformSsrServer({
  appId: 'inspection',
  environment,
  moduleUrl: import.meta.url,
})

export { reqHandler }
