import { InjectionToken, Signal } from '@angular/core'
import { Routes } from '@angular/router'
import { authGuard } from '@org/auth-data-access'
import type { WorkspaceText } from './workspace-landing'

export interface WorkspaceConfig {
  readonly path: string
  readonly brand: string
  readonly companiesCommands: (string | number)[]
  readonly loginUrl: string
  /** Runs in the component injection context; may read the consumer's locale/preferences. */
  readonly text?: () => Signal<WorkspaceText>
}

export const WORKSPACE_CONFIG = new InjectionToken<WorkspaceConfig>('WORKSPACE_CONFIG')

export function createWorkspaceRoutes(config: WorkspaceConfig): Routes {
  return [
    {
      path: config.path,
      canActivate: [authGuard],
      providers: [{ provide: WORKSPACE_CONFIG, useValue: config }],
      loadComponent: () => import('./workspace-landing').then(module => module.WorkspaceLanding),
    },
  ]
}
