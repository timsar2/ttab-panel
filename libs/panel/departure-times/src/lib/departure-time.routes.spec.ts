import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { SessionStore, provideAuth } from '@org/auth-data-access'
import {
  DepartureCompanyId,
  DepartureTimesStore,
  departureCompanyId,
  departureTimeId,
} from '@org/transport-departure-times-data-access'
import { Subject, identity, of } from 'rxjs'
import { createDepartureTimeRoutes } from './departure-time.routes'

const envelope = (result: unknown) => ({ code: '2000', massage: null, result })
const detail = (id = 3, companyId = 7) => ({
  id,
  companyId,
  name: 'Morning',
  shiftTime: '07:15:01.1234567',
})

describe('departure-time reusable routes', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify()
    TestBed.resetTestingModule()
  })
  async function setup(
    path = 'slots',
    apiUrl = '/api',
    initial = '',
    manage = true,
    allowed = true,
  ) {
    const company = signal<DepartureCompanyId | null>(departureCompanyId(7))
    const canManage = signal(manage)
    const user = signal<{ id: string; roles: string[] } | null>({ id: 'staff', roles: [] })
    const version = signal(1)
    const changes = new Subject<number>()
    TestBed.configureTestingModule({
      providers: [
        provideAuth({ apiUrl: '/auth', tenant: 'test' }),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionStore,
          useValue: {
            user,
            version,
            changes$: changes,
            configured: () => true,
            isAuthenticated: () => !!user(),
            accessToken: () => null,
            tenant: () => 'test',
            untilChanged: () => identity,
          },
        },
        provideRouter(
          createDepartureTimeRoutes({
            path,
            apiUrl,
            endpoints: { collection: 'times', save: 'times/upsert' },
            company: () => company,
            access: () => () => of(allowed),
            canManage: () => canManage,
          }),
        ),
      ],
    })
    const harness = await RouterTestingHarness.create()
    await harness.navigateByUrl('/' + path + initial)
    TestBed.tick()
    harness.detectChanges()
    return {
      harness,
      http: TestBed.inject(HttpTestingController),
      company,
      canManage,
      user,
      version,
      changes,
    }
  }
  function root(harness: RouterTestingHarness) {
    const element = harness.routeNativeElement
    if (!element) throw new Error('Departure-time page did not render')
    return element
  }
  function input(harness: RouterTestingHarness, id: string, value: string) {
    const control = root(harness).querySelector<HTMLInputElement>('#' + id)
    if (!control) throw new Error('Missing input ' + id)
    control.value = value
    control.dispatchEvent(new Event('input', { bubbles: true }))
    TestBed.tick()
    harness.detectChanges()
    return control
  }
  async function save(harness: RouterTestingHarness) {
    const form = root(harness).querySelector('form')
    if (!form) throw new Error('Editor form did not render')
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    TestBed.tick()
    harness.detectChanges()
    await Promise.resolve()
  }

  it.each([
    ['slots', '/api'],
    ['travel-clock', '/alternate'],
  ])('supports bounded list and editor links at %s', async (path, base) => {
    const { harness, http } = await setup(path, base)
    const request = http.expectOne(base + '/times')
    expect(request.request.body).toEqual({ companyId: 7, name: null })
    request.flush(envelope([detail()]))
    harness.detectChanges()
    expect(root(harness).textContent).toContain('07:15:01.1234567')
    expect(root(harness).textContent).toContain('not guaranteed to be complete')
    expect(root(harness).querySelector('nav')).toBeNull()
    expect(root(harness).querySelector('tbody a')?.getAttribute('href')).toBe(`/${path}/3/edit`)
    input(harness, 'departure-search', 'Morning')
    await save(harness)
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('name=Morning'))
    TestBed.tick()
    const search = http.expectOne(base + '/times')
    expect(search.request.body).toEqual({ companyId: 7, name: 'Morning' })
    search.flush(envelope([]))
    harness.detectChanges()
    expect(root(harness).textContent).toContain('No records found')
  })

  it('hydrates exact time once, retains failed drafts, maps field errors and blocks duplicate writes', async () => {
    const { harness, http } = await setup('slots', '/api', '/3/edit')
    http.expectOne('/api/times/3').flush(envelope(detail()))
    harness.detectChanges()
    expect(root(harness).querySelector<HTMLInputElement>('#departure-time')?.value).toBe(
      '07:15:01.1234567',
    )
    input(harness, 'departure-name', 'Edited')
    const editorStore = harness.routeDebugElement?.injector.get(DepartureTimesStore)
    if (!editorStore) throw new Error('Editor store is missing')
    editorStore.loadDetail(departureTimeId(3))
    http.expectOne('/api/times/3').flush(envelope({ ...detail(), name: 'Server refresh' }))
    harness.detectChanges()
    expect(root(harness).querySelector<HTMLInputElement>('#departure-name')?.value).toBe('Edited')
    await save(harness)
    const request = http.expectOne('/api/times/upsert')
    expect(request.request.body).toEqual({
      id: 3,
      companyId: 7,
      name: 'Edited',
      shiftTime: '07:15:01.1234567',
    })
    await save(harness)
    http.expectNone('/api/times/upsert')
    request.flush(
      { errors: { Name: ['Use a different name'] } },
      { status: 400, statusText: 'Invalid' },
    )
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Use a different name')
    expect(root(harness).querySelector<HTMLInputElement>('#departure-name')?.value).toBe('Edited')
    input(harness, 'departure-name', 'Fixed')
    expect(root(harness).textContent).not.toContain('Use a different name')
    await save(harness)
    http.expectOne('/api/times/upsert').flush(envelope({ ...detail(), name: 'Fixed' }))
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Departure time saved.')
    const store = harness.routeDebugElement?.injector.get(DepartureTimesStore)
    expect(store?.detail()?.name).toBe('Fixed')
  })

  it('validates local fields only after submit, then creates an explicit minute value without date conversion', async () => {
    const { harness, http } = await setup('slots', '/api', '/new')
    expect(root(harness).querySelector('hlm-field-error')).toBeNull()
    await save(harness)
    http.expectNone('/api/times/upsert')
    expect(root(harness).textContent).toContain('Enter a name.')
    input(harness, 'departure-name', 'Outbound')
    input(harness, 'departure-time', '24:01')
    await save(harness)
    http.expectNone('/api/times/upsert')
    input(harness, 'departure-time', '00:00')
    await save(harness)
    const request = http.expectOne('/api/times/upsert')
    expect(request.request.body).toEqual({ companyId: 7, name: 'Outbound', shiftTime: '00:00:00' })
    request.flush(envelope({ ...detail(9), name: 'Outbound', shiftTime: '00:00:00' }))
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/slots/9/edit'))
    TestBed.tick()
    http
      .expectOne('/api/times/9')
      .flush(envelope({ ...detail(9), name: 'Outbound', shiftTime: '00:00:00' }))
    harness.detectChanges()
  })

  it('does not offer destructive operations, and prevents duplicate creation after an unconfirmed save', async () => {
    const { harness, http } = await setup('slots', '/api', '/new')
    input(harness, 'departure-name', 'Unconfirmed')
    input(harness, 'departure-time', '08:00')
    await save(harness)
    http.expectOne('/api/times/upsert').flush(envelope(null))
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Verify the list before submitting again')
    expect(root(harness).querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBe(
      true,
    )
    await save(harness)
    http.expectNone('/api/times/upsert')
    expect(root(harness).textContent).not.toContain('Delete')
  })

  it('fails closed for unapproved list/editor permissions without transport requests', async () => {
    const { harness, http } = await setup('slots', '/api', '', false, false)
    expect(root(harness).textContent).toContain('You do not have access')
    expect(root(harness).textContent).not.toContain('Create departure time')
    await harness.navigateByUrl('/slots/3/edit')
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('You do not have access to edit')
    const guard = TestBed.inject(Router).config[0].children?.find(route => route.path === 'new')
      ?.canDeactivate?.[0]
    if (typeof guard !== 'function') throw new Error('Missing editor leave guard')
    const canLeave = guard as (component: null) => boolean
    expect(canLeave(null)).toBe(true)
    http.expectNone(() => true)
  })

  it('distinguishes invalid and missing records and clears unsaved detail drafts on company loss', async () => {
    const { harness, http, company } = await setup('slots', '/api', '/0/edit')
    expect(root(harness).textContent).toContain('Invalid departure-time URL')
    await harness.navigateByUrl('/slots/3/edit')
    TestBed.tick()
    http.expectOne('/api/times/3').flush(envelope(null))
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Departure time not found')
    await harness.navigateByUrl('/slots/4/edit')
    TestBed.tick()
    http.expectOne('/api/times/4').flush(envelope(detail(4)))
    harness.detectChanges()
    input(harness, 'departure-name', 'Unsaved private name')
    company.set(null)
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).not.toContain('Unsaved private name')
    expect(root(harness).querySelector('form')).toBeNull()
    http.expectNone(() => true)
  })

  it('confirms dirty navigation and keeps drafts after canceling', async () => {
    const { harness, http } = await setup('slots', '/api', '/new')
    input(harness, 'departure-name', 'Draft')
    const pending = harness.navigateByUrl('/slots')
    await vi.waitFor(() => expect(document.querySelector('[role=alertdialog]')).not.toBeNull())
    const cancel = Array.from(document.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Keep editing',
    )
    if (!cancel) throw new Error('Keep editing action did not render')
    cancel.click()
    await pending
    expect(TestBed.inject(Router).url).toBe('/slots/new')
    expect(root(harness).querySelector<HTMLInputElement>('#departure-name')?.value).toBe('Draft')
    http.expectNone(() => true)
  })

  it('guards dirty parameter changes in a reused editor and hydrates the new identity only after discard', async () => {
    const { harness, http } = await setup('slots', '/api', '/3/edit')
    http.expectOne('/api/times/3').flush(envelope(detail()))
    harness.detectChanges()
    input(harness, 'departure-name', 'Dirty record three')
    const pending = harness.navigateByUrl('/slots/4/edit')
    await vi.waitFor(() => expect(document.querySelector('[role=alertdialog]')).not.toBeNull())
    http.expectNone('/api/times/4')
    const discard = Array.from(document.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Discard changes',
    )
    if (!discard) throw new Error('Discard action did not render')
    discard.click()
    await pending
    TestBed.tick()
    http.expectOne('/api/times/4').flush(envelope({ ...detail(4), name: 'Record four' }))
    harness.detectChanges()
    expect(root(harness).querySelector<HTMLInputElement>('#departure-name')?.value).toBe(
      'Record four',
    )
  })
})
