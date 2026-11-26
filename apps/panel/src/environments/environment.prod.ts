import { productionEnvironment, type ProductionEnvironment } from '@org/platform/config'

export const environment = {
  ...productionEnvironment,
  publicOrigin: 'https://app.ttabline.com',
} as const satisfies ProductionEnvironment
