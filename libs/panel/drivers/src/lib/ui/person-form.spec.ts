import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { FileUploadControl } from '@org/ui-forms'
import { DriverPersonForm, DriverPersonSubmission } from './person-form'

describe('reusable driver Person Signal Form', () => {
  afterEach(() => TestBed.resetTestingModule())
  it('gates untouched errors and emits only a valid typed draft', async () => {
    const fixture = TestBed.createComponent(DriverPersonForm)
    fixture.componentRef.setInput('allowed', true)
    const saved: DriverPersonSubmission[] = []
    fixture.componentInstance.submitted.subscribe(value => saved.push(value))
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    const root = fixture.nativeElement as HTMLElement
    expect(root.querySelector('hlm-field-error')).toBeNull()
    root
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await fixture.whenStable()
    fixture.detectChanges()
    expect(saved).toEqual([])
    expect(root.textContent).toContain('Enter a mobile number.')
    const input = root.querySelector<HTMLInputElement>('#person-mobileNumber')
    if (!input) throw new Error('Missing mobile input')
    input.value = '09123456789'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const national = root.querySelector<HTMLInputElement>('#person-nationalId')
    if (!national) throw new Error('Missing national ID input')
    national.value = '0012345678'
    national.dispatchEvent(new Event('input', { bubbles: true }))
    fixture.detectChanges()
    root
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await fixture.whenStable()
    expect(saved[0]?.draft.mobileNumber).toBe('09123456789')
    expect(saved[0]?.draft.nationalId).toBe('0012345678')
    expect(saved[0]?.image).toBeNull()
  })
  it('defaults to denied and does not submit side-effectful creation', async () => {
    const fixture = TestBed.createComponent(DriverPersonForm)
    const output = vi.fn()
    fixture.componentInstance.submitted.subscribe(output)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input')?.disabled,
    ).toBe(true)
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'))
    expect(output).not.toHaveBeenCalled()
  })
  it('reuses configured city, paired coordinate and validated profile upload controls', async () => {
    const fixture = TestBed.createComponent(DriverPersonForm)
    fixture.componentRef.setInput('allowed', true)
    fixture.componentRef.setInput('cities', [{ value: '11', label: 'Approved city' }])
    const saved: DriverPersonSubmission[] = []
    fixture.componentInstance.submitted.subscribe(value => saved.push(value))
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    const root = fixture.nativeElement as HTMLElement
    const setInput = (id: string, value: string) => {
      const input = root.querySelector<HTMLInputElement>('#' + id)
      if (!input) throw new Error('Missing input ' + id)
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    setInput('person-mobileNumber', '09123456789')
    setInput('person-nationalId', '0012345678')
    setInput('person-latitude', '35.7')
    root
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await fixture.whenStable()
    fixture.detectChanges()
    expect(saved).toHaveLength(0)
    expect(root.textContent).toContain('Enter both latitude and longitude.')
    setInput('person-longitude', '51.4')
    const city = root.querySelector<HTMLSelectElement>('#person-city')
    if (!city) throw new Error('Missing configured city lookup')
    city.value = '11'
    city.dispatchEvent(new Event('change', { bubbles: true }))
    const upload = fixture.debugElement.query(By.directive(FileUploadControl))
      .componentInstance as FileUploadControl
    upload.value.set({
      kind: 'replace',
      file: {
        name: 'profile.webp',
        extension: '.webp',
        mime: 'image/webp',
        size: 1,
        dataUrl: 'data:image/webp;base64,YQ==',
      },
    })
    fixture.detectChanges()
    root
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await fixture.whenStable()
    expect(saved[0]?.draft).toMatchObject({ cityId: '11', latitude: '35.7', longitude: '51.4' })
    expect(saved[0]?.image).toEqual({
      extension: '.webp',
      data: 'data:image/webp;base64,YQ==',
      deleteCurrentImage: false,
    })
  })
})
