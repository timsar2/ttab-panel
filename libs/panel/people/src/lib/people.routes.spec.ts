import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { SessionStore, provideAuth } from '@org/auth-data-access'
import {
  PeopleCompanyId,
  PeopleSearchStore,
  peopleCompanyId,
} from '@org/transport-people-data-access'
import { Subject, identity, of } from 'rxjs'
import { createPeopleRoutes } from './people.routes'

const response = (page = 1, id = 12) => ({
  code: '2000',
  massage: 'Success',
  result: {
    list: [{ id, fullName: `Person ${id}`, nationalId: '0012', profileImage: null }],
    pagination: {
      currentPage: page,
      pageSize: 10,
      totalCount: 21,
      totalPages: 3,
      hasPreviousPage: page > 1,
      hasNextPage: page < 3,
    },
  },
})

describe('people feature consumers', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify())

  async function setup(path = 'people', apiUrl = '/api', allowed = true) {
    const company = signal<PeopleCompanyId | null>(peopleCompanyId(7))
    const access = signal(allowed)
    const changes = new Subject<number>()
    const user = signal<{ id: string; roles: string[] } | null>({
      id: 'identity-not-person',
      roles: [],
    })
    const version = signal(1)
    const selected = vi.fn()
    TestBed.configureTestingModule({
      providers: [
        provideAuth({ apiUrl: '/auth', tenant: 'test' }),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionStore,
          useValue: {
            user,
            changes$: changes,
            configured: () => true,
            isAuthenticated: () => user() !== null,
            version,
            accessToken: () => null,
            tenant: () => 'test',
            untilChanged: () => identity,
          },
        },
        provideRouter(
          createPeopleRoutes({
            path,
            apiUrl,
            company: () => company,
            access: () => () => of(access()),
            heading: 'Directory',
            onSelect: selected,
            actionLabel: 'Choose record',
          }),
        ),
      ],
    })
    const harness = await RouterTestingHarness.create()
    await harness.navigateByUrl('/' + path)
    TestBed.tick()
    harness.detectChanges()
    return {
      harness,
      http: TestBed.inject(HttpTestingController),
      company,
      access,
      selected,
      user,
      version,
      changes,
    }
  }

  it.each([
    ['people', '/api'],
    ['directory', '/alternate'],
  ])('supports the %s consumer with explicit scope and selection', async (path, apiUrl) => {
    const { harness, http, selected } = await setup(path, apiUrl)
    const initial = http.expectOne(apiUrl + '/users/search')
    expect(initial.request.body).toEqual({
      companyId: 7,
      fullName: null,
      nationalId: null,
      userShiftState: null,
      pageNumber: 1,
      pageSize: 10,
    })
    initial.flush(response())
    harness.detectChanges()
    expect(harness.routeNativeElement?.textContent).toContain('Person 12')
    expect(harness.routeNativeElement?.querySelector('img')).toBeNull()
    const element = harness.routeNativeElement
    if (!element) throw new Error('People page did not render')
    const button = Array.from(element.querySelectorAll('button')).find(item =>
      item.textContent?.includes('Choose record'),
    )
    if (!button) throw new Error('Selection action did not render')
    button.click()
    expect(selected).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }))

    const input = element.querySelector<HTMLInputElement>('#people-name')
    const searchForm = element.querySelector('form')
    if (!input || !searchForm) throw new Error('Search form did not render')
    input.value = 'Sam'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    searchForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('name=Sam'))
    TestBed.tick()
    const search = http.expectOne(apiUrl + '/users/search')
    expect(search.request.body.fullName).toBe('Sam')
    expect(search.request.body.companyId).toBe(7)
    search.flush(response())
    await harness.navigateByUrl('/' + path + '?name=Sam&nationalId=0012&shift=HasShift&page=2')
    TestBed.tick()
    const next = http.expectOne(apiUrl + '/users/search')
    expect(next.request.body).toEqual({
      companyId: 7,
      fullName: 'Sam',
      nationalId: '0012',
      userShiftState: 'HasShift',
      pageNumber: 2,
      pageSize: 10,
    })
    next.flush(response(2, 13))
    harness.detectChanges()
    expect(harness.routeNativeElement?.textContent).not.toContain('Person 12')
    expect(harness.routeNativeElement?.textContent).toContain('Person 13')
  })

  it('denies unapproved reads without making an HTTP request', async () => {
    const { harness, http } = await setup('people', '/api', false)
    expect(harness.routeNativeElement?.textContent).toContain('You do not have access')
    http.expectNone(() => true)
  })

  it('clears records, selection and pending HTTP on company and session changes', async () => {
    const { harness, http, company, user, version, changes } = await setup()
    const old = http.expectOne('/api/users/search')
    const input = harness.routeNativeElement?.querySelector<HTMLInputElement>('#people-name')
    if (!input) throw new Error('Search input did not render')
    input.value = 'Unsubmitted private filter'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    TestBed.tick()
    harness.detectChanges()
    company.set(peopleCompanyId(8))
    TestBed.tick()
    harness.detectChanges()
    expect(input.value).toBe('')
    expect(old.cancelled).toBe(true)
    const current = http.expectOne('/api/users/search')
    expect(current.request.body.companyId).toBe(8)
    current.flush(response())
    harness.detectChanges()
    const store = harness.routeDebugElement?.injector.get(PeopleSearchStore)
    if (!store) throw new Error('People page store was not provided')
    store.select(response().result.list[0].id as Parameters<typeof store.select>[0])
    expect(store.selected()).not.toBeNull()
    user.set(null)
    version.set(2)
    changes.next(2)
    TestBed.tick()
    harness.detectChanges()
    expect(store.page()).toBeNull()
    expect(store.selected()).toBeNull()
    expect(harness.routeNativeElement?.textContent).not.toContain('Person 12')
    http.expectNone(() => true)
  })

  it('normalizes unsupported URL filters and shows backend denial without raw errors', async () => {
    const { harness, http } = await setup()
    http.expectOne('/api/users/search').flush(response())
    await harness.navigateByUrl('/people?page=9007199254740992&size=999&shift=wrong')
    TestBed.tick()
    const request = http.expectOne('/api/users/search')
    expect(request.request.body.pageNumber).toBe(1)
    expect(request.request.body.pageSize).toBe(10)
    expect(request.request.body.userShiftState).toBeNull()
    request.flush({ secret: 'private backend trace' }, { status: 403, statusText: 'Forbidden' })
    harness.detectChanges()
    expect(harness.routeNativeElement?.textContent).toContain('You do not have access')
    expect(harness.routeNativeElement?.textContent).not.toContain('private backend trace')
    expect(harness.routeNativeElement?.textContent).not.toContain('Person 12')
  })
})
