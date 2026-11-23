import { developmentEnvironment } from '@org/platform/config'

export const environment = {
  ...developmentEnvironment,
  // panel-specific development overrides
} as const
