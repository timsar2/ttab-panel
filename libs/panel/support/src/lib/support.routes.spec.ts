import { signal } from '@angular/core'
import { createSupportRoutes, parseSupportRouteId } from './support.routes'
import { supportCompanyId } from '@org/transport-support-data-access'
import { of } from 'rxjs'

const config = {
  path: 'support',
  apiUrl: '/api',
  endpoints: {
    collection: 'v1/support',
    search: 'v1/support/search',
    messages: 'v1/support',
    sendMessage: 'v1/support/messages',
    violationTypes: 'v1/support/violation-types',
  },
  access: () => () => of(true),
  company: () => signal(supportCompanyId(1)),
  language: () => signal<'en' | 'fa'>('en'),
  canReply: () => signal(true),
}

describe('Support route factory', () => {
  it('mounts scoped list/detail routes and no delete or create editor route', () => {
    const route = createSupportRoutes(config)[0]
    expect(route.path).toBe('support')
    expect(route.providers).toBeDefined()
    expect(route.children?.map(child => child.path)).toEqual(['', ':id'])
    expect(route.children?.[1].data?.['breadcrumb']).toBeNull()
  })

  it.each([
    ['1', 1],
    ['2147483647', 2147483647],
    ['0', null],
    ['-1', null],
    ['2x', null],
    ['9007199254740992', null],
    [null, null],
  ] as const)('validates support IDs in routes: %s', (value, expected) =>
    expect(parseSupportRouteId(value)).toBe(expected),
  )
})
