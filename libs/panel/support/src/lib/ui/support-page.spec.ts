import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { SupportApi, SupportStore, supportCompanyId } from '@org/transport-support-data-access'
import { BehaviorSubject } from 'rxjs'
import { SUPPORT_LANGUAGE } from '../support.routes'
import { SupportPage } from './support-page'

describe('SupportPage', () => {
  it('loads the default required type on route entry and follows supported URL filters', async () => {
    const queryParams = new BehaviorSubject(convertToParamMap({}))
    const load = vi.fn()
    const store = {
      searchStatus: signal('ready'),
      page: signal({
        items: [],
        pagination: { currentPage: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
      }),
      load,
    }
    const companyId = signal(supportCompanyId(5))
    await TestBed.configureTestingModule({
      imports: [SupportPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParams.asObservable(),
            snapshot: { queryParamMap: queryParams.value },
          },
        },
        { provide: SupportApi, useValue: { companyId } },
        { provide: SUPPORT_LANGUAGE, useValue: signal<'en' | 'fa'>('en') },
      ],
    })
      .overrideProvider(SupportStore, { useValue: store })
      .compileComponents()

    const fixture = TestBed.createComponent(SupportPage)
    fixture.detectChanges()
    await fixture.whenStable()
    expect(load).toHaveBeenCalledWith({
      supportTypeId: 2,
      fullName: '',
      isAnswered: null,
      pageIndex: 0,
      pageSize: 10,
      sort: 'RequestDate DESC',
    })
    expect(fixture.nativeElement.textContent).toContain('No requests match these filters.')

    queryParams.next(
      convertToParamMap({
        type: '4',
        answered: 'false',
        q: 'Alex',
        page: '3',
        size: '25',
        sort: 'Subject',
      }),
    )
    fixture.detectChanges()
    await fixture.whenStable()
    expect(load).toHaveBeenLastCalledWith({
      supportTypeId: 4,
      fullName: 'Alex',
      isAnswered: false,
      pageIndex: 2,
      pageSize: 25,
      sort: 'Subject',
    })
    fixture.destroy()
  })
})
