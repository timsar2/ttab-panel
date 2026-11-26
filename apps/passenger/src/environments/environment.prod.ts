import { productionEnvironment, type ProductionEnvironment } from '@org/platform/config'

export const environment = {
  ...productionEnvironment,
  publicOrigin: 'https://passenger.ttabline.com',
} as const satisfies ProductionEnvironment
