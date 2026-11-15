import { InjectionToken, Signal } from '@angular/core'

export const PASSENGER_LOGIN_LANGUAGE = new InjectionToken<Signal<'fa' | 'en'>>(
  'PASSENGER_LOGIN_LANGUAGE',
)
export const PASSENGER_SET_LANGUAGE = new InjectionToken<(language: 'fa' | 'en') => void>(
  'PASSENGER_SET_LANGUAGE',
)
