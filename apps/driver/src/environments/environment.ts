import { developmentEnvironment, type DevelopmentEnvironment } from '@org/platform/config'

export const environment = {
  ...developmentEnvironment,
} as const satisfies DevelopmentEnvironment
