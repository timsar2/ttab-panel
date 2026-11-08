import { DOCUMENT } from '@angular/common'
import {
  EnvironmentProviders,
  InjectionToken,
  Signal,
  inject,
  makeEnvironmentProviders,
  signal,
} from '@angular/core'

export interface AuthAppearance {
  direction: Signal<'rtl' | 'ltr'>
  theme: Signal<'light' | 'dark'>
  toggleDirection?: () => void
  toggleTheme?: () => void
}

export interface AuthFeatureConfig {
  brandName: string
  footer?: string
}

export const AUTH_FEATURE_CONFIG = new InjectionToken<AuthFeatureConfig>('AUTH_FEATURE_CONFIG')

export const AUTH_APPEARANCE = new InjectionToken<AuthAppearance>('AUTH_APPEARANCE', {
  providedIn: 'root',
  factory: () => {
    const root = inject(DOCUMENT).documentElement
    const direction =
      root.dir === 'ltr' || (!root.dir && root.lang.startsWith('en')) ? 'ltr' : 'rtl'
    return {
      direction: signal<'rtl' | 'ltr'>(direction).asReadonly(),
      theme: signal<'light' | 'dark'>(
        root.classList.contains('dark') ? 'dark' : 'light',
      ).asReadonly(),
    }
  },
})

export function provideAuthFeature(config: AuthFeatureConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AUTH_FEATURE_CONFIG, useValue: Object.freeze({ ...config }) },
  ])
}
