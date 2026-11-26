import { productionEnvironment, type ProductionEnvironment } from '@org/platform/config'

export const environment = {
  ...productionEnvironment,
  publicOrigin: 'https://driver.ttabline.com',
} as const satisfies ProductionEnvironment
