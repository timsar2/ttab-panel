import { Component, EventEmitter, Input, Output, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { InspectionStore, INSPECTION_CHECKS } from '@org/transport-inspection-data-access'
import { BehaviorSubject } from 'rxjs'
import { INSPECTOR_COMPANY_ID, INSPECTOR_LANGUAGE } from '../inspector.routes'
import { InspectorVisitDetailPage } from './inspector-visit-detail'
import { JalaliDatePicker } from '@org/ui-forms'

@Component({
  selector: 'lib-jalali-date-picker',
  standalone: true,
  template: '',
})
class TestJalaliDatePicker {
  @Input() inputId = ''
  @Input() language: 'en' | 'fa' = 'en'
  @Input() value: string | null = null
  @Input() disabled = false
  @Output() valueChange = new EventEmitter<string | null>()
}

describe('InspectorVisitDetailPage', () => {
  it('shows the automatically managed inspection status without status controls', async () => {
    const params = new BehaviorSubject(convertToParamMap({ id: '12' }))
    const detail = {
      id: 12,
      inspectorId: 5,
      inspectorName: 'Inspector',
      inspectionDate: '2026-11-14',
      driverId: 20,
      driverName: 'Driver',
      vehicleId: 30,
      carPlate: 'AB123',
      statusTypeName: 'Pending approval',
      description: 'Inspection details',
      defects: [],
      correctiveActions: [],
      ...Object.fromEntries(INSPECTION_CHECKS.map(key => [key, false])),
    }
    const store = {
      detailStatus: signal('ready'),
      detail: signal(detail),
      loadDetail: vi.fn(),
      clear: vi.fn(),
      addDefect: vi.fn(),
      approveVisit: vi.fn(),
    }
    await TestBed.configureTestingModule({
      imports: [InspectorVisitDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params.asObservable(), snapshot: { paramMap: params.value } },
        },
        { provide: InspectionStore, useValue: store },
        { provide: INSPECTOR_COMPANY_ID, useValue: signal(5) },
        { provide: INSPECTOR_LANGUAGE, useValue: signal<'en' | 'fa'>('en') },
      ],
    })
      .overrideComponent(InspectorVisitDetailPage, {
        remove: { imports: [JalaliDatePicker] },
        add: { imports: [TestJalaliDatePicker] },
      })
      .compileComponents()
    const fixture = TestBed.createComponent(InspectorVisitDetailPage)
    fixture.detectChanges()
    await fixture.whenStable()

    expect(store.loadDetail).toHaveBeenCalledWith(12)
    expect(store.loadDetail).toHaveBeenCalledTimes(1)
    ;(
      fixture.componentInstance as unknown as { setRequiredActionDate(value: string): void }
    ).setRequiredActionDate('2026-11-20')
    fixture.detectChanges()
    await fixture.whenStable()
    expect(store.loadDetail).toHaveBeenCalledTimes(1)
    expect(fixture.nativeElement.textContent).toContain('Pending approval')
    expect(fixture.nativeElement.querySelector('#inspection-status-form')).toBeNull()
    expect(fixture.nativeElement.querySelector('#inspection-required-action-form')).not.toBeNull()
    expect(fixture.nativeElement.querySelector('#inspection-approve')).not.toBeNull()
    expect(fixture.nativeElement.textContent).not.toContain('Completed corrective actions')
    fixture.destroy()
  })
})
