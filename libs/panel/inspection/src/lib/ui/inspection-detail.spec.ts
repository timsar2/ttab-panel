import { Component, EventEmitter, Input, Output, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import {
  InspectionCheck,
  InspectionStore,
  INSPECTION_CHECKS,
} from '@org/transport-inspection-data-access'
import { BehaviorSubject, of } from 'rxjs'
import { INSPECTION_CAN_MANAGE, INSPECTION_LANGUAGE, INSPECTION_SCOPE } from '../inspection.routes'
import { InspectionDetailPage } from './inspection-detail'
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

describe('InspectionDetailPage', () => {
  it('shows only completed actions and posts their date-only payload', async () => {
    const routeParams = new BehaviorSubject(convertToParamMap({ id: '12' }))
    const loadDetail = vi.fn()
    const load = vi.fn()
    const addCorrectiveAction = vi.fn(() => of(42))
    const checks = Object.fromEntries(INSPECTION_CHECKS.map(key => [key, false])) as Record<
      InspectionCheck,
      boolean
    >
    const store = {
      detailStatus: signal('ready'),
      detail: signal({
        id: 12,
        inspectorId: 5,
        inspectorName: 'Inspector',
        inspectionDate: '2026-11-14',
        driverId: 20,
        driverName: 'Driver',
        vehicleId: 30,
        carPlate: 'AB123',
        statusTypeName: 'Pending approval',
        description: 'Check every field.',
        defects: [],
        correctiveActions: [],
        ...checks,
      }),
      visits: signal(null),
      clear: vi.fn(),
      load,
      loadDetail,
      addCorrectiveAction,
    }
    await TestBed.configureTestingModule({
      imports: [InspectionDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: routeParams.asObservable(),
            snapshot: { paramMap: routeParams.value },
          },
        },
        { provide: InspectionStore, useValue: store },
        { provide: INSPECTION_LANGUAGE, useValue: signal<'en' | 'fa'>('en') },
        { provide: INSPECTION_SCOPE, useValue: signal<number | null>(5) },
        { provide: INSPECTION_CAN_MANAGE, useValue: signal(true) },
      ],
    })
      .overrideComponent(InspectionDetailPage, {
        remove: { imports: [JalaliDatePicker] },
        add: { imports: [TestJalaliDatePicker] },
      })
      .compileComponents()
    const fixture = TestBed.createComponent(InspectionDetailPage)
    fixture.detectChanges()
    await fixture.whenStable()
    expect(loadDetail).toHaveBeenCalledWith(12)
    expect(fixture.nativeElement.textContent).toContain('Needs attention')
    expect(fixture.nativeElement.textContent).toContain('Pending approval')
    expect(fixture.nativeElement.querySelector('#inspection-status-form')).toBeNull()

    expect(fixture.nativeElement.querySelector('#inspection-defect-form')).toBeNull()
    expect(fixture.nativeElement.textContent).not.toContain('Required actions')

    const actionForm = fixture.nativeElement.querySelector(
      '#inspection-action-form',
    ) as HTMLFormElement
    const actionDescription = actionForm.querySelector('textarea') as HTMLTextAreaElement
    ;(
      fixture.componentInstance as unknown as { setCompletedAt(value: string): void }
    ).setCompletedAt('2026-11-21')
    actionDescription.value = 'Tire replaced'
    actionDescription.dispatchEvent(new Event('input'))
    actionForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await fixture.whenStable()
    expect(addCorrectiveAction).toHaveBeenCalledWith({
      id: 0,
      inspectionVisitId: 12,
      completedAt: '2026-11-21',
      description: 'Tire replaced',
    })
    expect(loadDetail).toHaveBeenCalledTimes(2)
    fixture.destroy()
  })
})
