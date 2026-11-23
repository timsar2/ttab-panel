import { productionEnvironment } from '@org/platform/config'

export const environment = {
  ...productionEnvironment,
  // panel-specific development overrides
} as const
