import { TestBed } from '@angular/core/testing'
import { AutocompleteSearch } from '../index'

interface Result {
  readonly id: number
  readonly name: string
  readonly nationalId: string
}

describe('AutocompleteSearch', () => {
  beforeAll(() => {
    if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn()
    if (!globalThis.ResizeObserver) {
      Object.defineProperty(globalThis, 'ResizeObserver', {
        configurable: true,
        value: class {
          observe() {
            return undefined
          }
          unobserve() {
            return undefined
          }
          disconnect() {
            return undefined
          }
        },
      })
    }
  })

  async function setup() {
    await TestBed.configureTestingModule({ imports: [AutocompleteSearch] }).compileComponents()
    const fixture = TestBed.createComponent(AutocompleteSearch<Result>)
    fixture.componentRef.setInput('id', 'driver-search')
    fixture.componentRef.setInput('label', {
      en: 'Driver name or national ID',
      fa: 'نام یا کد ملی راننده',
    })
    fixture.componentRef.setInput('placeholder', {
      en: 'Type a name or national ID',
      fa: 'نام یا کد ملی را وارد کنید',
    })
    fixture.componentRef.setInput('clearLabel', { en: 'Clear search', fa: 'پاک کردن جستجو' })
    fixture.componentRef.setInput('loadingLabel', { en: 'Searching...', fa: 'در حال جستجو...' })
    fixture.componentRef.setInput('minimumQueryLabel', {
      en: 'Enter at least 2 characters to search.',
      fa: 'برای جستجو حداقل ۲ نویسه وارد کنید.',
    })
    fixture.componentRef.setInput('emptyLabel', {
      en: 'No matching results.',
      fa: 'نتیجه‌ای پیدا نشد.',
    })
    fixture.componentRef.setInput('optionId', (row: Result) => String(row.id))
    fixture.componentRef.setInput('optionLabel', (row: Result) => ({ en: row.name, fa: row.name }))
    fixture.componentRef.setInput('optionDescription', (row: Result) => ({
      en: row.nationalId,
      fa: row.nationalId,
    }))
    fixture.componentRef.setInput('language', 'en')
    fixture.componentRef.setInput('options', [
      { id: 12, name: 'Sam Driver', nationalId: '0012345678' },
    ])
    fixture.componentRef.setInput('debounceMs', 5)
    await fixture.whenStable()
    return fixture
  }

  it('debounces server queries and publishes accessible suggestions for keyboard selection', async () => {
    const fixture = await setup()
    const search = vi.fn()
    const selected = vi.fn()
    fixture.componentInstance.queryRequested.subscribe(search)
    fixture.componentInstance.optionSelected.subscribe(selected)
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement
    input.focus()
    input.value = 'Sam'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    fixture.detectChanges()
    expect(search).not.toHaveBeenCalled()
    await new Promise(resolve => setTimeout(resolve, 10))
    fixture.detectChanges()
    expect(search).toHaveBeenCalledWith('Sam')
    expect(input.getAttribute('role')).toBe('combobox')
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(document.body.querySelector('[role=listbox]')).not.toBeNull()
    expect(document.body.querySelector('[role=option]')?.textContent).toContain('0012345678')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    fixture.detectChanges()
    const activeOptionId = input.getAttribute('aria-activedescendant')
    expect(activeOptionId).toBeTruthy()
    expect(document.body.querySelector(`#${activeOptionId}`)?.getAttribute('role')).toBe('option')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    fixture.detectChanges()
    expect(selected).toHaveBeenCalledWith({ id: 12, name: 'Sam Driver', nationalId: '0012345678' })
    expect(fixture.componentInstance.query()).toBe('Sam')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    fixture.componentRef.setInput('language', 'fa')
    fixture.detectChanges()
    expect(input.getAttribute('aria-label')).toBe('نام یا کد ملی راننده')
    expect(input.placeholder).toBe('نام یا کد ملی را وارد کنید')
    expect(fixture.nativeElement.querySelector('[dir=rtl]')).not.toBeNull()
    expect(fixture.nativeElement.querySelector('label')?.textContent).toContain(
      'نام یا کد ملی راننده',
    )
    fixture.componentRef.setInput('language', 'en')
    fixture.detectChanges()
    expect(input.getAttribute('aria-label')).toBe('Driver name or national ID')
  })

  it('emits a reset when cleared and indicates the minimum query length', async () => {
    const fixture = await setup()
    fixture.componentRef.setInput('language', 'fa')
    fixture.detectChanges()
    const search = vi.fn()
    fixture.componentInstance.queryRequested.subscribe(search)
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement
    input.focus()
    input.value = 'S'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    fixture.detectChanges()
    expect(search).toHaveBeenCalledWith('')
    expect(document.body.textContent).toContain('برای جستجو حداقل ۲ نویسه وارد کنید.')
    const clear = fixture.nativeElement.querySelector(
      '[data-slot="autocomplete-clear"]',
    ) as HTMLButtonElement
    expect(clear.getAttribute('aria-label')).toBe('پاک کردن جستجو')
    clear.click()
    fixture.detectChanges()
    expect(fixture.componentInstance.query()).toBe('')
  })

  it('restores an existing selection when an editor loads a persisted association', async () => {
    const fixture = await setup()
    const driver = { id: 12, name: 'Sam Driver', nationalId: '0012345678' }
    fixture.componentRef.setInput('query', 'Sam Driver')
    fixture.componentRef.setInput('selectedOption', driver)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('Sam Driver')
  })
})
