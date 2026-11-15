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
    const store = {
      listStatus: signal('ready'),
      visits: signal([]),
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
