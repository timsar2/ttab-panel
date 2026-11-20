import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { BehaviorSubject } from 'rxjs'
import { INSPECTION_LANGUAGE, INSPECTION_SCOPE } from '../inspection.routes'
import { InspectionPage } from './inspection-page'
import { InspectionStore } from '@org/transport-inspection-data-access'

describe('InspectionPage', () => {
  it('loads the authorized global list on route entry and uses bounded allowlisted query state', async () => {
    const queryParams = new BehaviorSubject(convertToParamMap({}))
    const load = vi.fn()
    const visits = signal([] as Array<Record<string, unknown>>)
    const store = {
      listStatus: signal('ready'),
      visits,
      pageNumber: signal(1),
      pageSize: signal(25),
      orderBy: signal('InspectionDate DESC'),
      hasNext: signal(false),
      load,
    }
    await TestBed.configureTestingModule({
      imports: [InspectionPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParams.asObservable(),
            snapshot: { queryParamMap: queryParams.value },
          },
        },
        { provide: InspectionStore, useValue: store },
        { provide: INSPECTION_LANGUAGE, useValue: signal<'en' | 'fa'>('en') },
        { provide: INSPECTION_SCOPE, useValue: signal<number | null>(5) },
      ],
    }).compileComponents()
    const fixture = TestBed.createComponent(InspectionPage)
    fixture.detectChanges()
    await fixture.whenStable()
    expect(load).toHaveBeenCalledWith({
      pageNumber: 1,
      pageSize: 25,
      orderBy: 'InspectionDate DESC',
    })
    expect(fixture.nativeElement.textContent).toContain('not filtered by the selected company')

    visits.set([
      {
        id: 12,
        inspectorId: 5,
        inspectorName: 'Inspector',
        inspectionDate: '2026-11-14',
        driverId: 20,
        driverName: 'Driver',
        vehicleId: 30,
        carPlate: 'AB123',
        statusTypeName: 'Pending approval',
      },
    ])
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain('Pending approval')

    queryParams.next(convertToParamMap({ page: '7', orderBy: 'DriverName DESC' }))
    fixture.detectChanges()
    await fixture.whenStable()
    expect(load).toHaveBeenLastCalledWith({
      pageNumber: 7,
      pageSize: 25,
      orderBy: 'DriverName DESC',
    })
    fixture.destroy()
  })
})
