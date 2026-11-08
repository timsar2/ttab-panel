import { DOCUMENT, isPlatformBrowser } from '@angular/common'
import {
  afterNextRender,
  computed,
  inject,
  InjectionToken,
  makeEnvironmentProviders,
  PLATFORM_ID,
  provideEnvironmentInitializer,
  type EnvironmentProviders,
} from '@angular/core'
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals'
import { MAX_CUSTOM_CSS_LENGTH, normalizeCustomVars, parseCustomCss } from './custom-css'
import {
  deriveChromeVars,
  derivePrimaryVars,
  deriveSecondaryVars,
  isHexColor,
  isPaletteId,
  resolveThemeColor,
} from './theme-palettes'
import {
  CONTAINER_MODES,
  DEFAULT_THEME_CONFIG,
  DENSITY_OPTIONS,
  LAYOUT_MODES,
  RADIUS_OPTIONS,
  SHADOW_OPTIONS,
  SIDEBAR_STYLES,
  THEME_STORAGE_KEY,
  THEME_VERSIONS,
  TYPOGRAPHY_IDS,
  type ThemeConfig,
} from './theme.model'

export interface ThemeOptions {
  storageKey?: string
  defaults?: Partial<ThemeConfig>
}
const THEME_OPTIONS = new InjectionToken<ThemeOptions>('Theme options')

export function normalizeConfig(
  input: unknown,
  fallback: Readonly<ThemeConfig> = DEFAULT_THEME_CONFIG,
): Readonly<ThemeConfig> {
  const source =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {}
  const own = (key: string) =>
    Object.prototype.hasOwnProperty.call(source, key) ? source[key] : undefined
  const pick = <T extends string>(key: keyof ThemeConfig, allowed: readonly T[], value: T): T => {
    const candidate = own(key)
    return typeof candidate === 'string' && allowed.includes(candidate as T)
      ? (candidate as T)
      : value
  }
  const color = (key: 'primary' | 'secondary' | 'headerBg' | 'navHeaderBg' | 'sidebarBg') => {
    const candidate = own(key)
    return typeof candidate === 'string' && (isPaletteId(candidate) || isHexColor(candidate))
      ? candidate
      : fallback[key]
  }
  return Object.freeze({
    version: pick('version', THEME_VERSIONS, fallback.version),
    primary: color('primary'),
    secondary: color('secondary'),
    headerBg: color('headerBg'),
    navHeaderBg: color('navHeaderBg'),
    sidebarBg: color('sidebarBg'),
    typography: pick('typography', TYPOGRAPHY_IDS, fallback.typography),
    sidebarStyle: pick('sidebarStyle', SIDEBAR_STYLES, fallback.sidebarStyle),
    layout: pick('layout', LAYOUT_MODES, fallback.layout),
    container: pick('container', CONTAINER_MODES, fallback.container),
    radius: pick('radius', RADIUS_OPTIONS, fallback.radius),
    density: pick('density', DENSITY_OPTIONS, fallback.density),
    shadow: pick('shadow', SHADOW_OPTIONS, fallback.shadow),
    customVars:
      own('customVars') === undefined
        ? normalizeCustomVars(fallback.customVars)
        : normalizeCustomVars(own('customVars')),
    customCss:
      typeof own('customCss') === 'string' &&
      (own('customCss') as string).length <= MAX_CUSTOM_CSS_LENGTH
        ? (own('customCss') as string)
        : fallback.customCss,
  })
}

const FONT_STACKS = {
  poppins: {
    sans: "'Poppins','Vazirmatn Variable','Vazirmatn','IRANSansX','Segoe UI',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif",
    serif: "'Poppins','Vazirmatn Variable','Vazirmatn','Amiri','Times New Roman',serif",
  },
  iransansx: {
    sans: "'IRANSansX','IRANSans','Vazirmatn Variable','Vazirmatn','Poppins','Segoe UI',-apple-system,BlinkMacSystemFont,Arial,sans-serif",
    serif: "'IRANSansX','IRANSans','Vazirmatn Variable','Amiri','Times New Roman',serif",
  },
  roboto: {
    sans: "'Roboto Variable','Roboto','Vazirmatn Variable','Vazirmatn','Poppins','Segoe UI',-apple-system,BlinkMacSystemFont,Arial,sans-serif",
    serif: "'Roboto Variable','Roboto','Vazirmatn Variable','Amiri','Times New Roman',serif",
  },
  tahoma: {
    sans: "'Tahoma','Vazirmatn Variable','Vazirmatn','Segoe UI',-apple-system,BlinkMacSystemFont,Arial,sans-serif",
    serif: "'Tahoma','Vazirmatn Variable','Vazirmatn','Amiri','Times New Roman',serif",
  },
}
const RADII = {
  '2px': ['0.125rem', '0.125rem', '0.125rem'],
  '8px': ['0.5rem', '0.375rem', '0.625rem'],
  '16px': ['1rem', '0.75rem', '1.25rem'],
}
const SHADOWS = {
  soft: [
    '0px 0px 13px 0px rgb(82 63 105 / 5%)',
    '0px 0px 13px 0px rgb(82 63 105 / 8%)',
    '0px 0px 24px 0px rgb(82 63 105 / 8%)',
    '0px 0px 40px 0px rgb(82 63 105 / 10%)',
    '0px 15px 30px 0px rgb(0 0 0 / 2%)',
  ],
  medium: [
    '0 1px 3px 0 rgb(82 63 105 / 8%)',
    '0 2px 8px 0 rgb(82 63 105 / 10%)',
    '0 6px 18px 0 rgb(82 63 105 / 12%)',
    '0 12px 32px 0 rgb(82 63 105 / 14%)',
    '0 10px 24px 0 rgb(0 0 0 / 8%)',
  ],
  flat: ['none', 'none', 'none', 'none', 'none'],
}

export const ThemeStore = signalStore(
  withState(() => ({ config: normalizeConfig(inject(THEME_OPTIONS).defaults) })),
  withComputed(store => ({ version: computed(() => store.config().version) })),
  withMethods(store => {
    const doc = inject(DOCUMENT)
    const browser = isPlatformBrowser(inject(PLATFORM_ID))
    const options = inject(THEME_OPTIONS)
    const defaults = normalizeConfig(options.defaults)
    const storageKey = options.storageKey || THEME_STORAGE_KEY
    let rendered = false
    let changedBeforeRender = false
    let customNames: string[] = []

    function persist(): void {
      if (!browser || !rendered) return
      try {
        doc.defaultView?.localStorage.setItem(storageKey, JSON.stringify(store.config()))
      } catch {
        /* Storage is optional. */
      }
    }
    function apply(): void {
      const root = doc.documentElement
      if (!root) return
      const cfg = store.config()
      // Remove old overrides FIRST so removed derived overrides regain their preset value.
      for (const name of customNames) root.style.removeProperty(name)
      customNames = []
      root.classList.toggle('dark', cfg.version === 'dark')
      for (const [name, value] of Object.entries({
        'theme-version': cfg.version,
        typography: cfg.typography,
        'sidebar-style': cfg.sidebarStyle,
        layout: cfg.layout,
        container: cfg.container,
      }))
        root.setAttribute(`data-${name}`, value)
      const fonts = FONT_STACKS[cfg.typography],
        radius = RADII[cfg.radius],
        compact = cfg.density === 'compact'
      const vars: Record<string, string> = {
        ...derivePrimaryVars(resolveThemeColor(cfg.primary), cfg.version),
        ...deriveSecondaryVars(resolveThemeColor(cfg.secondary), cfg.version),
        ...deriveChromeVars(cfg.headerBg, cfg.navHeaderBg, cfg.sidebarBg, cfg.version),
        '--font-sans': fonts.sans,
        '--font-serif': fonts.serif,
        '--radius': radius[0],
        '--radius-sm': radius[1],
        '--radius-lg': radius[2],
        '--field-height': compact ? '41px' : '56px',
        '--field-font-size': compact ? '0.813rem' : '1rem',
        '--field-pad-top': compact ? '1.05rem' : '1.35rem',
        '--field-pad-bottom': compact ? '0.25rem' : '0.35rem',
        '--field-label-scale': compact ? '0.82' : '0.78',
      }
      ;['xs', 'sm', 'md', 'lg', 'sidebar'].forEach(
        (size, index) => (vars[`--shadow-${size}`] = SHADOWS[cfg.shadow][index]),
      )
      for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)
      for (const [name, value] of Object.entries(cfg.customVars)) {
        root.style.setProperty(name, value)
        customNames.push(name)
      }
    }
    function save(partial: Partial<ThemeConfig>): void {
      if (!rendered) changedBeforeRender = true
      patchState(store, { config: normalizeConfig(partial, store.config()) })
      apply()
      persist()
    }
    function restore(): void {
      // Even explicit restore calls before hydration must not read browser storage.
      if (!browser || !rendered) {
        apply()
        return
      }
      let config = defaults
      try {
        const raw = doc.defaultView?.localStorage.getItem(storageKey)
        if (raw && raw.length <= 100_000) config = normalizeConfig(JSON.parse(raw), defaults)
      } catch {
        /* Malformed or denied storage uses defaults. */
      }
      patchState(store, { config })
      apply()
    }
    if (browser)
      afterNextRender(() => {
        rendered = true
        if (changedBeforeRender) {
          apply()
          persist()
        } else restore()
      })
    return {
      set<K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]): void {
        save({ [key]: value })
      },
      save,
      reset(): void {
        if (!rendered) changedBeforeRender = true
        patchState(store, { config: defaults })
        apply()
        persist()
      },
      applyCustomCss(css?: string): void {
        const draft = css === undefined ? store.config().customCss : css
        const parsed = parseCustomCss(draft)
        save({
          customCss: draft,
          customVars: Object.fromEntries(parsed.valid.map(({ name, value }) => [name, value])),
        })
      },
      restore,
      apply,
    }
  }),
)

export function provideTheme(options: ThemeOptions = {}): EnvironmentProviders {
  const snapshot: ThemeOptions = {
    storageKey: options.storageKey,
    defaults: normalizeConfig(options.defaults),
  }
  return makeEnvironmentProviders([
    { provide: THEME_OPTIONS, useValue: snapshot },
    ThemeStore,
    provideEnvironmentInitializer(() => inject(ThemeStore).apply()),
  ])
}
