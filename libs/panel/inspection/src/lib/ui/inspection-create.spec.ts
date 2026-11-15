import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { InspectionStore } from '@org/transport-inspection-data-access'
import { of } from 'rxjs'
import { INSPECTION_LANGUAGE, INSPECTION_LOOKUPS, INSPECTION_SCOPE } from '../inspection.routes'
import { InspectionCreatePage } from './inspection-create'

describe('InspectionCreatePage', () => {
  it('loads company driver and vehicle lookups on entry and renders every explicit check', async () => {
    const scope = signal<number | null>(5)
    const searchDrivers = vi.fn(() => of([{ id: 20, label: 'Driver Twenty' }]))
    const searchVehicles = vi.fn(() =>
      of({
        items: [{ id: 30, label: 'AB123' }],
        pageNumber: 1,
        hasNext: true,
      }),
    )
    await TestBed.configureTestingModule({
      imports: [InspectionCreatePage],
      providers: [
        provideRouter([]),
        { provide: InspectionStore, useValue: {} },
        { provide: INSPECTION_LANGUAGE, useValue: signal<'en' | 'fa'>('en') },
        { provide: INSPECTION_SCOPE, useValue: scope },
        {
          provide: INSPECTION_LOOKUPS,
          useValue: {
            drivers: () => searchDrivers,
            vehicles: () => searchVehicles,
          },
        },
      ],
    }).compileComponents()
    const fixture = TestBed.createComponent(InspectionCreatePage)
    fixture.detectChanges()
    await fixture.whenStable()
    expect(searchDrivers).toHaveBeenCalledWith('')
    expect(searchVehicles).toHaveBeenCalledWith(1)
    expect(fixture.nativeElement.querySelectorAll('fieldset input[type="radio"]')).toHaveLength(24)
    expect(fixture.nativeElement.textContent).toContain('Driver Twenty')
    expect(fixture.nativeElement.textContent).toContain('AB123')
    const driver = fixture.nativeElement.querySelector('#inspection-driver') as HTMLSelectElement
    const vehicle = fixture.nativeElement.querySelector('#inspection-vehicle') as HTMLSelectElement
    driver.value = '20'
    driver.dispatchEvent(new Event('change'))
    vehicle.value = '30'
    vehicle.dispatchEvent(new Event('change'))
    scope.set(6)
    fixture.detectChanges()
    await fixture.whenStable()
    expect(searchDrivers).toHaveBeenCalledTimes(2)
    expect(searchVehicles).toHaveBeenCalledTimes(2)
    expect(driver.value).toBe('')
    expect(vehicle.value).toBe('')
    fixture.destroy()
  })
})
