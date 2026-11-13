import { createDriverLineRoutes } from './driver-line.routes'
import { peopleCompanyId } from '@org/transport-people-data-access'
import { of, Subject } from 'rxjs'
import { EnvironmentInjector, createEnvironmentInjector, signal } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { driverCompanyId, DriversApi } from '@org/transport-drivers-data-access'
import { PeopleSearchStore } from '@org/transport-people-data-access'
import { provideDriverLineFeature } from './driver-line.routes'
import { DriverLineState } from './driver-line-state'

describe('createDriverLineRoutes', () => {
  const config = () => ({
    path: 'assignments',
    apiUrl: '/api',
    company: () => signal(1),
    language: () => signal<'en'>('en'),
    canManage: () => signal(true),
    drivers: {
      apiUrl: '/api',
      endpoints: { collection: 'v1/drivers', search: 'v1/drivers/search', save: 'v1/drivers' },
      company: () => signal(driverCompanyId(1)),
      access: () => () => of(true),
    },
    people: {
      apiUrl: '/api',
      company: () => signal(peopleCompanyId(1)),
      access: () => () => of(true),
    },
  })

  it('exposes the list, legacy detail, and create routes under a configured mount', () => {
    const routes = createDriverLineRoutes(config())
    expect(routes[0].path).toBe('assignments')
    expect(routes[0].children?.map(route => route.path)).toEqual([
      '',
      'new',
      'detail/:id',
      'detail/:id/edit',
    ])
  })

  it('restores URL identifiers to the feature state', () => {
    const state = new DriverLineState()

    state.restoreFromRoute(1, 19, 25)

    expect(state.clientId()).toBe(1)
    expect(state.driverLineId()).toBe(19)
    expect(state.directionId()).toBe(25)
  })

  it('provides driver and people APIs without a circular dependency', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        {
          provide: SessionStore,
          useValue: {
            user: () => null,
            version: () => 0,
            changes$: new Subject<number>(),
            untilChanged: () => (source: unknown) => source,
          },
        },
      ],
    })
    const routeInjector = createEnvironmentInjector(
      [provideDriverLineFeature(config())],
      TestBed.inject(EnvironmentInjector),
    )

    expect(() => routeInjector.get(DriversApi)).not.toThrow()
    expect(() => routeInjector.get(PeopleSearchStore)).not.toThrow()
    routeInjector.destroy()
    TestBed.resetTestingModule()
  })
})
