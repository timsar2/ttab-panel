import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  provideZonelessChangeDetection,
  inject,
} from '@angular/core'
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router'
import { provideAuth } from '@org/auth-data-access'
import { AUTH_APPEARANCE, provideAuthFeature } from '@org/auth-feature'
import { provideTheme, ThemeStore } from '@org/theme'
import { panelConfig } from './panel.config'
import { Directionality } from '@angular/cdk/bidi'
import { AppDirectionality } from './core/preferences/app-directionality'
import { PreferencesStore } from './core/preferences/preferences.store'
import { appRoutes } from './app.routes'
import {
  provideClientHydration,
  withEventReplay,
  withNoHttpTransferCache,
} from '@angular/platform-browser'

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay(), withNoHttpTransferCache()),
    provideBrowserGlobalErrorListeners(),
    provideTheme({ storageKey: 'panel.theme.v1' }),
    provideAuth(panelConfig),
    provideAuthFeature({ brandName: panelConfig.brandName }),
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
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
      }),
    ),
  ],
}
