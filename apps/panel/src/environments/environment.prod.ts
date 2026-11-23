import { productionEnvironment } from '@org/platform/config'

export const environment = {
  ...productionEnvironment,
  // panel-specific production overrides
} as const
