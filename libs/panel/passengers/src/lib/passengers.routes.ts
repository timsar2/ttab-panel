import { InjectionToken, Signal, makeEnvironmentProviders } from '@angular/core'
import { Route } from '@angular/router'
import { provideTransportHttp } from '@org/transport-http'
import { PassengerPage } from './ui/passenger-page'

export interface PassengerFeatureConfig {
  readonly apiUrl: string
  readonly language: () => Signal<'fa' | 'en'>
  readonly companyId: () => Signal<number | null>
  readonly endpoints: {
    readonly search: string
    readonly directions: string
    readonly shifts: string
    readonly stations: string
    readonly lines: string
    readonly assign: string
  }
}

export const PASSENGER_FEATURE = new InjectionToken<PassengerFeatureConfig>('PASSENGER_FEATURE')
export const PASSENGER_COMPANY = new InjectionToken<Signal<number | null>>('PASSENGER_COMPANY')
export const PASSENGER_LANGUAGE = new InjectionToken<Signal<'fa' | 'en'>>('PASSENGER_LANGUAGE')

function passengerProviders(config: PassengerFeatureConfig) {
  return [
    provideTransportHttp({ apiUrl: config.apiUrl }),
    { provide: PASSENGER_FEATURE, useValue: config },
    { provide: PASSENGER_COMPANY, useFactory: config.companyId },
    { provide: PASSENGER_LANGUAGE, useFactory: config.language },
  ]
}

export function createPassengerRoutes(config: PassengerFeatureConfig): Route[] {
  return [
    {
      path: '',
      component: PassengerPage,
      providers: passengerProviders(config),
    },
    {
      path: 'add',
      component: PassengerPage,
      data: { assignmentMode: 'add' },
      providers: passengerProviders(config),
    },
  ]
}

export function providePassengerFeature(config: PassengerFeatureConfig) {
  return makeEnvironmentProviders(passengerProviders(config))
}
