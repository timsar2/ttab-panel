import { ActivatedRouteSnapshot, convertToParamMap, UrlSegment } from '@angular/router'
import { readRouteContext } from './route-context'

describe('readRouteContext', () => {
  it('reads inherited route parameters, query values, fragment, and canonical URL', () => {
    const parent = {
      url: [new UrlSegment('client', {}), new UrlSegment('acme', {})],
    }
    const route = {
      pathFromRoot: [parent, { url: [new UrlSegment('trips', {})] }],
      paramMap: convertToParamMap({ clientId: 'acme', tripId: 'trip-1' }),
      queryParamMap: convertToParamMap({ page: '3' }),
      fragment: 'details',
    } as unknown as ActivatedRouteSnapshot

    const context = readRouteContext(route, '/client/acme/trips/trip-1?page=3#details')

    expect(context.url).toBe('/client/acme/trips/trip-1?page=3#details')
    expect(context.param('tripId')).toBe('trip-1')
    expect(context.query('page')).toBe('3')
    expect(context.fragment).toBe('details')
  })

  it('builds a path when a Router URL is not supplied', () => {
    const route = {
      pathFromRoot: [{ url: [new UrlSegment('workspace', {})] }],
      paramMap: convertToParamMap({}),
      queryParamMap: convertToParamMap({}),
      fragment: null,
    } as unknown as ActivatedRouteSnapshot

    expect(readRouteContext(route).url).toBe('/workspace')
  })
})
