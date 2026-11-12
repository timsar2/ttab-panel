import { TestBed } from '@angular/core/testing'
import { AutocompleteSearch } from '../index'

interface Result {
  readonly id: number
  readonly name: string
  readonly nationalId: string
}

describe('AutocompleteSearch', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [AutocompleteSearch] }).compileComponents()
    const fixture = TestBed.createComponent(AutocompleteSearch<Result>)
    fixture.componentRef.setInput('id', 'driver-search')
    fixture.componentRef.setInput('label', 'Driver name or national ID')
    fixture.componentRef.setInput('optionId', (row: Result) => String(row.id))
    fixture.componentRef.setInput('optionLabel', (row: Result) => row.name)
    fixture.componentRef.setInput('optionDescription', (row: Result) => row.nationalId)
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
    expect(fixture.nativeElement.querySelector('[role=listbox]')).not.toBeNull()
    expect(fixture.nativeElement.querySelector('[role=option]')?.textContent).toContain(
      '0012345678',
    )
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    fixture.detectChanges()
    expect(input.getAttribute('aria-activedescendant')).toBe('driver-search-option-0')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    fixture.detectChanges()
    expect(selected).toHaveBeenCalledWith({ id: 12, name: 'Sam Driver', nationalId: '0012345678' })
    expect(fixture.componentInstance.query()).toBe('Sam Driver')
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('emits a reset when cleared and indicates the minimum query length', async () => {
    const fixture = await setup()
    const search = vi.fn()
    fixture.componentInstance.queryRequested.subscribe(search)
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement
    input.focus()
    input.value = 'S'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    fixture.detectChanges()
    expect(search).toHaveBeenCalledWith('')
    expect(fixture.nativeElement.textContent).toContain('Enter at least 2 characters')
    const clear = fixture.nativeElement.querySelector('button') as HTMLButtonElement
    clear.click()
    fixture.detectChanges()
    expect(fixture.componentInstance.query()).toBe('')
  })
})
