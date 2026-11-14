import { createPlatformServerRoutes } from '@org/platform/node'

export const serverRoutes = createPlatformServerRoutes({
  clientPaths: ['companies', 'companies/**', 'companys', 'companys/**', 'client/**'],
})
