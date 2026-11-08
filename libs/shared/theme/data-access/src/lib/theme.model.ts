export type PaletteId = `color_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15}`
export type HexColor = `#${string}`
export type ThemeColor = PaletteId | HexColor
export type ThemeVersion = 'light' | 'dark'
export type TypographyId = 'poppins' | 'iransansx' | 'roboto' | 'tahoma'
export type SidebarStyle = 'full' | 'mini' | 'compact' | 'modern' | 'icon-hover'
export type LayoutMode = 'vertical' | 'horizontal'
export type ContainerMode = 'full' | 'boxed' | 'wide-boxed'
export type RadiusOption = '2px' | '8px' | '16px'
export type DensityOption = 'compact' | 'default'
export type ShadowOption = 'soft' | 'medium' | 'flat'

export interface ThemeConfig {
  readonly version: ThemeVersion
  readonly primary: ThemeColor
  readonly secondary: ThemeColor
  readonly headerBg: ThemeColor
  readonly navHeaderBg: ThemeColor
  readonly sidebarBg: ThemeColor
  readonly typography: TypographyId
  readonly sidebarStyle: SidebarStyle
  readonly layout: LayoutMode
  readonly container: ContainerMode
  readonly radius: RadiusOption
  readonly density: DensityOption
  readonly shadow: ShadowOption
  readonly customVars: Readonly<Record<string, string>>
  readonly customCss: string
}

export const THEME_VERSIONS: readonly ThemeVersion[] = ['light', 'dark']
export const TYPOGRAPHY_IDS: readonly TypographyId[] = ['poppins', 'iransansx', 'roboto', 'tahoma']
export const SIDEBAR_STYLES: readonly SidebarStyle[] = [
  'full',
  'mini',
  'compact',
  'modern',
  'icon-hover',
]
export const LAYOUT_MODES: readonly LayoutMode[] = ['vertical', 'horizontal']
export const CONTAINER_MODES: readonly ContainerMode[] = ['full', 'boxed', 'wide-boxed']
export const RADIUS_OPTIONS: readonly RadiusOption[] = ['2px', '8px', '16px']
export const DENSITY_OPTIONS: readonly DensityOption[] = ['compact', 'default']
export const SHADOW_OPTIONS: readonly ShadowOption[] = ['soft', 'medium', 'flat']
export const THEME_STORAGE_KEY = 'org.theme.v1'
export const DEFAULT_THEME_CONFIG: Readonly<ThemeConfig> = Object.freeze({
  version: 'light',
  primary: 'color_3',
  secondary: '#ac4cbc',
  headerBg: 'color_1',
  navHeaderBg: 'color_1',
  sidebarBg: 'color_1',
  typography: 'poppins',
  sidebarStyle: 'full',
  layout: 'vertical',
  container: 'full',
  radius: '2px',
  density: 'default',
  shadow: 'soft',
  customVars: Object.freeze({}),
  customCss: '',
})
