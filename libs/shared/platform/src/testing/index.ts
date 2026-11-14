import { provideHttpClientTesting } from '@angular/common/http/testing'
import { EnvironmentProviders, Provider } from '@angular/core'
import { PlatformAppOptions, providePlatformApp } from '../lib'

/** Use after the app providers so HTTP tests override the scoped backend. */
export function providePlatformTestApp(
  options: PlatformAppOptions,
): Array<Provider | EnvironmentProviders> {
  return [...providePlatformApp(options), provideHttpClientTesting()]
}
