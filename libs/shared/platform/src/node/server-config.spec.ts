import { RenderMode } from '@angular/ssr'
import { createPlatformServerRoutes } from './server-config'

describe('createPlatformServerRoutes', () => {
  it('uses server rendering by default', () => {
    expect(createPlatformServerRoutes()).toEqual([{ path: '**', renderMode: RenderMode.Server }])
  })

  it('allows explicit client-rendered exceptions before the server fallback', () => {
    expect(createPlatformServerRoutes({ clientPaths: ['private/**'] })).toEqual([
      { path: 'private/**', renderMode: RenderMode.Client },
      { path: '**', renderMode: RenderMode.Server },
    ])
  })
})
