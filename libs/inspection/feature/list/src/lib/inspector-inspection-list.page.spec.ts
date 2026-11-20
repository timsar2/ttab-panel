import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router'
import { PreferencesStore } from '@org/platform'
import { InspectionStore, InspectionVisitRow } from '@org/transport-inspection-data-access'
import { signal } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { InspectorInspectionListPage } from './inspector-inspection-list.page'

describe('InspectorInspectionListPage', () => {
  let fixture: ComponentFixture<InspectorInspectionListPage>
  const queryParamMap = new BehaviorSubject(convertToParamMap({}))
  const store = {
    visits: signal(null),
    listStatus: signal('ready'),
    hasNext: signal(false),
    load: vi.fn(),
  }

  beforeEach(async () => {
    store.visits.set(null)
    store.load.mockClear()
    queryParamMap.next(convertToParamMap({}))
    await TestBed.configureTestingModule({
      imports: [InspectorInspectionListPage],
      providers: [
        { provide: InspectionStore, useValue: store },
        { provide: PreferencesStore, useValue: { isRtl: signal(false) } },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap, snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents()
    fixture = TestBed.createComponent(InspectorInspectionListPage)
    fixture.detectChanges()
  })

  it('loads the authenticated inspector list with bounded paging', () => {
    expect(store.load).toHaveBeenCalledWith({
      pageNumber: 1,
      pageSize: 25,
      orderBy: 'InspectionDate DESC',
    })
  })

  it('shows the empty state when the authorized list is empty', () => {
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain(
      'You have not submitted any inspections yet.',
    )
  })

  it('renders the visit status and links each row to its detail route', () => {
    store.visits.set([
      {
        id: 23 as InspectionVisitRow['id'],
        inspectorId: 70000,
        inspectorName: 'Inspector',
        inspectionDate: '2026-11-20',
        driverId: 8,
        driverName: 'Driver',
        vehicleId: 12,
        carPlate: '12A345',
        statusTypeName: 'Pending approval',
      },
    ])
    fixture.detectChanges()

    expect(fixture.nativeElement.textContent).toContain('Pending approval')
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[]
    expect(links.some(link => link.textContent?.includes('View'))).toBe(true)
  })
})
