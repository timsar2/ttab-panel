import { Directionality, type Direction } from '@angular/cdk/bidi'
import { EventEmitter, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { DEFAULT_THEME_CONFIG, THEME_PALETTES, ThemeStore, type ThemeConfig } from '@org/theme'
import { ThemePanel } from './theme-panel'

describe('ThemePanel', () => {
  let fixture: ComponentFixture<ThemePanel>
  let config: ReturnType<typeof signal<ThemeConfig>>
  let directionality: Pick<Directionality, 'value' | 'valueSignal' | 'change'>
  let store: {
    config: ReturnType<typeof signal<ThemeConfig>>
    set: ReturnType<typeof vi.fn>
    reset: ReturnType<typeof vi.fn>
    applyCustomCss: ReturnType<typeof vi.fn>
  }

  function element<T extends Element>(selector: string): T {
    const result = document.querySelector<T>(selector)
    if (!result) throw new Error(`Missing element: ${selector}`)
    return result
  }

  async function settle(): Promise<void> {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  async function open(): Promise<void> {
    fixture.componentInstance.openPanel()
    await settle()
  }

  async function change(key: string, value: string): Promise<void> {
    const select = element<HTMLSelectElement>(`select[id$="-${key}"]`)
    select.value = value
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await settle()
  }

  async function edit(value: string): Promise<void> {
    const textarea = element<HTMLTextAreaElement>('textarea')
    textarea.value = value
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()
  }

  function clickText(text: string): void {
    const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      item => item.textContent?.trim() === text,
    )
    if (!button) throw new Error(`Missing button: ${text}`)
    button.click()
  }

  beforeEach(async () => {
    const direction = signal<Direction>('ltr')
    directionality = {
      get value() {
        return direction()
      },
      valueSignal: direction,
      change: new EventEmitter<Direction>(),
    }
    config = signal<ThemeConfig>({ ...DEFAULT_THEME_CONFIG })
    store = {
      config,
      set: vi.fn((key: keyof ThemeConfig, value: ThemeConfig[keyof ThemeConfig]) =>
        config.update(current => ({ ...current, [key]: value })),
      ),
      reset: vi.fn(() => config.set({ ...DEFAULT_THEME_CONFIG })),
      applyCustomCss: vi.fn((customCss: string) =>
        config.update(current => ({ ...current, customCss })),
      ),
    }
    await TestBed.configureTestingModule({
      imports: [ThemePanel],
      providers: [
        { provide: ThemeStore, useValue: store },
        { provide: Directionality, useValue: directionality },
      ],
    }).compileComponents()
    fixture = TestBed.createComponent(ThemePanel)
    fixture.componentRef.setInput('locale', 'en')
    await settle()
  })

  afterEach(() => fixture.destroy())

  it('opens a labelled sheet from the gear with all reference options', async () => {
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement
    expect(trigger.getAttribute('aria-label')).toBe('Customize theme')
    trigger.click()
    await settle()
    const dialog = element<HTMLElement>('[role="dialog"]')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby') ?? '')?.textContent).toBe(
      'Theme settings',
    )
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toContain('Customize colors')
    expect(document.querySelectorAll('button[aria-pressed]').length).toBe(60)
    expect([...document.querySelectorAll('select')].map(select => select.options.length)).toEqual([
      2, 4, 5, 2, 3, 3, 2, 3,
    ])
    expect(element<HTMLSelectElement>('select[id$="-typography"]').value).toBe('poppins')
    expect(element<HTMLButtonElement>('button[aria-label="Close"]')).toBeTruthy()
  })

  it('applies every typed select knob immediately through the store', async () => {
    await open()
    const changes = {
      version: 'dark',
      typography: 'tahoma',
      sidebarStyle: 'icon-hover',
      layout: 'horizontal',
      container: 'wide-boxed',
      radius: '16px',
      density: 'compact',
      shadow: 'flat',
    }
    for (const [key, value] of Object.entries(changes)) {
      await change(key, value)
      expect(store.set).toHaveBeenCalledWith(key, value)
    }
    expect(store.applyCustomCss).not.toHaveBeenCalled()
  })

  it('matches stored hex colors and applies swatches for all four rows', async () => {
    config.update(current => ({ ...current, primary: '#FF720D', headerBg: '#fff' }))
    await open()
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')]
    expect(buttons[2].getAttribute('aria-pressed')).toBe('true')
    expect(buttons[30].getAttribute('aria-pressed')).toBe('true')
    for (const [index, key] of ['primary', 'navHeaderBg', 'headerBg', 'sidebarBg'].entries()) {
      buttons[index * 15 + 4].click()
      await settle()
      expect(store.set).toHaveBeenCalledWith(key, THEME_PALETTES[4].id)
    }
  })

  it('keeps custom CSS as a draft and applies only valid declarations on Save', async () => {
    await open()
    await edit(
      '--primary: #123456;\n<script>alert(1)</script>\n--unsafe: url(https://example.com);',
    )
    expect(store.applyCustomCss).not.toHaveBeenCalled()
    expect(element<HTMLElement>('[hlmAlertTitle]').textContent).toContain('Invalid lines')
    expect(document.body.textContent).toContain('1 valid declarations')
    expect(document.querySelector('script')).toBeNull()
    expect(document.body.textContent).toContain('<script>alert(1)</script>')
    clickText('Save')
    await settle()
    expect(store.applyCustomCss).toHaveBeenCalledExactlyOnceWith('--primary: #123456;')
    expect(document.body.textContent).toContain('Saved')
    await edit('')
    clickText('Save')
    await settle()
    expect(store.applyCustomCss).toHaveBeenLastCalledWith('')
  })

  it('discards stale unsaved drafts on reopening without reverting immediate knobs', async () => {
    config.update(current => ({ ...current, customCss: '--saved: 1;' }))
    await open()
    await edit('--draft: 2;')
    await change('version', 'dark')
    fixture.componentInstance.closePanel()
    await settle()
    await open()
    expect(element<HTMLTextAreaElement>('textarea').value).toBe('--saved: 1;')
    expect(config().version).toBe('dark')
    expect(store.applyCustomCss).not.toHaveBeenCalled()
  })

  it('resets the editor and core defaults together', async () => {
    await open()
    await edit('--draft: 2;')
    await change('version', 'dark')
    clickText('Reset defaults')
    await settle()
    expect(store.reset).toHaveBeenCalledOnce()
    expect(element<HTMLTextAreaElement>('textarea').value).toBe('')
    expect(element<HTMLSelectElement>('select[id$="-version"]').value).toBe('light')
    expect(store.applyCustomCss).not.toHaveBeenCalled()
  })

  it('supports Farsi labels and an embedded trigger without application dependencies', async () => {
    fixture.componentRef.setInput('locale', 'fa')
    fixture.componentRef.setInput('floating', false)
    fixture.componentRef.setInput('side', 'right')
    await settle()
    expect(fixture.nativeElement.querySelector('button')).toBeNull()
    await open()
    expect(document.body.textContent).toContain('تنظیمات پوسته')
    expect(element<HTMLButtonElement>('button[aria-label="بستن"]')).toBeTruthy()
    const label = element<HTMLLabelElement>('label[for$="-version"]')
    expect(label.textContent).toContain('نسخه پوسته')
    expect(label.control?.tagName).toBe('SELECT')
    expect(element<HTMLButtonElement>('button[aria-pressed]').getAttribute('aria-label')).toContain(
      'رنگ 1',
    )
  })

  it('closes through the explicit sheet close control and restores trigger focus', async () => {
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement
    trigger.focus()
    trigger.click()
    await settle()
    element<HTMLButtonElement>('button[aria-label="Close"]').click()
    await settle()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(store.applyCustomCss).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(trigger)
  })

  it('opens from the native gear with a signal-based app directionality provider in RTL and LTR', async () => {
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement
    for (const direction of ['rtl', 'ltr'] as const) {
      directionality.valueSignal.set(direction)
      directionality.change.emit(direction)
      await settle()
      trigger.click()
      await settle()
      const dialog = element<HTMLElement>('[role="dialog"]')
      expect(dialog.closest('[dir]')?.getAttribute('dir')).toBe(direction)
      expect(trigger.getAttribute('aria-expanded')).toBe('true')
      element<HTMLButtonElement>('button[aria-label="Close"]').click()
      await settle()
      expect(document.querySelector('[role="dialog"]')).toBeNull()
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
    }
  })
})
