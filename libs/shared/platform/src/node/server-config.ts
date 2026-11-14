import { ApplicationConfig, mergeApplicationConfig } from '@angular/core'
import { RenderMode, ServerRoute, provideServerRendering, withRoutes } from '@angular/ssr'

export interface PlatformRenderPolicy {
  readonly clientPaths?: readonly string[]
}

export function createPlatformServerRoutes(policy: PlatformRenderPolicy = {}): ServerRoute[] {
  return [
    ...(policy.clientPaths ?? []).map((path): ServerRoute => ({
      path,
      renderMode: RenderMode.Client,
    })),
    { path: '**', renderMode: RenderMode.Server },
  ]
}

export function createPlatformServerConfig(
  appConfig: ApplicationConfig,
  serverRoutes: ServerRoute[],
): ApplicationConfig {
  return mergeApplicationConfig(appConfig, {
    providers: [provideServerRendering(withRoutes(serverRoutes))],
  })
}
