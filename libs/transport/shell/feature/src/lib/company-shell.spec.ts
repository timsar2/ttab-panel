import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { SessionStore, provideAuth } from '@org/auth-data-access'
import { Subject, identity } from 'rxjs'
import { createCompanyShellRoutes } from '../index'

@Component({
  selector: 'lib-operational-test',
  template: '<p>Operational child</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class OperationalChild {}

const detail = (id: number) => ({
  code: '2000',
  massage: 'Success',
  result: {
    id,
    name: `Company ${id}`,
    companyTypeId: null,
    companyTypeName: null,
    cityId: null,
    provinceId: null,
    address: null,
    postalCode: null,
    lat: 0,
    lng: 0,
    mobileNumber: null,
    phoneNumber: null,
    faxNumber: null,
    description: null,
    companyLogo: null,
  },
})

describe('company shell route factory', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify())
  it.each([
    {
      path: 'client/:companyId',
      companyParam: 'companyId',
      apiUrl: '/api/v1',
      url: '/client',
      brand: 'First application',
      recordLabel: 'Records',
      initialId: 2,
    },
    {
      path: 'fleets/:id',
      companyParam: 'id',
      apiUrl: '/other/v1',
      url: '/fleets',
      brand: 'Fleet application',
      recordLabel: 'Fleet records',
      initialId: 5,
    },
  ])(
    'restores direct links and switches context in an alternate consumer at $url',
    async config => {
      const changes = new Subject<number>()
      const user = signal<{ id: string; roles: string[] } | null>({
        id: 'identity',
        roles: ['Admin'],
      })
      TestBed.configureTestingModule({
        providers: [
          provideAuth({ apiUrl: '/api', tenant: 'test' }),
          provideHttpClient(),
          provideHttpClientTesting(),
          {
            provide: SessionStore,
            useValue: {
              user,
              changes$: changes,
              configured: () => true,
              isAuthenticated: () => true,
              version: () => 1,
              accessToken: () => 'test-token',
              tenant: () => 'test',
              untilChanged: () => identity,
            },
          },
          provideRouter(
            createCompanyShellRoutes(
              {
                ...config,
                companiesCommands: ['/choose'],
                loginUrl: '/sign-in',
                labels: { navigation: config.recordLabel + ' navigation' },
                links: [
                  {
                    path: 'records',
                    label: config.recordLabel,
                    visibleWhen: roles => roles.includes('Admin'),
                  },
                ],
              },
              [
                {
                  path: 'records',
                  component: OperationalChild,
                  data: { breadcrumb: config.recordLabel },
                },
                { path: 'restricted', component: OperationalChild, canActivate: [() => false] },
              ],
            ),
          ),
        ],
      })
      const harness = await RouterTestingHarness.create()
      const http = TestBed.inject(HttpTestingController)
      const initial = harness.navigateByUrl(`${config.url}/${config.initialId}`)
      await vi.waitFor(
        () =>
          http
            .expectOne(`${config.apiUrl}/companys/${config.initialId}`)
            .flush(detail(config.initialId)),
        {
          timeout: 10000,
        },
      )
      await initial
      expect(harness.routeNativeElement?.textContent).toContain(`Company ${config.initialId}`)
      expect(harness.routeNativeElement?.textContent).toContain(config.brand)
      expect(
        harness.routeNativeElement
          ?.querySelector('[data-slot=breadcrumb]')
          ?.getAttribute('aria-label'),
      ).toBe('Breadcrumbs')
      expect(harness.routeNativeElement?.querySelector('nav')?.getAttribute('aria-label')).toBe(
        config.recordLabel + ' navigation',
      )
      const change = harness.navigateByUrl(`${config.url}/3`)
      await vi.waitFor(() => {
        const request = http.expectOne(`${config.apiUrl}/companys/3`)
        harness.detectChanges()
        expect(harness.routeNativeElement?.textContent).not.toContain(`Company ${config.initialId}`)
        request.flush(detail(3))
      })
      await change
      expect(harness.routeNativeElement?.textContent).toContain('Company 3')
      const denied = harness.navigateByUrl(`${config.url}/4`)
      await vi.waitFor(() =>
        http
          .expectOne(`${config.apiUrl}/companys/4`)
          .flush(null, { status: 403, statusText: 'Forbidden' }),
      )
      await denied
      expect(harness.routeNativeElement?.textContent).toContain('Company access denied')
      expect(harness.routeNativeElement?.textContent).not.toContain('Company 3')
      await harness.navigateByUrl(`${config.url}/0`)
      expect(harness.routeNativeElement?.textContent).toContain('Invalid company URL')
      http.expectNone(() => true)
      const child = harness.navigateByUrl(`${config.url}/6/records`)
      await vi.waitFor(() => http.expectOne(`${config.apiUrl}/companys/6`).flush(detail(6)))
      await child
      expect(harness.routeNativeElement?.textContent).toContain('Operational child')
      expect(
        harness.routeNativeElement?.querySelector('[data-slot=breadcrumb] [aria-current=page]')
          ?.textContent,
      ).toContain(config.recordLabel)
      const canceled = harness.navigateByUrl(`${config.url}/8/restricted`)
      await vi.waitFor(() => http.expectOne(`${config.apiUrl}/companys/8`).flush(detail(8)))
      await canceled
      expect(TestBed.inject(Router).url).toBe(`${config.url}/6/records`)
      expect(harness.routeNativeElement?.textContent).not.toContain('Company 8')
      expect(harness.routeNativeElement?.textContent).not.toContain('Operational child')
      user.set({ id: 'identity', roles: [] })
      await harness.fixture.whenStable()
      expect(
        harness.routeNativeElement?.querySelector(
          'nav[aria-label="' + config.recordLabel + ' navigation"]',
        )?.textContent,
      ).not.toContain(config.recordLabel)
      const forbiddenChild = harness.navigateByUrl(`${config.url}/7/records`)
      await vi.waitFor(() =>
        http
          .expectOne(`${config.apiUrl}/companys/7`)
          .flush(null, { status: 403, statusText: 'Forbidden' }),
      )
      await forbiddenChild
      expect(harness.routeNativeElement?.textContent).not.toContain('Operational child')
      expect(harness.routeNativeElement?.textContent).toContain('Company access denied')
    },
  )
})
