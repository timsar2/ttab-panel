import { signal } from '@angular/core'
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

describe('InspectionDetailPage', () => {
  it('renders typed checks and posts date-only required and completed actions separately', async () => {
    const routeParams = new BehaviorSubject(convertToParamMap({ id: '12' }))
    const loadDetail = vi.fn()
    const load = vi.fn()
    const setStatus = vi.fn(() => of(true))
    const addDefect = vi.fn(() => of(41))
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
        statusTypeId: null,
        description: 'Check every field.',
        defects: [],
        correctiveActions: [],
        ...checks,
      }),
      visits: signal(null),
      clear: vi.fn(),
      load,
      loadDetail,
      setStatus,
      addDefect,
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
    }).compileComponents()
    const fixture = TestBed.createComponent(InspectionDetailPage)
    fixture.detectChanges()
    await fixture.whenStable()
    expect(loadDetail).toHaveBeenCalledWith(12)
    expect(fixture.nativeElement.textContent).toContain('False')

    const statusForm = fixture.nativeElement.querySelector(
      '#inspection-status-form',
    ) as HTMLFormElement
    const statusSelect = statusForm.querySelector('select') as HTMLSelectElement
    const statusConfirm = statusForm.querySelector('input[type="checkbox"]') as HTMLInputElement
    statusSelect.value = '3'
    statusSelect.dispatchEvent(new Event('input', { bubbles: true }))
    statusSelect.dispatchEvent(new Event('change', { bubbles: true }))
    statusConfirm.click()
    statusForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await fixture.whenStable()
    fixture.detectChanges()
    expect(setStatus).toHaveBeenCalledWith(12, 3)
    expect(loadDetail).toHaveBeenCalledTimes(2)
    expect(fixture.nativeElement.textContent).toContain('Verify it in the Admin list')

    const defectForm = fixture.nativeElement.querySelector(
      '#inspection-defect-form',
    ) as HTMLFormElement
    const defectDate = defectForm.querySelector('input[type="date"]') as HTMLInputElement
    const defectDescription = defectForm.querySelector('textarea') as HTMLTextAreaElement
    defectDate.value = '2026-11-20'
    defectDate.dispatchEvent(new Event('input'))
    defectDescription.value = 'Replace tire'
    defectDescription.dispatchEvent(new Event('input'))
    defectForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await fixture.whenStable()
    expect(addDefect).toHaveBeenCalledWith({
      id: 0,
      inspectionVisitId: 12,
      dueDate: '2026-11-20',
      description: 'Replace tire',
    })

    const actionForm = fixture.nativeElement.querySelector(
      '#inspection-action-form',
    ) as HTMLFormElement
    const actionDate = actionForm.querySelector('input[type="date"]') as HTMLInputElement
    const actionDescription = actionForm.querySelector('textarea') as HTMLTextAreaElement
    actionDate.value = '2026-11-21'
    actionDate.dispatchEvent(new Event('input'))
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
    fixture.destroy()
  })
})
