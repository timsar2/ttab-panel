import type { PaletteId, ThemeColor, ThemeVersion } from './theme.model'

export interface PaletteSwatch {
  readonly id: PaletteId
  readonly hex: string
  readonly label: string
}
export const THEME_PALETTES: readonly PaletteSwatch[] = [
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
].map((hex, index) =>
  Object.freeze({ id: `color_${index + 1}` as PaletteId, hex, label: `Color ${index + 1}` }),
)

export function isHexColor(value: string): value is `#${string}` {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
}
export function isPaletteId(value: string): value is PaletteId {
  return THEME_PALETTES.some(s => s.id === value)
}
export function resolveThemeColor(color: ThemeColor | string | null | undefined): string {
  return (
    THEME_PALETTES.find(s => s.id === color)?.hex ??
    (typeof color === 'string' && isHexColor(color) ? color : '#ff720d')
  )
}
function channels(hex: string): number[] {
  const full = hex.length === 4 ? [...hex.slice(1)].map(c => c + c).join('') : hex.slice(1)
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255)
}
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(isHexColor(hex) ? hex : '#ffffff').map(c =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrastRatio(a: string, b: string): number {
  const x = relativeLuminance(a),
    y = relativeLuminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
export function contrastOn(hex: string): string {
  return contrastRatio(hex, '#000000') > contrastRatio(hex, '#ffffff') ? '#000000' : '#ffffff'
}
// Mixing with black in Oklab scales L/a/b uniformly; linear RGB scales by weight cubed.
function darkened(hex: string, weight: number): string {
  return (
    '#' +
    channels(hex)
      .map(c => {
        const linear = (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) * weight ** 3
        const srgb = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055
        return Math.round(srgb * 255)
          .toString(16)
          .padStart(2, '0')
      })
      .join('')
  )
}
export function derivePrimaryVars(hex: string, version: ThemeVersion): Record<string, string> {
  hex = resolveThemeColor(hex)
  const dark = version === 'dark'
  return {
    '--primary': hex,
    '--primary-foreground': contrastOn(hex),
    '--primary-hover': `color-mix(in oklab, ${hex} 86%, #000)`,
    '--primary-active': `color-mix(in oklab, ${hex} 72%, #000)`,
    '--primary-hover-foreground': contrastOn(darkened(hex, 0.86)),
    '--primary-active-foreground': contrastOn(darkened(hex, 0.72)),
    '--primary-soft': `color-mix(in oklab, ${hex} ${dark ? '16%, transparent' : '12%, #fff'})`,
    '--accent': `color-mix(in oklab, ${hex} ${dark ? '14%, transparent' : '12%, #fff'})`,
    '--accent-foreground': dark ? '#ffffff' : '#000000',
    '--accent-strong': dark ? hex : `color-mix(in oklab, ${hex} 90%, #000)`,
    '--sidebar-primary': hex,
    '--sidebar-primary-foreground': contrastOn(hex),
    '--ring': `color-mix(in oklab, ${hex} 45%, transparent)`,
    '--sidebar-ring': `color-mix(in oklab, ${hex} 45%, transparent)`,
    '--chart-1': hex,
    '--selection-bg': hex,
    '--selection-foreground': contrastOn(hex),
    '--shadow-primary': `0px 8px 10px 0px color-mix(in oklab, ${hex} ${dark ? 22 : 30}%, transparent)`,
  }
}
export function deriveSecondaryVars(hex: string, version: ThemeVersion): Record<string, string> {
  hex = resolveThemeColor(hex)
  return {
    '--secondary': hex,
    '--secondary-foreground': contrastOn(hex),
    '--secondary-hover': `color-mix(in oklab, ${hex} 86%, #000)`,
    '--secondary-hover-foreground': contrastOn(darkened(hex, 0.86)),
    '--secondary-soft': `color-mix(in oklab, ${hex} ${version === 'dark' ? '18%, transparent' : '12%, #fff'})`,
    '--chart-2': hex,
  }
}
export function deriveChromeVars(
  headerBg: ThemeColor | string,
  navHeaderBg: ThemeColor | string,
  sidebarBg: ThemeColor | string,
  version: ThemeVersion,
): Record<string, string> {
  const chrome = (color: string) => {
    const hex = resolveThemeColor(color)
    return version === 'dark' && relativeLuminance(hex) === 1 ? '#2b2623' : hex
  }
  const header = chrome(headerBg),
    nav = chrome(navHeaderBg),
    sidebar = chrome(sidebarBg)
  return {
    '--header-bg': header,
    '--header-bg-contrast': contrastOn(header),
    '--header-foreground': contrastOn(header),
    '--nav-header-bg': nav,
    '--nav-header-bg-contrast': contrastOn(nav),
    '--nav-header-foreground': contrastOn(nav),
    '--sidebar': sidebar,
    '--sidebar-foreground': contrastOn(sidebar),
  }
}
