import {
  EnvironmentProviders,
  InjectionToken,
  Provider,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core'
import { Directionality } from '@angular/cdk/bidi'
import {
  Routes,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router'
import {
  provideClientHydration,
  withEventReplay,
  withNoHttpTransferCache,
} from '@angular/platform-browser'
import { AUTH_APPEARANCE, provideAuthFeature } from '@org/auth-feature'
import { provideAuth, SessionStore, type AuthConfig } from '@org/auth-data-access'
import { provideTheme, ThemeStore, type ThemeOptions } from '@org/theme'
import { PreferencesStore } from './preferences.store'
import { AppDirectionality } from './app-directionality'
import { ApiService } from '@org/http-core'

export interface PlatformAppOptions {
  readonly id: string
  readonly brandName: string
  readonly routes: Routes
  readonly auth?: Partial<AuthConfig>
  readonly theme?: Omit<ThemeOptions, 'storageKey'> & { readonly storageKey?: string }
}

export interface ResolvedPlatformAppOptions extends PlatformAppOptions {
  readonly auth: AuthConfig
  readonly themeStorageKey: string
}

export const PLATFORM_APP_OPTIONS = new InjectionToken<ResolvedPlatformAppOptions>(
  'PLATFORM_APP_OPTIONS',
)

export function providePlatformApp(
  options: PlatformAppOptions,
): Array<Provider | EnvironmentProviders> {
  const auth: AuthConfig = {
    apiUrl: '/api',
    mode: 'cookie',
    tenant: 'root',
    loginUrl: '/login',
    afterLoginUrl: '/workspace',
    ...options.auth,
  }
  const themeStorageKey = options.theme?.storageKey ?? `${options.id}.theme.v1`

  return [
    {
      provide: PLATFORM_APP_OPTIONS,
      useValue: Object.freeze({ ...options, auth, themeStorageKey }),
    },
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay(), withNoHttpTransferCache()),
    provideBrowserGlobalErrorListeners(),
    provideTheme({
      ...options.theme,
      storageKey: themeStorageKey,
    }),
    provideAuth(auth),
    ApiService,
    provideAuthFeature({ brandName: options.brandName }),
    {
      provide: AUTH_APPEARANCE,
      useFactory: () => {
        const preferences = inject(PreferencesStore)
        const theme = inject(ThemeStore)
        return {
          direction: preferences.direction,
          theme: theme.version,
          toggleDirection: () => preferences.toggleDirection(),
          toggleTheme: () => theme.set('version', theme.version() === 'light' ? 'dark' : 'light'),
        }
      },
    },
    { provide: Directionality, useClass: AppDirectionality },
    provideAppInitializer(() => inject(PreferencesStore).syncDocument()),
    provideAppInitializer(() => {
      // Restore cookie-backed sessions in the background without delaying app bootstrap.
      inject(SessionStore).restore().subscribe()
    }),
    provideRouter(
      options.routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
  ]
}
