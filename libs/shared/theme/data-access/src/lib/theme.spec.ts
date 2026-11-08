import { DOCUMENT } from '@angular/common'
import { createEnvironmentInjector, EnvironmentInjector, PLATFORM_ID } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { DEFAULT_THEME_CONFIG, type ThemeConfig } from './theme.model'
import {
  contrastOn,
  contrastRatio,
  derivePrimaryVars,
  isHexColor,
  resolveThemeColor,
  THEME_PALETTES,
} from './theme-palettes'
import { MAX_CUSTOM_CSS_LENGTH, normalizeCustomVars, parseCustomCss } from './custom-css'
import { normalizeConfig, provideTheme, ThemeStore } from './theme.store'

describe('theme normalization and palettes', () => {
  it('keeps reference defaults and all 15 exact swatches', () => {
    expect(normalizeConfig(null)).toEqual(DEFAULT_THEME_CONFIG)
    expect(THEME_PALETTES.map(s => s.hex)).toEqual([
      '#ffffff',
      '#6610f2',
      '#ff720d',
      '#e83e8c',
      '#dc3545',
      '#fd7e14',
      '#ffc107',
      '#28a745',
      '#20c997',
      '#17a2b8',
      '#6c757d',
      '#343a40',
      '#2a2a2a',
      '#4885ed',
      '#4cb32b',
    ])
    for (const swatch of THEME_PALETTES) expect(resolveThemeColor(swatch.id)).toBe(swatch.hex)
    expect(DEFAULT_THEME_CONFIG.primary).toBe('color_3')
    expect(DEFAULT_THEME_CONFIG.secondary).toBe('#ac4cbc')
  })
  it.each(['#1', '#12', '#1234', '#12345', '#1234567', '#12345678', 'red', 'color_16'])(
    'rejects invalid color %s',
    value => {
      expect(isHexColor(value)).toBe(false)
      expect(normalizeConfig({ primary: value }).primary).toBe('color_3')
    },
  )
  it('validates every enum and freezes state including variables', () => {
    const invalid = Object.fromEntries(
      Object.keys(DEFAULT_THEME_CONFIG).map(key => [key, 'invalid']),
    )
    expect(normalizeConfig({ ...invalid, customCss: null })).toEqual(DEFAULT_THEME_CONFIG)
    const normalized = normalizeConfig({
      primary: '#abc',
      customVars: { '--good': '1px', __proto__: 'bad' },
    })
    expect(normalized.primary).toBe('#abc')
    expect(Object.isFrozen(normalized)).toBe(true)
    expect(Object.isFrozen(normalized.customVars)).toBe(true)
    expect(normalizeConfig(Object.create({ primary: '#000' })).primary).toBe('color_3')
  })
  it('chooses WCAG contrast for every palette, white and dark backgrounds', () => {
    for (const hex of [...THEME_PALETTES.map(s => s.hex), '#000', '#abc', '#2b2623'])
      expect(contrastRatio(hex, contrastOn(hex))).toBeGreaterThanOrEqual(4.5)
    expect(contrastOn('#fff')).toBe('#000000')
    expect(contrastOn('#000')).toBe('#ffffff')
    expect(derivePrimaryVars('#ff720d', 'light')['--primary-active-foreground']).toBe('#ffffff')
    expect(derivePrimaryVars('#ff720d', 'light')['--primary-foreground']).toBe('#000000')
    expect(derivePrimaryVars('#ffffff', 'light')['--primary-foreground']).toBe('#000000')
  })
})

describe('custom CSS trust boundary', () => {
  it('returns reference parse shapes for ordinary safe tokens', () => {
    const parsed = parseCustomCss(
      '--color: #fff;\n--length: calc(1rem + var(--gap));\n--shadow: 0 2px 8px rgb(0 0 0 / 8%);\n--mix: color-mix(in oklab, red 12%, #fff)',
    )
    expect(parsed.invalid).toEqual([])
    expect(parsed.valid).toHaveLength(4)
    expect(parsed.valid[0]).toEqual({ name: '--color', value: '#fff', raw: '--color: #fff;' })
  })
  it.each([
    '--x: url(x)',
    '--x: URL (x)',
    '--x: u\\72l(x)',
    '--x: %75%72%6c(x)',
    '--x: expression(x)',
    '--x: red; --y: blue;',
    '--x: red/*x*/',
    '--x: red}',
    '--x: </style>',
    '--x: @import x',
    '--x: red\u0000',
    '--x: image-set(x)',
    '--x: var(--y))',
    '--x: calc(1px',
    '__proto__: bad',
    '--x: &#117;rl(x)',
  ])('rejects injection %s', css => {
    expect(parseCustomCss(css).valid).toEqual([])
    expect(parseCustomCss(css).invalid).toHaveLength(1)
  })
  it('uses identical safety rules on runtime variable maps and bounds data', () => {
    expect(
      normalizeCustomVars(JSON.parse('{"--ok":"#fff","--bad":"red; color:blue","__proto__":"x"}')),
    ).toEqual({ '--ok': '#fff' })
    expect(parseCustomCss('x'.repeat(MAX_CUSTOM_CSS_LENGTH + 1)).valid).toEqual([])
    expect(normalizeConfig({ customCss: 'x'.repeat(MAX_CUSTOM_CSS_LENGTH + 1) }).customCss).toBe('')
    expect(
      Object.keys(
        normalizeCustomVars(
          Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`--x${i}`, '1px'])),
        ),
      ),
    ).toHaveLength(128)
  })
})

describe('ThemeStore', () => {
  let store: InstanceType<typeof ThemeStore>
  let doc: Document
  beforeEach(() => {
    localStorage.clear()
    TestBed.configureTestingModule({ providers: [provideTheme({ storageKey: 'test.theme' })] })
    doc = TestBed.inject(DOCUMENT)
    store = TestBed.inject(ThemeStore)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  const render = () => TestBed.tick()

  it('initializes defaults synchronously without storage until browser render', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem')
    localStorage.setItem('test.theme', JSON.stringify({ version: 'dark' }))
    store.restore()
    expect(store.version()).toBe('light')
    expect(get).not.toHaveBeenCalled()
    render()
    expect(get).toHaveBeenCalledWith('test.theme')
    expect(store.version()).toBe('dark')
  })
  it('does not overwrite pre-render user mutations with stored data', () => {
    localStorage.setItem('test.theme', JSON.stringify({ primary: '#000' }))
    const get = vi.spyOn(Storage.prototype, 'getItem')
    const set = vi.spyOn(Storage.prototype, 'setItem')
    store.set('primary', '#fff')
    expect(get).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
    render()
    expect(store.config().primary).toBe('#fff')
    expect(JSON.parse(localStorage.getItem('test.theme') ?? '{}').primary).toBe('#fff')
  })
  it('applies and persists normalized mutations, toggles attrs without direction changes', () => {
    render()
    const root = doc.documentElement
    root.setAttribute('dir', 'rtl')
    root.setAttribute('lang', 'fa')
    store.save({
      version: 'dark',
      primary: '#fff',
      layout: 'horizontal',
      sidebarStyle: 'mini',
      container: 'boxed',
      typography: 'roboto',
    })
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.getAttribute('data-theme-version')).toBe('dark')
    expect(root.getAttribute('data-layout')).toBe('horizontal')
    expect(root.getAttribute('data-container')).toBe('boxed')
    expect(root.getAttribute('data-sidebar-style')).toBe('mini')
    expect(root.getAttribute('data-typography')).toBe('roboto')
    expect(root.getAttribute('dir')).toBe('rtl')
    expect(root.getAttribute('lang')).toBe('fa')
    expect(root.style.getPropertyValue('--font-sans')).toMatch(/^'Roboto Variable'/)
    expect(root.style.getPropertyValue('--header-bg')).toBe('#2b2623')
    store.set('primary', 'bad' as ThemeConfig['primary'])
    expect(store.config().primary).toBe('#fff')
    expect(JSON.parse(localStorage.getItem('test.theme') ?? '{}').version).toBe('dark')
    store.set('version', 'light')
    expect(root.classList.contains('dark')).toBe(false)
    expect(root.style.getPropertyValue('--header-bg')).toBe('#ffffff')
  })
  it('applies all geometry, density and shadow presets without stale values', () => {
    render()
    const style = doc.documentElement.style
    for (const [radius, expected] of [
      ['2px', '0.125rem'],
      ['8px', '0.5rem'],
      ['16px', '1rem'],
    ] as const) {
      store.set('radius', radius)
      expect(style.getPropertyValue('--radius')).toBe(expected)
    }
    expect(style.getPropertyValue('--radius-sm')).toBe('0.75rem')
    expect(style.getPropertyValue('--radius-lg')).toBe('1.25rem')
    store.set('density', 'compact')
    expect(style.getPropertyValue('--field-height')).toBe('41px')
    expect(style.getPropertyValue('--field-label-scale')).toBe('0.82')
    store.set('density', 'default')
    expect(style.getPropertyValue('--field-height')).toBe('56px')
    store.set('shadow', 'flat')
    expect(style.getPropertyValue('--shadow-sidebar')).toBe('none')
    store.set('shadow', 'medium')
    expect(style.getPropertyValue('--shadow-md')).toContain('0 6px 18px')
    store.set('shadow', 'soft')
    expect(style.getPropertyValue('--shadow-md')).toContain('24px')
  })
  it('stores draft only, removes old custom vars before reapplying derived tokens, and resets', () => {
    render()
    const style = doc.documentElement.style
    store.save({ customCss: '--primary: #123456;\n--new-token: 3px;' })
    expect(style.getPropertyValue('--primary')).toBe('#ff720d')
    store.applyCustomCss()
    expect(style.getPropertyValue('--primary')).toBe('#123456')
    store.applyCustomCss('--radius: 3px;')
    expect(style.getPropertyValue('--primary')).toBe('#ff720d')
    expect(style.getPropertyValue('--new-token')).toBe('')
    expect(style.getPropertyValue('--radius')).toBe('3px')
    store.reset()
    expect(style.getPropertyValue('--radius')).toBe('0.125rem')
    expect(store.config()).toEqual(DEFAULT_THEME_CONFIG)
    store.applyCustomCss('--shadow-md: none;')
    store.applyCustomCss('')
    expect(style.getPropertyValue('--shadow-md')).toContain('24px')
  })
  it('tolerates malformed, oversized, unavailable, and denied storage', () => {
    localStorage.setItem('test.theme', '{bad')
    render()
    expect(store.config()).toEqual(DEFAULT_THEME_CONFIG)
    localStorage.setItem('test.theme', 'x'.repeat(100_001))
    store.restore()
    expect(store.config()).toEqual(DEFAULT_THEME_CONFIG)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    expect(() => {
      store.restore()
      store.set('version', 'dark')
      store.reset()
    }).not.toThrow()
    vi.spyOn(doc.defaultView as Window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => {
      store.restore()
      store.set('version', 'dark')
    }).not.toThrow()
  })
  it('isolates providers, DOM documents, defaults and keys', () => {
    render()
    const childDoc = doc.implementation.createHTMLDocument()
    Object.defineProperty(childDoc, 'defaultView', { value: doc.defaultView })
    const child = createEnvironmentInjector(
      [
        provideTheme({ storageKey: 'other.theme', defaults: { primary: '#000', radius: '8px' } }),
        { provide: DOCUMENT, useValue: childDoc },
      ],
      TestBed.inject(EnvironmentInjector),
    )
    try {
      const other = child.get(ThemeStore)
      render()
      expect(other).not.toBe(store)
      expect(other.config().primary).toBe('#000')
      other.set('version', 'dark')
      expect(JSON.parse(localStorage.getItem('other.theme') ?? '{}').version).toBe('dark')
      expect(localStorage.getItem('test.theme')).toBeNull()
      expect(store.version()).toBe('light')
      expect(childDoc.documentElement.classList.contains('dark')).toBe(true)
      expect(doc.documentElement.classList.contains('dark')).toBe(false)
      other.reset()
      expect(other.config().radius).toBe('8px')
    } finally {
      child.destroy()
    }
  })
  it('applies SSR defaults and never accesses storage APIs on server', () => {
    const serverDoc = doc.implementation.createHTMLDocument()
    const get = vi.spyOn(Storage.prototype, 'getItem')
    const set = vi.spyOn(Storage.prototype, 'setItem')
    const server = createEnvironmentInjector(
      [
        provideTheme({ defaults: { version: 'dark' } }),
        { provide: DOCUMENT, useValue: serverDoc },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
      TestBed.inject(EnvironmentInjector),
    )
    try {
      const theme = server.get(ThemeStore)
      theme.restore()
      theme.set('radius', '16px')
      theme.applyCustomCss('--safe: 1px;')
      theme.reset()
      expect(serverDoc.documentElement.classList.contains('dark')).toBe(true)
      expect(serverDoc.documentElement.style.getPropertyValue('--primary')).toBe('#ff720d')
      expect(get).not.toHaveBeenCalled()
      expect(set).not.toHaveBeenCalled()
    } finally {
      server.destroy()
    }
  })
})
