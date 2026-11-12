import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { lucideCheck, lucideRotateCcw, lucideSave, lucideSettings, lucideX } from '@ng-icons/lucide'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select'
import { HlmSheetImports } from '@spartan-ng/helm/sheet'
import { HlmTextareaImports } from '@spartan-ng/helm/textarea'
import {
  CONTAINER_MODES,
  DENSITY_OPTIONS,
  LAYOUT_MODES,
  parseCustomCss,
  RADIUS_OPTIONS,
  SHADOW_OPTIONS,
  SIDEBAR_STYLES,
  THEME_PALETTES,
  THEME_VERSIONS,
  ThemeStore,
  TYPOGRAPHY_IDS,
  type ThemeConfig,
  type ThemeColor,
} from '@org/theme'

type SwatchKind = 'primary' | 'navHeaderBg' | 'headerBg' | 'sidebarBg'
type KnobKey =
  | 'version'
  | 'typography'
  | 'sidebarStyle'
  | 'layout'
  | 'container'
  | 'radius'
  | 'density'
  | 'shadow'

const LABELS = {
  title: ['تنظیمات پوسته', 'Theme settings'],
  description: ['شخصی‌سازی رنگ، تایپوگرافی و چیدمان', 'Customize colors, typography and layout'],
  trigger: ['شخصی‌سازی پوسته', 'Customize theme'],
  close: ['بستن', 'Close'],
  language: ['زبان', 'Language'],
  version: ['نسخه پوسته', 'Theme version'],
  primary: ['رنگ اصلی', 'Primary color'],
  navHeaderBg: ['پس‌زمینه هدر ناوبری', 'Navigation header background'],
  headerBg: ['پس‌زمینه هدر', 'Header background'],
  sidebarBg: ['پس‌زمینه منوی کناری', 'Sidebar background'],
  typography: ['تایپوگرافی', 'Typography'],
  sidebarStyle: ['حالت منوی کناری', 'Sidebar style'],
  layout: ['چیدمان', 'Layout'],
  container: ['عرض محتوا', 'Content width'],
  radius: ['گردی گوشه‌ها', 'Corner radius'],
  density: ['تراکم فیلدها', 'Field density'],
  shadow: ['سایه‌ها', 'Shadows'],
  customCss: ['CSS سفارشی', 'Custom CSS'],
  hint: [
    'در هر خط یک متغیر با نام آغازشده با -- بنویسید.',
    'One declaration per line; variable names must start with --.',
  ],
  invalid: ['خطوط نامعتبر نادیده گرفته می‌شوند', 'Invalid lines will be skipped'],
  valid: ['متغیر معتبر آماده اعمال', 'valid declarations ready to apply'],
  save: ['ذخیره', 'Save'],
  saved: ['ذخیره شد', 'Saved'],
  reset: ['بازنشانی', 'Reset defaults'],
} as const

const OPTION_LABELS: Record<string, readonly [string, string]> = {
  light: ['روشن', 'Light'],
  dark: ['تیره', 'Dark'],
  poppins: ['Poppins', 'Poppins'],
  iransansx: ['IRANSansX', 'IRANSansX'],
  roboto: ['Roboto', 'Roboto'],
  tahoma: ['Tahoma', 'Tahoma'],
  full: ['کامل', 'Full'],
  mini: ['مینی', 'Mini'],
  compact: ['فشرده', 'Compact'],
  modern: ['مدرن', 'Modern'],
  'icon-hover': ['آیکن (بازشونده)', 'Icon hover'],
  vertical: ['عمودی', 'Vertical'],
  horizontal: ['افقی', 'Horizontal'],
  boxed: ['جعبه‌ای', 'Boxed'],
  'wide-boxed': ['جعبه‌ای عریض', 'Wide boxed'],
  default: ['پیش‌فرض', 'Default'],
  soft: ['نرم', 'Soft'],
  medium: ['متوسط', 'Medium'],
  flat: ['تخت', 'Flat'],
}

let nextPanelId = 0

@Component({
  selector: 'lib-theme-panel',
  imports: [
    NgIcon,
    HlmAlertImports,
    HlmButtonImports,
    HlmFieldImports,
    HlmNativeSelectImports,
    HlmSheetImports,
    HlmTextareaImports,
  ],
  providers: [provideIcons({ lucideCheck, lucideRotateCcw, lucideSave, lucideSettings, lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './theme-panel.html',
  styleUrl: './theme-panel.css',
})
export class ThemePanel {
  readonly locale = input<'fa' | 'en'>('fa')
  readonly languageChange = output<'fa' | 'en'>()
  readonly side = input<'left' | 'right'>('left')
  readonly floating = input(true)

  protected readonly theme = inject(ThemeStore)
  protected readonly ready = signal(false)
  protected readonly open = signal(false)
  protected readonly customCss = signal('')
  protected readonly saved = signal(false)
  protected readonly parsedCustom = computed(() => parseCustomCss(this.customCss()))
  protected readonly palettes = THEME_PALETTES
  protected readonly swatchRows: readonly SwatchKind[] = [
    'primary',
    'navHeaderBg',
    'headerBg',
    'sidebarBg',
  ]
  protected readonly id = `theme-panel-${nextPanelId++}`
  protected readonly knobs: readonly { key: KnobKey; options: readonly (string | number)[] }[] = [
    { key: 'version', options: THEME_VERSIONS },
    { key: 'typography', options: TYPOGRAPHY_IDS },
    { key: 'sidebarStyle', options: SIDEBAR_STYLES },
    { key: 'layout', options: LAYOUT_MODES },
    { key: 'container', options: CONTAINER_MODES },
    { key: 'radius', options: RADIUS_OPTIONS },
    { key: 'density', options: DENSITY_OPTIONS },
    { key: 'shadow', options: SHADOW_OPTIONS },
  ]

  constructor() {
    afterNextRender(() => this.ready.set(true))
  }

  openPanel(): void {
    if (this.ready()) this.onSheetState('open')
  }

  closePanel(): void {
    this.onSheetState('closed')
  }

  protected label(key: keyof typeof LABELS): string {
    return LABELS[key][this.locale() === 'fa' ? 0 : 1]
  }

  protected setLanguage(language: string | null | undefined): void {
    if (language === 'fa' || language === 'en') this.languageChange.emit(language)
  }

  protected optionLabel(key: KnobKey, value: string | number): string {
    if (key === 'container' && value === 'full')
      return this.locale() === 'fa' ? 'کامل عرض' : 'Full width'
    return OPTION_LABELS[String(value)]?.[this.locale() === 'fa' ? 0 : 1] ?? String(value)
  }

  protected paletteLabel(index: number): string {
    return `${this.locale() === 'fa' ? 'رنگ' : 'Color'} ${index + 1}`
  }

  protected onSheetState(state: 'open' | 'closed'): void {
    if (state === 'open') {
      this.customCss.set(this.theme.config().customCss)
      this.saved.set(false)
    }
    this.open.set(state === 'open')
  }

  protected isSelected(kind: SwatchKind, id: ThemeColor, hex: string): boolean {
    const current = this.theme.config()[kind]
    const normalized = current
      .toLowerCase()
      .replace(/^#([a-f\d])([a-f\d])([a-f\d])$/, '#$1$1$2$2$3$3')
    return current === id || normalized === hex.toLowerCase()
  }

  protected setColor(kind: SwatchKind, color: ThemeColor): void {
    this.theme.set(kind, color)
    this.saved.set(false)
  }

  protected setKnob(key: KnobKey, value: string | null | undefined): void {
    // Validate against the core's option sets, retaining each config property's type.
    const set = <K extends KnobKey>(name: K, options: readonly ThemeConfig[K][]): void => {
      const selected = options.find(option => String(option) === value)
      if (selected !== undefined) this.theme.set(name, selected)
    }
    switch (key) {
      case 'version':
        set(key, THEME_VERSIONS)
        break
      case 'typography':
        set(key, TYPOGRAPHY_IDS)
        break
      case 'sidebarStyle':
        set(key, SIDEBAR_STYLES)
        break
      case 'layout':
        set(key, LAYOUT_MODES)
        break
      case 'container':
        set(key, CONTAINER_MODES)
        break
      case 'radius':
        set(key, RADIUS_OPTIONS)
        break
      case 'density':
        set(key, DENSITY_OPTIONS)
        break
      case 'shadow':
        set(key, SHADOW_OPTIONS)
        break
    }
    this.saved.set(false)
  }

  protected editCss(event: Event): void {
    if (!(event.target instanceof HTMLTextAreaElement)) return
    this.customCss.set(event.target.value)
    this.saved.set(false)
  }

  protected saveCss(): void {
    const css = this.parsedCustom()
      .valid.map(({ name, value }) => `${name}: ${value};`)
      .join('\n')
    this.theme.applyCustomCss(css)
    this.saved.set(true)
  }

  protected reset(): void {
    this.theme.reset()
    this.customCss.set(this.theme.config().customCss)
    this.saved.set(false)
  }
}
