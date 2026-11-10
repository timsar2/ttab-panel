import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { By } from '@angular/platform-browser'
import { SessionStore } from '@org/auth-data-access'
import { FileUploadControl } from '@org/ui-forms'
import { Subject } from 'rxjs'
import { createCompanyRoutes } from '../index'

const envelope = (result: unknown) => ({ code: '2000', massage: null, result })
const original = {
  id: 2,
  name: 'Company',
  companyTypeId: 1,
  companyTypeName: 'Type',
  cityId: 7,
  provinceId: 3,
  address: null,
  postalCode: null,
  lat: 0,
  lng: 0,
  mobileNumber: null,
  phoneNumber: null,
  faxNumber: null,
  description: null,
  companyLogo: 'existing.png',
}

describe('company editor public routes', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify())
  async function setup(
    path: string,
    apiUrl: string,
    suffix: string,
    allowed = true,
    maximum?: number,
  ) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionStore,
          useValue: {
            configured: () => true,
            isAuthenticated: () => true,
            user: () => ({ id: 'identity', roles: allowed ? ['Admin'] : [] }),
            changes$: new Subject(),
          },
        },
        provideRouter(
          createCompanyRoutes({
            path,
            apiUrl,
            editor: {
              geographyApiUrl: '/geo',
              maxLogoBytes: maximum,
              canCreate: roles => roles.includes('Admin'),
              canEdit: roles => roles.includes('Admin'),
            },
          }),
        ),
      ],
    })
    const harness = await RouterTestingHarness.create(`/${path}/${suffix}`)
    return { harness, http: TestBed.inject(HttpTestingController) }
  }
  function input(harness: RouterTestingHarness, id: string, value: string) {
    const element = harness.routeNativeElement?.querySelector<HTMLInputElement>(
      `#${id}`,
    ) as HTMLInputElement
    element.value = value
    element.dispatchEvent(new Event('input', { bubbles: true }))
    harness.detectChanges()
  }
  it.each([
    { path: 'companies', api: '/api/v1' },
    { path: 'organisations', api: '/other/v1' },
  ])('creates through a different mount/API configuration at $path', async ({ path, api }) => {
    const { harness, http } = await setup(path, api, 'new')
    http.expectOne(`${api}/companys/types`).flush(envelope([{ id: 1, name: 'Type' }]))
    http.expectOne('/geo/states').flush(envelope([{ id: 3, name: 'Province' }]))
    await harness.fixture.whenStable()
    expect(harness.routeNativeElement?.querySelector('form')?.hasAttribute('novalidate')).toBe(true)
    input(harness, 'company-name', 'Created')
    const type = harness.routeNativeElement?.querySelector<HTMLSelectElement>(
      'select#company-type',
    ) as HTMLSelectElement
    type.value = '1'
    type.dispatchEvent(new Event('change', { bubbles: true }))
    harness.detectChanges()
    harness.routeNativeElement
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => {
      const request = http.expectOne(`${api}/companys`)
      expect(request.request.body).toMatchObject({
        id: null,
        name: 'Created',
        companyTypeId: 1,
        cityId: null,
        coordinate: null,
        companyLogo: null,
      })
      request.flush(
        envelope({
          ...original,
          id: 9,
          name: 'Created',
          cityId: null,
          provinceId: null,
          lat: null,
          lng: null,
        }),
      )
    })
    await harness.fixture.whenStable()
    expect(harness.routeNativeElement?.textContent).toContain(
      'Company saved. The selected workspace has not changed.',
    )
    expect(TestBed.inject(Router).url).toBe(`/${path}/new`)
  })
  it('hydrates zero coordinates and makes server name validation visible without losing draft', async () => {
    const { harness, http } = await setup('companies', '/api/v1', '2/edit')
    http.expectOne('/api/v1/companys/types').flush(envelope([{ id: 1, name: 'Type' }]))
    http.expectOne('/geo/states').flush(envelope([{ id: 3, name: 'Province' }]))
    http.expectOne('/api/v1/companys/2').flush(envelope(original))
    http.expectOne('/geo/states/Cities').flush(envelope([{ id: 7, name: 'City' }]))
    await harness.fixture.whenStable()
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>('#company-location-latitude')
        ?.value,
    ).toBe('0')
    input(harness, 'company-name', 'Rejected')
    harness.routeNativeElement
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() =>
      http
        .expectOne('/api/v1/companys')
        .flush(
          { errors: { Name: ['Name rejected by backend'] } },
          { status: 400, statusText: 'Bad Request' },
        ),
    )
    await harness.fixture.whenStable()
    expect(harness.routeNativeElement?.textContent).toContain('Name rejected by backend')
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>('#company-name')?.value,
    ).toBe('Rejected')
    input(harness, 'company-name', 'Corrected')
    await harness.fixture.whenStable()
    expect(harness.routeNativeElement?.textContent).not.toContain('Name rejected by backend')
  })
  it('does not load or expose a mutation form when app policy denies writes', async () => {
    const { harness, http } = await setup('companies', '/api/v1', '2/edit', false)
    expect(harness.routeNativeElement?.textContent).toContain(
      'You do not have access to edit this company.',
    )
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull()
    http.expectNone(() => true)
  })
  it('shows an already-deleted company as missing instead of switching into create mode', async () => {
    const { harness, http } = await setup('companies', '/api/v1', '2/edit')
    http.expectOne('/api/v1/companys/types').flush(envelope([{ id: 1, name: 'Type' }]))
    http.expectOne('/geo/states').flush(envelope([{ id: 3, name: 'Province' }]))
    http.expectOne('/api/v1/companys/2').flush(envelope(null))
    await harness.fixture.whenStable()
    expect(harness.routeNativeElement?.textContent).toContain('Company not found.')
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull()
    http.expectNone(() => true)
  })
  it('protects image-only drafts and resets accepted media while clearing stale image feedback', async () => {
    const { harness, http } = await setup('companies', '/api/v1', '2/edit', true, 100)
    http.expectOne('/api/v1/companys/types').flush(envelope([{ id: 1, name: 'Type' }]))
    http.expectOne('/geo/states').flush(envelope([{ id: 3, name: 'Province' }]))
    http.expectOne('/api/v1/companys/2').flush(envelope(original))
    http.expectOne('/geo/states/Cities').flush(envelope([{ id: 7, name: 'City' }]))
    await harness.fixture.whenStable()
    const upload = harness.routeDebugElement?.query(By.directive(FileUploadControl))
      ?.componentInstance as FileUploadControl
    expect(upload).toBeTruthy()
    upload.value.set({
      kind: 'replace',
      file: {
        name: 'new.png',
        mime: 'image/png',
        extension: '.png',
        size: 1,
        dataUrl: 'data:image/png;base64,AA==',
      },
    })
    harness.detectChanges()
    const navigation = harness.navigateByUrl('/companies')
    await vi.waitFor(() => {
      harness.detectChanges()
      expect(document.querySelector('[role=alertdialog]')?.textContent).toContain(
        'Discard unsaved changes?',
      )
    })
    const cancel = Array.from(document.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Keep editing',
    )
    expect(cancel).toBeTruthy()
    cancel?.click()
    await navigation
    expect(TestBed.inject(Router).url).toBe('/companies/2/edit')
    harness.routeNativeElement
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() =>
      http
        .expectOne('/api/v1/companys')
        .flush(
          { errors: { 'CompanyLogo.Data': ['Image payload rejected'] } },
          { status: 400, statusText: 'Bad Request' },
        ),
    )
    await harness.fixture.whenStable()
    expect(harness.routeNativeElement?.textContent).toContain('Image payload rejected')
    upload.value.set({
      kind: 'replace',
      file: {
        name: 'retry.png',
        mime: 'image/png',
        extension: '.png',
        size: 2,
        dataUrl: 'data:image/png;base64,AAA=',
      },
    })
    await harness.fixture.whenStable()
    expect(harness.routeNativeElement?.textContent).not.toContain('Image payload rejected')
    harness.routeNativeElement
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => {
      const request = http.expectOne('/api/v1/companys')
      expect(request.request.body.companyLogo).toEqual({
        extension: '.png',
        data: 'data:image/png;base64,AAA=',
        deleteCurrentImage: false,
      })
      request.flush(envelope({ ...original, companyLogo: 'updated.png' }))
    })
    await harness.fixture.whenStable()
    expect(upload.value().kind).toBe('keep')
  })
  it('waits for an unchanged in-flight save instead of canceling it on navigation', async () => {
    const { harness, http } = await setup('companies', '/api/v1', '2/edit')
    http.expectOne('/api/v1/companys/types').flush(envelope([{ id: 1, name: 'Type' }]))
    http.expectOne('/geo/states').flush(envelope([{ id: 3, name: 'Province' }]))
    http.expectOne('/api/v1/companys/2').flush(envelope(original))
    http.expectOne('/geo/states/Cities').flush(envelope([{ id: 7, name: 'City' }]))
    await harness.fixture.whenStable()
    harness.routeNativeElement
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    let request: ReturnType<HttpTestingController['expectOne']> | undefined
    await vi.waitFor(() => {
      request = http.expectOne('/api/v1/companys')
    })
    const navigation = harness.navigateByUrl('/companies')
    await vi.waitFor(() => {
      harness.detectChanges()
      expect(document.querySelector('[role=alertdialog]')?.textContent).toContain(
        'Save in progress',
      )
    })
    expect(request?.cancelled).toBe(false)
    const confirm = Array.from(document.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Discard changes',
    )
    expect(confirm?.disabled).toBe(true)
    request?.flush(envelope(original))
    await navigation
    http.expectOne('/api/v1/companys/search').flush(
      envelope({
        list: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          pageSize: 10,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      }),
    )
    expect(TestBed.inject(Router).url).toBe('/companies')
  })
})
