import { RenderMode, ServerRoute } from '@angular/ssr'

export const serverRoutes: ServerRoute[] = [
  { path: 'companies', renderMode: RenderMode.Client },
  { path: 'companies/**', renderMode: RenderMode.Client },
  { path: 'companys', renderMode: RenderMode.Client },
  { path: 'companys/**', renderMode: RenderMode.Client },
  { path: 'client/**', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
]
