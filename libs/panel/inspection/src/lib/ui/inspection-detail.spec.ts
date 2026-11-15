import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import {
  InspectionCheck,
  InspectionStore,
  INSPECTION_CHECKS,
} from '@org/transport-inspection-data-access'
import { BehaviorSubject, of } from 'rxjs'
import { INSPECTION_LANGUAGE, INSPECTION_SCOPE } from '../inspection.routes'
import { InspectionDetailPage } from './inspection-detail'

describe('InspectionDetailPage', () => {
  it('renders typed checks and posts date-only required and completed actions separately', async () => {
    const routeParams = new BehaviorSubject(convertToParamMap({ id: '12' }))
    const loadDetail = vi.fn()
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
      clear: vi.fn(),
      loadDetail,
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
      ],
    }).compileComponents()
    const fixture = TestBed.createComponent(InspectionDetailPage)
    fixture.detectChanges()
    await fixture.whenStable()
    expect(loadDetail).toHaveBeenCalledWith(12)
    expect(fixture.nativeElement.textContent).toContain('False')

    const forms = fixture.nativeElement.querySelectorAll('form') as NodeListOf<HTMLFormElement>
    const defectDate = forms[0].querySelector('input[type="date"]') as HTMLInputElement
    const defectDescription = forms[0].querySelector('textarea') as HTMLTextAreaElement
    defectDate.value = '2026-11-20'
    defectDate.dispatchEvent(new Event('input'))
    defectDescription.value = 'Replace tire'
    defectDescription.dispatchEvent(new Event('input'))
    forms[0].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await fixture.whenStable()
    expect(addDefect).toHaveBeenCalledWith({
      id: 0,
      inspectionVisitId: 12,
      dueDate: '2026-11-20',
      description: 'Replace tire',
    })

    const actionDate = forms[1].querySelector('input[type="date"]') as HTMLInputElement
    const actionDescription = forms[1].querySelector('textarea') as HTMLTextAreaElement
    actionDate.value = '2026-11-21'
    actionDate.dispatchEvent(new Event('input'))
    actionDescription.value = 'Tire replaced'
    actionDescription.dispatchEvent(new Event('input'))
    forms[1].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
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
