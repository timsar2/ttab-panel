import { DOCUMENT } from '@angular/common';
import { computed, inject } from '@angular/core';
import { Direction } from '@angular/cdk/bidi';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

export type Theme = 'light' | 'dark';

interface PreferencesState {
  direction: Direction;
  theme: Theme;
}

// Root DI creates one instance per application, including each SSR request.
export const PreferencesStore = signalStore(
  { providedIn: 'root' },
  withState<PreferencesState>({ direction: 'rtl', theme: 'light' }),
  withComputed(({ direction }) => ({
    isRtl: computed(() => direction() === 'rtl'),
    language: computed(() => (direction() === 'rtl' ? 'fa' : 'en')),
  })),
  withMethods((store, document = inject(DOCUMENT)) => {
    function syncDocument(): void {
      document.documentElement.dir = store.direction();
      document.documentElement.lang = store.language();
      document.documentElement.classList.toggle(
        'dark',
        store.theme() === 'dark',
      );
    }

    return {
      syncDocument,
      setDirection(direction: Direction): void {
        patchState(store, { direction });
        syncDocument();
      },
      toggleDirection(): void {
        patchState(store, { direction: store.isRtl() ? 'ltr' : 'rtl' });
        syncDocument();
      },
      setTheme(theme: Theme): void {
        patchState(store, { theme });
        syncDocument();
      },
      toggleTheme(): void {
        patchState(store, {
          theme: store.theme() === 'light' ? 'dark' : 'light',
        });
        syncDocument();
      },
    };
  }),
);
