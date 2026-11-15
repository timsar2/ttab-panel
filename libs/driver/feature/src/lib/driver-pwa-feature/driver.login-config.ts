import { InjectionToken, Signal } from '@angular/core'

export const DRIVER_LOGIN_LANGUAGE = new InjectionToken<Signal<'fa' | 'en'>>(
  'DRIVER_LOGIN_LANGUAGE',
)
export const DRIVER_SET_LANGUAGE = new InjectionToken<(language: 'fa' | 'en') => void>(
  'DRIVER_SET_LANGUAGE',
)
