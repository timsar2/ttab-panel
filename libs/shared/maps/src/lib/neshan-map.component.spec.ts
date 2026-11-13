import { TestBed } from '@angular/core/testing'
import { NeshanMapComponent } from './neshan-map.component'

describe('NeshanMapComponent', () => {
  it('renders a configuration fallback instead of initializing the map without a Web Map key', async () => {
    await TestBed.configureTestingModule({ imports: [NeshanMapComponent] }).compileComponents()
    const fixture = TestBed.createComponent(NeshanMapComponent)
    fixture.componentRef.setInput('apiKey', null)
    fixture.componentRef.setInput('language', 'en')
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Neshan Web Map API key is not configured.',
    )
    expect(fixture.nativeElement.querySelector('#map')).toBeNull()
  })
})
