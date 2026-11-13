import { Component, InjectionToken, Signal, inject, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { of } from 'rxjs'
import { createRouteRoutes, ROUTE_DIRECTION_ID } from './route.routes'

const LINE_ROUTE_DIRECTION = new InjectionToken<Signal<number | null>>('LINE_ROUTE_DIRECTION')

@Component({
  standalone: true,
  template: `{{ directionId() }}`,
})
class NestedLineTestPage {
  readonly directionId = inject(LINE_ROUTE_DIRECTION)
}

describe('Route nested Line route context', () => {
  it('passes the active Direction ID through the lazy line-route factory', async () => {
    const routes = createRouteRoutes({
      path: 'direction',
      apiUrl: '/test-api',
      endpoints: {
        routes: 'v1/directions',
        search: 'v1/directions/search',
        stations: 'v1/stations/search',
        save: 'v1/directions',
      },
      company: () => signal<number | null>(1),
      access: () => () => of(true),
      canActivate: () => true,
      lineRoutes: () => {
        const directionId = inject(ROUTE_DIRECTION_ID)
        return [
          {
            path: '',
            component: NestedLineTestPage,
            providers: [{ provide: LINE_ROUTE_DIRECTION, useValue: directionId }],
          },
        ]
      },
    })
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] })

    const harness = await RouterTestingHarness.create()
    await harness.navigateByUrl('/direction/detail/42/lines', NestedLineTestPage)

    expect(harness.routeDebugElement?.injector.get(LINE_ROUTE_DIRECTION)()).toBe(42)
  })
})
