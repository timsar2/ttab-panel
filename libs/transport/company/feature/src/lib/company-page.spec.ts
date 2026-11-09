import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { SessionStore } from '@org/auth-data-access'
import { Subject } from 'rxjs'
import { createCompanyRoutes } from '../index'

describe('company search routes', () => {
  const response = {
    code: '2000',
    massage: 'Success',
    result: {
      list: [
        {
          id: 2,
          name: 'Scoped Company',
          companyTypeName: null,
          provinceName: null,
          cityName: null,
          companyLogo: null,
        },
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 1,
        pageSize: 10,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    },
  }
  const changes = new Subject<number>()
  afterEach(() => TestBed.inject(HttpTestingController).verify())
  it.each([
    { path: 'companies', apiUrl: '/api/v1', heading: 'Companies' },
    { path: 'organisations', apiUrl: '/other/v1', heading: 'Organisations' },
  ])('supports an alternate consumer at $path without app imports', async config => {
    const onAction = vi.fn()
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionStore,
          useValue: {
            changes$: changes,
            configured: () => true,
            user: () => ({ id: 'identity' }),
            isAuthenticated: () => true,
          },
        },
        provideRouter(createCompanyRoutes({ ...config, onAction, actionLabel: 'Inspect' })),
      ],
    })
    const harness = await RouterTestingHarness.create(`/${config.path}?name=first&page=2`)
    const http = TestBed.inject(HttpTestingController)
    const request = http.expectOne(`${config.apiUrl}/companys/search`)
    expect(request.request.body).toEqual({ name: 'first', pageNumber: 2, pageSize: 10 })
    request.flush({
      ...response,
      result: { ...response.result, pagination: { ...response.result.pagination, currentPage: 2 } },
    })
    await harness.fixture.whenStable()
    expect(harness.routeNativeElement?.textContent).toContain(config.heading)
    expect(harness.routeNativeElement?.textContent).toContain('Scoped Company')
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('tbody button')?.click()
    expect(onAction).toHaveBeenCalledWith(response.result.list[0])
    await harness.navigateByUrl(`/${config.path}?name=second&page=1`)
    http
      .expectOne(`${config.apiUrl}/companys/search`)
      .flush({ ...response, result: { ...response.result, list: [] } })
    await harness.fixture.whenStable()
    expect(harness.routeNativeElement?.textContent).not.toContain('Scoped Company')
    expect(harness.routeNativeElement?.textContent).toContain('No records found.')
  })
})
