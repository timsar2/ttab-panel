import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { disabled, form, readonly, required, validate } from '@angular/forms/signals'
import { By } from '@angular/platform-browser'
import { HlmNativeSelect } from '@spartan-ng/helm/native-select'
import { CoordinateFields, LookupSelect } from '../index'

@Component({
  imports: [LookupSelect, CoordinateFields],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-lookup-select
      [field]="fields.region"
      id="region"
      label="Region"
      [options]="options()"
      [loading]="loading()"
      [error]="error()"
      [disabled]="locked()"
      (retry)="retries = retries + 1"
    />
    <lib-lookup-select
      [field]="fields.category"
      id="category"
      label="Category"
      [options]="[{ value: '0007', label: 'Alternate category' }]"
      placeholder="Select category"
    />
    <lib-coordinate-fields
      [latitude]="fields.latitude"
      [longitude]="fields.longitude"
      idPrefix="office"
      [mapEnabled]="mapEnabled()"
      (mapRequested)="mapRequests = mapRequests + 1"
    />
    <lib-coordinate-fields
      [latitude]="fields.otherLatitude"
      [longitude]="fields.otherLongitude"
      idPrefix="depot"
      latitudeLabel="Northing"
      longitudeLabel="Easting"
    />
  `,
})
class Consumer {
  readonly model = signal({
    region: '',
    category: '0007',
    latitude: '0',
    longitude: '0.0',
    otherLatitude: '',
    otherLongitude: '',
  })
  readonly schemaLocked = signal(false)
  readonly regionReadonly = signal(false)
  readonly latitudeReadonly = signal(false)
  readonly longitudeDisabled = signal(false)
  readonly longitudeReadonly = signal(false)
  readonly locked = signal(false)
  readonly loading = signal(false)
  readonly error = signal<string | null>(null)
  readonly mapEnabled = signal(false)
  readonly options = signal<readonly { value: string; label: string }[]>([
    { value: '001', label: 'First region' },
    { value: '0', label: 'Zero ID' },
  ])
  readonly fields = form(this.model, path => {
    required(path.region, { message: 'Region is required' })
    disabled(path.region, () => this.schemaLocked())
    readonly(path.region, () => this.regionReadonly())
    disabled(path.latitude, () => this.schemaLocked())
    readonly(path.latitude, () => this.latitudeReadonly())
    disabled(path.longitude, () => this.longitudeDisabled())
    readonly(path.longitude, () => this.longitudeReadonly())
    validate(path.latitude, ({ value }) =>
      value() === 'bad' ? { kind: 'coordinate', message: 'Parent latitude error' } : null,
    )
    required(path.longitude, { message: 'Longitude is required' })
  })
  retries = 0
  mapRequests = 0
}

describe('Shared editor controls with Signal Forms consumers', () => {
  async function setup() {
    TestBed.configureTestingModule({ imports: [Consumer] })
    const fixture = TestBed.createComponent(Consumer)
    await fixture.whenStable()
    const root: HTMLElement = fixture.nativeElement
    return { fixture, consumer: fixture.componentInstance, root }
  }

  it('uses distinct labels, IDs and options for two consumer configurations', async () => {
    const { root } = await setup()
    const region = root.querySelector('select#region') as HTMLSelectElement
    const category = root.querySelector('select#category') as HTMLSelectElement
    expect(region.getAttribute('aria-label')).toBe('Region')
    expect(root.querySelectorAll('#region')).toHaveLength(1)
    expect(region.options[0].textContent).toContain('Choose an option')
    expect(category.options[0].textContent).toContain('Select category')
    expect(category.value).toBe('0007')
    expect(root.querySelector('label[for="depot-latitude"]')?.textContent).toBe('Northing')
    expect(root.querySelector('label[for="office-longitude"]')?.textContent).toBe('Longitude')
    expect(root.querySelector('button')).toBeNull()
  })

  it('writes exact string IDs, preserves unknown current values and accepts external resets', async () => {
    const { fixture, consumer, root } = await setup()
    const select = root.querySelector('select#region') as HTMLSelectElement
    select.value = '001'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await fixture.whenStable()
    expect(consumer.model().region).toBe('001')
    expect(consumer.fields.region().dirty()).toBe(true)
    consumer.fields.region().value.set('missing-id')
    await fixture.whenStable()
    expect(select.value).toBe('missing-id')
    expect(select.selectedOptions[0].textContent).toContain('Current selection (missing-id)')
    consumer.options.set([{ value: 'missing-id', label: 'Resolved name' }])
    await fixture.whenStable()
    expect(select.selectedOptions[0].textContent).toBe('Resolved name')
    consumer.options.set([])
    await fixture.whenStable()
    expect(select.value).toBe('missing-id')
    consumer.fields.region().value.set('')
    await fixture.whenStable()
    expect(select.value).toBe('')
    expect(root.textContent).not.toContain('Current selection')
    consumer.options.set([{ value: '0', label: 'Zero ID' }])
    await fixture.whenStable()
    select.value = '0'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await fixture.whenStable()
    expect(consumer.model().region).toBe('0')
  })

  it('combines schema, parent and loading locks, and emits retry without submitting', async () => {
    const { fixture, consumer, root } = await setup()
    const select = root.querySelector('select#region') as HTMLSelectElement
    consumer.error.set('Options unavailable')
    await fixture.whenStable()
    const retry = root.querySelector('button') as HTMLButtonElement
    expect(retry.type).toBe('button')
    expect(select.getAttribute('aria-describedby')).toBe('region-load-error')
    retry.click()
    expect(consumer.retries).toBe(1)
    consumer.loading.set(true)
    await fixture.whenStable()
    expect(select.disabled).toBe(true)
    expect(retry.disabled).toBe(true)
    expect(select.getAttribute('aria-describedby')).toBe('region-loading region-load-error')
    consumer.schemaLocked.set(true)
    consumer.loading.set(false)
    await fixture.whenStable()
    expect(select.disabled).toBe(true)
    consumer.locked.set(true)
    consumer.schemaLocked.set(false)
    await fixture.whenStable()
    expect(select.disabled).toBe(true)
    consumer.locked.set(false)
    consumer.error.set(null)
    await fixture.whenStable()
    expect(select.disabled).toBe(false)
    expect(select.getAttribute('aria-describedby')).toBeNull()
  })

  it('shows touched lookup validation and clears feedback after correction or disabling', async () => {
    const { fixture, consumer, root } = await setup()
    const select = root.querySelector('select#region') as HTMLSelectElement
    expect(root.textContent).not.toContain('Region is required')
    expect(select.getAttribute('aria-invalid')).not.toBe('true')
    select.dispatchEvent(new Event('blur'))
    await fixture.whenStable()
    expect(consumer.fields.region().touched()).toBe(true)
    expect(root.textContent).toContain('Region is required')
    expect(select.getAttribute('aria-invalid')).toBe('true')
    expect(select.getAttribute('aria-describedby')).toBe('region-errors')
    consumer.schemaLocked.set(true)
    await fixture.whenStable()
    expect(root.textContent).not.toContain('Region is required')
    consumer.schemaLocked.set(false)
    await fixture.whenStable()
    expect(root.textContent).toContain('Region is required')
    consumer.fields.region().value.set('001')
    await fixture.whenStable()
    expect(root.textContent).not.toContain('Region is required')
    expect(select.getAttribute('aria-describedby')).toBeNull()
    expect(select.getAttribute('aria-invalid')).not.toBe('true')
  })

  it.each(['schemaLocked', 'locked', 'loading', 'regionReadonly'] as const)(
    'keeps Helm/native selection and field interaction consistent across %s and user changes',
    async lock => {
      const { fixture, consumer, root } = await setup()
      const select = root.querySelector('select#region') as HTMLSelectElement
      const helm = fixture.debugElement.query(By.directive(HlmNativeSelect))
        .componentInstance as HlmNativeSelect
      consumer.fields.region().value.set('001')
      consumer[lock].set(true)
      await fixture.whenStable()
      expect(select.disabled).toBe(true)
      expect(select.value).toBe('001')
      // Neither a synthetic Helm output nor a dispatched native event may
      // bypass schema/parent locks or mutate the interaction state.
      helm.valueChange.emit('0')
      select.value = '0'
      select.dispatchEvent(new Event('change', { bubbles: true }))
      select.dispatchEvent(new Event('blur'))
      await fixture.whenStable()
      expect(consumer.model().region).toBe('001')
      expect(consumer.fields.region().dirty()).toBe(false)
      expect(consumer.fields.region().touched()).toBe(false)
      expect(select.disabled).toBe(true)
      expect(select.value).toBe('001')
      expect(helm.value()).toBe('001')
      consumer[lock].set(false)
      await fixture.whenStable()
      expect(select.disabled).toBe(false)
      select.value = '0'
      select.dispatchEvent(new Event('change', { bubbles: true }))
      await fixture.whenStable()
      expect(consumer.model().region).toBe('0')
      expect(consumer.fields.region().dirty()).toBe(true)
      expect(consumer.fields.region().touched()).toBe(true)
      expect(select.value).toBe('0')
      expect(helm.value()).toBe('0')
      consumer.fields.region().value.set('001')
      await fixture.whenStable()
      expect(select.value).toBe('001')
      expect(helm.value()).toBe('001')
    },
  )

  it('preserves coordinate zero strings and leaves validation and paired clearing to the parent', async () => {
    const { fixture, consumer, root } = await setup()
    const latitude = root.querySelector('#office-latitude') as HTMLInputElement
    const longitude = root.querySelector('#office-longitude') as HTMLInputElement
    expect(latitude.type).toBe('text')
    expect(latitude.inputMode).toBe('decimal')
    expect(latitude.value).toBe('0')
    expect(longitude.value).toBe('0.0')
    latitude.value = 'bad'
    latitude.dispatchEvent(new Event('input', { bubbles: true }))
    await fixture.whenStable()
    expect(consumer.model().latitude).toBe('bad')
    expect(root.textContent).not.toContain('Parent latitude error')
    latitude.dispatchEvent(new Event('blur'))
    await fixture.whenStable()
    expect(root.textContent).toContain('Parent latitude error')
    expect(latitude.getAttribute('aria-invalid')).toBe('true')
    expect(latitude.getAttribute('aria-describedby')).toBe('office-latitude-errors')
    consumer.schemaLocked.set(true)
    await fixture.whenStable()
    expect(latitude.disabled).toBe(true)
    expect(root.textContent).not.toContain('Parent latitude error')
    consumer.schemaLocked.set(false)
    consumer.fields.latitude().value.set('')
    await fixture.whenStable()
    expect(latitude.value).toBe('')
    expect(longitude.value).toBe('0.0')
    expect(latitude.getAttribute('aria-describedby')).toBeNull()
    consumer.fields.longitude().value.set('')
    consumer.fields.longitude().markAsTouched()
    await fixture.whenStable()
    expect(root.textContent).toContain('Longitude is required')
    expect(longitude.getAttribute('aria-describedby')).toBe('office-longitude-errors')
  })

  it('emits optional map intent without altering coordinates or needing providers', async () => {
    const { fixture, consumer, root } = await setup()
    consumer.mapEnabled.set(true)
    await fixture.whenStable()
    const button = root.querySelector('button') as HTMLButtonElement
    expect(button.textContent).toContain('Choose on map')
    expect(button.type).toBe('button')
    button.click()
    expect(consumer.mapRequests).toBe(1)
    expect(consumer.model().latitude).toBe('0')
    expect(consumer.model().longitude).toBe('0.0')
    consumer.mapEnabled.set(false)
    await fixture.whenStable()
    expect(root.querySelector('button')).toBeNull()
  })

  it('applies minimum hit-target height to the native controls and both optional actions', async () => {
    const { fixture, consumer, root } = await setup()
    consumer.mapEnabled.set(true)
    consumer.error.set('Retry lookup')
    await fixture.whenStable()
    const targets = root.querySelectorAll('select, input, button')
    expect(targets).toHaveLength(8)
    for (const target of targets) {
      expect(target.classList.contains('min-h-11')).toBe(true)
    }
  })

  it.each(['schemaLocked', 'latitudeReadonly', 'longitudeDisabled', 'longitudeReadonly'] as const)(
    'disables the map action while the parent sets %s and restores it on unlock',
    async lock => {
      const { fixture, consumer, root } = await setup()
      consumer.mapEnabled.set(true)
      await fixture.whenStable()
      const button = root.querySelector('button') as HTMLButtonElement
      consumer[lock].set(true)
      await fixture.whenStable()
      expect(button.disabled).toBe(true)
      button.click()
      expect(consumer.mapRequests).toBe(0)
      expect(consumer.model().latitude).toBe('0')
      expect(consumer.model().longitude).toBe('0.0')
      consumer[lock].set(false)
      await fixture.whenStable()
      expect(button.disabled).toBe(false)
      button.click()
      expect(consumer.mapRequests).toBe(1)
    },
  )
})
