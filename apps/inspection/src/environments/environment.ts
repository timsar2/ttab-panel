import { isDevMode } from '@angular/core'
import { developmentEnvironment, productionEnvironment } from '@org/platform/config'

export const environment = isDevMode() ? developmentEnvironment : productionEnvironment
