import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { disabled, form, FormField, required } from '@angular/forms/signals'
import { SignalInput } from './signal-input'

@Component({
  imports: [FormField, SignalInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<label for="record-name">Name</label>
    <input libSignalInput id="record-name" [formField]="fields.name" />`,
})
class RecordForm {
  readonly locked = signal(false)
  readonly model = signal({ name: '' })
  readonly fields = form(this.model, path => {
    required(path.name)
    disabled(path.name, () => this.locked())
  })
}

describe('SignalInput', () => {
  async function setup() {
    TestBed.configureTestingModule({ imports: [RecordForm] })
    const fixture = TestBed.createComponent(RecordForm)
    await fixture.whenStable()
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement
    return { fixture, input }
  }

  it('works in a non-authentication form without any app or auth providers', async () => {
    const { fixture, input } = await setup()
    expect(input.id).toBe('record-name')
    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(input.getAttribute('data-invalid')).toBe('false')
    input.value = 'A reusable record'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await fixture.whenStable()
    expect(fixture.componentInstance.model().name).toBe('A reusable record')
  })

  it('shows invalid state after blur and clears it after correction', async () => {
    const { fixture, input } = await setup()
    input.dispatchEvent(new Event('blur'))
    await fixture.whenStable()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('data-invalid')).toBe('true')
    expect(input.getAttribute('data-matches-spartan-invalid')).toBe('true')
    fixture.componentInstance.model.set({ name: 'Corrected' })
    await fixture.whenStable()
    expect(input.value).toBe('Corrected')
    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(input.getAttribute('data-invalid')).toBeNull()
  })

  it('respects disabled state from the Signal Forms schema', async () => {
    const { fixture, input } = await setup()
    fixture.componentInstance.locked.set(true)
    await fixture.whenStable()
    expect(input.disabled).toBe(true)
    fixture.componentInstance.locked.set(false)
    await fixture.whenStable()
    expect(input.disabled).toBe(false)
    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(input.getAttribute('data-matches-spartan-invalid')).toBe('false')
  })
})
