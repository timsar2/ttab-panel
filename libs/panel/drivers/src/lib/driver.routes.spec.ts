import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { By } from '@angular/platform-browser'
import { SessionStore, provideAuth } from '@org/auth-data-access'
import {
  DriverCompanyId,
  DriversStore,
  driverCompanyId,
  driverId,
} from '@org/transport-drivers-data-access'
import { FileUploadControl } from '@org/ui-forms'
import { Subject, identity, of } from 'rxjs'
import { createDriverRoutes } from './driver.routes'
import { driverQuery } from './ui/driver-page'
import { driverReplacement } from './ui/driver-editor'
import { routeDriverId } from './ui/driver-detail'

const envelope = (result: unknown) => ({ code: '2000', massage: null, result })
function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Expected rendered driver control')
  return value
}
const person = (id = 12) => ({
  id,
  firstName: 'Sam',
  lastName: 'Driver',
  email: null,
  nationalId: '0012345678',
  provinceName: null,
  cityName: null,
  cityId: null,
  address: null,
  postalCode: null,
  lat: null,
  lng: null,
  mobileNumber: '09123456789',
  phoneNumber: null,
  profileImage: null,
})
const driver = (id = 12) => ({
  id,
  driverLicenceLevelId: 2,
  nationalCardFrontImage: '/files/front.jpg',
  nationalCardBehindImage: null,
  drivingLicenceImage: '/files/licence.jpg',
  driverSmartCardImage: null,
})
const page = (list: unknown[]) =>
  envelope({
    list,
    pagination: {
      currentPage: 1,
      pageSize: 10,
      totalCount: list.length,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
  })

describe('reusable driver routes', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify()
    TestBed.resetTestingModule()
  })
  async function setup(initial = '', allowed = true, manage = true, register = false) {
    const company = signal<DriverCompanyId | null>(driverCompanyId(7))
    const user = signal<{ id: string; roles: string[] } | null>({
      id: 'not-a-person-id',
      roles: [],
    })
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
          createDriverRoutes({
            path: 'operators',
            apiUrl: '/fleet',
            endpoints: {
              collection: 'v1/drivers',
              search: 'v1/drivers/search',
              save: 'v1/drivers',
            },
            company: () => company,
            access: () => () => of(allowed),
            canManage: () => signal(manage),
            canRegisterPerson: () => signal(register),
            deniedMessage: 'Driver access not approved.',
            people: {
              apiUrl: '/directory',
              company: () => company,
              access: () => () => of(allowed),
            },
          }),
        ),
      ],
    })
    const harness = await RouterTestingHarness.create()
    await harness.navigateByUrl('/operators' + initial)
    TestBed.tick()
    harness.detectChanges()
    return { harness, http: TestBed.inject(HttpTestingController), company, user, version, changes }
  }
  function root(harness: RouterTestingHarness): HTMLElement {
    const root = harness.routeNativeElement
    if (!root) throw new Error('Missing driver UI')
    return root
  }
  function flushDetail(http: HttpTestingController) {
    http.expectOne('/fleet/v1/drivers/12').flush(envelope(driver()))
    http.expectOne('/directory/users/12').flush(envelope(person()))
  }
  function flushNewDriverCheck(http: HttpTestingController) {
    http.expectOne('/fleet/v1/drivers/12').flush(envelope(null))
    http.expectOne('/directory/users/12').flush(envelope(person()))
  }

  it('supports alternate routes, API bases, scoped search and detail links', async () => {
    const { harness, http } = await setup('?q=0012345678')
    const request = http.expectOne('/fleet/v1/drivers/search')
    expect(request.request.body).toEqual({
      companyId: 7,
      fullName: null,
      nationalId: '0012345678',
      pageNumber: 1,
      pageSize: 10,
    })
    request.flush(
      page([
        {
          id: 12,
          fullName: 'Sam Driver',
          nationalId: '0012345678',
          mobileNumber: '09123456789',
          profileImage: null,
          driverLicenceLevelName: '2',
        },
      ]),
    )
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Sam Driver')
    expect(
      root(harness)
        .querySelector('tbody a[aria-label="View details: Sam Driver"]')
        ?.getAttribute('href'),
    ).toBe('/operators/12?q=0012345678')
    expect(
      root(harness)
        .querySelector('tbody a[aria-label="Edit driver: Sam Driver"]')
        ?.getAttribute('href'),
    ).toBe('/operators/12/edit?q=0012345678')
    expect(root(harness).querySelector('tbody a')?.getAttribute('href')).toBe(
      '/operators/12?q=0012345678',
    )
  })
  it('uses autocomplete suggestions to narrow the driver list by the selected national ID', async () => {
    const { harness, http } = await setup('?q=Sam')
    const search = http.expectOne('/fleet/v1/drivers/search')
    expect(search.request.body.fullName).toBe('Sam')
    search.flush(
      page([
        {
          id: 12,
          fullName: 'Sam Driver',
          nationalId: '0012345678',
          mobileNumber: '09123456789',
          profileImage: null,
          driverLicenceLevelName: '2',
        },
      ]),
    )
    harness.detectChanges()
    const input = present(root(harness).querySelector<HTMLInputElement>('[role=combobox]'))
    input.focus()
    input.dispatchEvent(new Event('focus'))
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).querySelector('[role=listbox]')?.textContent).toContain('Sam Driver')
    present(root(harness).querySelector<HTMLButtonElement>('[role=option]')).click()
    await vi.waitFor(() =>
      expect(TestBed.inject(Router).url).toBe('/operators?q=0012345678&page=1'),
    )
    TestBed.tick()
    const filtered = http.expectOne('/fleet/v1/drivers/search')
    expect(filtered.request.body).toMatchObject({ fullName: null, nationalId: '0012345678' })
    filtered.flush(page([]))
    harness.detectChanges()
    expect((root(harness).querySelector('[role=combobox]') as HTMLInputElement).value).toBe(
      '0012345678',
    )
  })
  it('renders denied state without requests or mutation affordances', async () => {
    const { harness, http } = await setup('', false, false)
    http.expectNone(() => true)
    expect(root(harness).textContent).toContain('Driver access not approved.')
    expect(root(harness).textContent).not.toContain('Add driver')
  })
  it('renders hydrated read-only detail, keeping edit as a separate route', async () => {
    const { harness, http } = await setup('/12')
    flushDetail(http)
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Sam Driver')
    expect(root(harness).querySelector('img')?.getAttribute('src')).toBe('/files/front.jpg')
    expect(root(harness).querySelector('form')).toBeNull()
    expect(root(harness).querySelector('a[href="/operators/12/edit"]')).not.toBeNull()
  })
  it('requires a selected persisted person and hides registration by default', async () => {
    const { harness, http } = await setup('/new')
    expect(root(harness).textContent).toContain('Start with a person')
    expect(root(harness).textContent).not.toContain('Register a new person')
    expect(root(harness).textContent).not.toContain('Save driver')
    root(harness)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    TestBed.tick()
    http
      .expectOne('/directory/users/search')
      .flush(page([{ id: 12, fullName: 'Sam Driver', nationalId: null, profileImage: null }]))
    harness.detectChanges()
    const select = Array.from(root(harness).querySelectorAll('button')).find(button =>
      button.textContent?.includes('Select person'),
    )
    select?.click()
    flushNewDriverCheck(http)
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Person ID 12')
    expect(root(harness).textContent).toContain('Save driver')
    http.expectNone(request => request.method === 'POST' && request.url === '/fleet/v1/drivers')
  })
  it('creates a driver from a persisted Person and navigates to the hydrated detail view', async () => {
    const { harness, http } = await setup('/new')
    root(harness)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    TestBed.tick()
    http
      .expectOne('/directory/users/search')
      .flush(
        page([{ id: 12, fullName: 'Sam Driver', nationalId: '0012345678', profileImage: null }]),
      )
    harness.detectChanges()
    present(
      Array.from(root(harness).querySelectorAll('button')).find(button =>
        button.textContent?.includes('Select person'),
      ),
    ).click()
    flushNewDriverCheck(http)
    TestBed.tick()
    harness.detectChanges()
    const licence = present(root(harness).querySelector<HTMLSelectElement>('#driver-licence'))
    licence.value = '2'
    licence.dispatchEvent(new Event('change', { bubbles: true }))
    TestBed.tick()
    harness.detectChanges()
    const forms = root(harness).querySelectorAll('form')
    forms[forms.length - 1].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    TestBed.tick()
    await Promise.resolve()
    http.expectOne('/directory/users/12').flush(envelope(person()))
    const save = http.expectOne('/fleet/v1/drivers')
    expect(save.request.body).toEqual({ id: 12, companyId: 7, driverLicenceLevelId: 2 })
    save.flush(envelope(driver()))
    TestBed.tick()
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/operators/12'))
    TestBed.tick()
    flushDetail(http)
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Driver details')
    expect(root(harness).textContent).toContain('Sam Driver')
    expect(root(harness).querySelector('a[href="/operators/12/edit"]')).not.toBeNull()
  })
  it('clears drafts and private documents when company scope changes', async () => {
    const { harness, http, company } = await setup('/12/edit')
    flushDetail(http)
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Sam Driver')
    company.set(null)
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).not.toContain('Sam Driver')
    expect(root(harness).textContent).toContain('Driver access not approved.')
  })
  it('checks and hydrates an existing driver selected during onboarding', async () => {
    const { harness, http } = await setup('/new')
    root(harness)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    TestBed.tick()
    http
      .expectOne('/directory/users/search')
      .flush(page([{ id: 12, fullName: 'Sam Driver', nationalId: null, profileImage: null }]))
    harness.detectChanges()
    present(
      Array.from(root(harness).querySelectorAll('button')).find(button =>
        button.textContent?.includes('Select person'),
      ),
    ).click()
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Checking existing driver information')
    expect(root(harness).textContent).not.toContain('Save driver')
    flushDetail(http)
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('already has a driver record')
    expect(present(root(harness).querySelector<HTMLSelectElement>('#driver-licence')).value).toBe(
      '2',
    )
    expect(
      root(harness).querySelector('img[alt="Current National card front"]')?.getAttribute('src'),
    ).toBe('/files/front.jpg')
  })
  it('can correct a selected existing Person without enabling account registration', async () => {
    const { harness, http } = await setup('/new')
    root(harness)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    TestBed.tick()
    http
      .expectOne('/directory/users/search')
      .flush(page([{ id: 12, fullName: 'Sam Driver', nationalId: null, profileImage: null }]))
    harness.detectChanges()
    present(
      Array.from(root(harness).querySelectorAll('button')).find(button =>
        button.textContent?.includes('Select person'),
      ),
    ).click()
    flushNewDriverCheck(http)
    TestBed.tick()
    harness.detectChanges()
    present(
      Array.from(root(harness).querySelectorAll('button')).find(button =>
        button.textContent?.includes('Edit person details'),
      ),
    ).click()
    TestBed.tick()
    http.expectOne('/directory/users/12').flush(envelope({ ...person(), nationalId: null }))
    TestBed.tick()
    harness.detectChanges()
    const national = present(
      root(harness).querySelector<HTMLInputElement>('#selected-person-nationalId'),
    )
    national.value = '0012345678'
    national.dispatchEvent(new Event('input', { bubbles: true }))
    TestBed.tick()
    harness.detectChanges()
    present(national.closest('form')).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    TestBed.tick()
    await Promise.resolve()
    const update = http.expectOne('/directory/users')
    expect(update.request.method).toBe('PUT')
    expect(update.request.body.id).toBe(12)
    expect(update.request.body.nationalId).toBe('0012345678')
    expect(update.request.body.mobileNumber).toBeUndefined()
    update.flush(envelope(person()))
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('National ID 0012345678')
    expect(root(harness).textContent).not.toContain('Register a new person')
  })
  it('preserves opt-in registration drafts and requires a confirmed Person response before continuing', async () => {
    const { harness, http } = await setup('/new', true, true, true)
    const registrationToggle = () =>
      present(
        Array.from(root(harness).querySelectorAll('button')).find(button =>
          /Register a new person|Hide registration/.test(button.textContent ?? ''),
        ),
      )
    registrationToggle().click()
    TestBed.tick()
    harness.detectChanges()
    const mobile = present(root(harness).querySelector<HTMLInputElement>('#person-mobileNumber'))
    mobile.value = '09123456789'
    mobile.dispatchEvent(new Event('input', { bubbles: true }))
    const national = present(root(harness).querySelector<HTMLInputElement>('#person-nationalId'))
    national.value = '0012345678'
    national.dispatchEvent(new Event('input', { bubbles: true }))
    TestBed.tick()
    harness.detectChanges()
    registrationToggle().click()
    TestBed.tick()
    harness.detectChanges()
    registrationToggle().click()
    TestBed.tick()
    harness.detectChanges()
    expect(
      present(root(harness).querySelector<HTMLInputElement>('#person-mobileNumber')).value,
    ).toBe('09123456789')
    present(mobile.closest('form')).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    TestBed.tick()
    await Promise.resolve()
    const registration = http.expectOne('/directory/users')
    expect(registration.request.body.companyId).toBe(7)
    expect(root(harness).textContent).not.toContain('Save driver')
    registration.flush({ message: 'Try again' }, { status: 500, statusText: 'Failure' })
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Person could not be saved')
    expect(
      present(root(harness).querySelector<HTMLInputElement>('#person-mobileNumber')).value,
    ).toBe('09123456789')
    present(mobile.closest('form')).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    TestBed.tick()
    await Promise.resolve()
    http.expectOne('/directory/users').flush(envelope(person()))
    TestBed.tick()
    flushNewDriverCheck(http)
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Person ID 12')
    expect(root(harness).textContent).toContain('Save driver')
    http.expectNone('/fleet/v1/drivers')
  })
  it('hydrates licence once, preserves failed drafts, omits unchanged documents and prevents duplicate saves', async () => {
    const { harness, http } = await setup('/12/edit')
    flushDetail(http)
    TestBed.tick()
    harness.detectChanges()
    const licence = present(root(harness).querySelector<HTMLSelectElement>('#driver-licence'))
    expect(licence.value).toBe('2')
    licence.value = '1'
    licence.dispatchEvent(new Event('change', { bubbles: true }))
    TestBed.tick()
    harness.detectChanges()
    const upload = present(
      present(harness.routeDebugElement)
        .queryAll(By.directive(FileUploadControl))
        .map(debug => debug.componentInstance as FileUploadControl)
        .find(control => control.id() === 'driver-nationalCardFrontImage'),
    )
    upload.value.set({
      kind: 'replace',
      file: {
        name: 'replacement.png',
        extension: '.png',
        mime: 'image/png',
        size: 1,
        dataUrl: 'data:image/png;base64,YQ==',
      },
    })
    TestBed.tick()
    harness.detectChanges()
    const store = present(harness.routeDebugElement).injector.get(DriversStore)
    store.loadDetail(driverId(12))
    flushDetail(http)
    TestBed.tick()
    harness.detectChanges()
    expect(present(root(harness).querySelector<HTMLSelectElement>('#driver-licence')).value).toBe(
      '1',
    )
    const forms = root(harness).querySelectorAll('form')
    const submitForm = forms[forms.length - 1]
    submitForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    TestBed.tick()
    harness.detectChanges()
    await Promise.resolve()
    http.expectOne('/directory/users/12').flush(envelope(person()))
    const save = http.expectOne('/fleet/v1/drivers')
    expect(save.request.body).toEqual({
      id: 12,
      companyId: 7,
      driverLicenceLevelId: 1,
      nationalCardFrontImage: {
        extension: '.png',
        data: 'data:image/png;base64,YQ==',
        deleteCurrentImage: false,
      },
    })
    submitForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    TestBed.tick()
    http.expectNone('/directory/users/12')
    save.flush({ message: 'Rejected' }, { status: 500, statusText: 'Failure' })
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Driver could not be saved')
    expect(present(root(harness).querySelector<HTMLSelectElement>('#driver-licence')).value).toBe(
      '1',
    )
    expect(upload.value().kind).toBe('replace')
    submitForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    TestBed.tick()
    await Promise.resolve()
    http.expectOne('/directory/users/12').flush(envelope(person()))
    const retry = http.expectOne('/fleet/v1/drivers')
    expect(retry.request.body).toEqual({
      id: 12,
      companyId: 7,
      driverLicenceLevelId: 1,
      nationalCardFrontImage: {
        extension: '.png',
        data: 'data:image/png;base64,YQ==',
        deleteCurrentImage: false,
      },
    })
    retry.flush(envelope(driver()))
    TestBed.tick()
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/operators/12'))
    TestBed.tick()
    flushDetail(http)
    TestBed.tick()
    harness.detectChanges()
    expect(root(harness).textContent).toContain('Driver details')
    expect(root(harness).textContent).toContain('Sam Driver')
  })
  it('guards dirty navigation and releases the guard on logout', async () => {
    const { harness, http, user, version, changes } = await setup('/12/edit')
    flushDetail(http)
    TestBed.tick()
    harness.detectChanges()
    const licence = present(root(harness).querySelector<HTMLSelectElement>('#driver-licence'))
    licence.value = '1'
    licence.dispatchEvent(new Event('change', { bubbles: true }))
    TestBed.tick()
    const component = present(harness.routeDebugElement).componentInstance as {
      confirmLeave(): boolean | Promise<boolean>
    }
    const pending = component.confirmLeave()
    expect(pending).toBeInstanceOf(Promise)
    expect(component.confirmLeave()).toBe(pending)
    user.set(null)
    version.update(value => value + 1)
    changes.next(version())
    TestBed.tick()
    harness.detectChanges()
    await expect(pending).resolves.toBe(false)
    expect(component.confirmLeave()).toBe(true)
    expect(root(harness).textContent).not.toContain('Sam Driver')
  })
  it('redirects configured legacy add/detail paths at the alternate mount', async () => {
    const { harness, http } = await setup('/add')
    expect(TestBed.inject(Router).url).toBe('/operators/new')
    await harness.navigateByUrl('/operators/detail/12')
    TestBed.tick()
    flushDetail(http)
    expect(TestBed.inject(Router).url).toBe('/operators/12')
  })
})

describe('driver form boundaries', () => {
  it('maps supported search paging and does not invent licence meanings', () => {
    expect(driverQuery('Sam', '2', '25')).toEqual({
      fullName: 'Sam',
      nationalId: '',
      pageIndex: 1,
      pageSize: 25,
    })
    expect(driverQuery('0012', 'NaN', '0')).toEqual({
      fullName: '',
      nationalId: '0012',
      pageIndex: 0,
      pageSize: 10,
    })
    expect(routeDriverId('12')).toBe(12)
    expect(routeDriverId('0')).toBeUndefined()
    expect(routeDriverId('Infinity')).toBeUndefined()
  })
  it('omits unchanged images and rejects removal, pending and invalid files', () => {
    expect(driverReplacement({ kind: 'keep' })).toBeUndefined()
    expect(() => driverReplacement({ kind: 'remove' })).toThrow()
    expect(() => driverReplacement({ kind: 'reading' })).toThrow()
    expect(() => driverReplacement({ kind: 'invalid', message: 'bad' })).toThrow()
    expect(
      driverReplacement({
        kind: 'replace',
        file: {
          name: 'card.png',
          size: 1,
          mime: 'image/png',
          extension: '.png',
          dataUrl: 'data:image/png;base64,YQ==',
        },
      }),
    ).toEqual({ extension: '.png', data: 'data:image/png;base64,YQ==', deleteCurrentImage: false })
  })
})
