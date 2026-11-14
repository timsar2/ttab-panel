import { ActivatedRouteSnapshot } from '@angular/router'

export interface RouteContext {
  readonly url: string
  readonly fragment: string | null
  param(name: string): string | null
  query(name: string): string | null
}

/** Read stable route/query values and the canonical URL during route activation. */
export function readRouteContext(route: ActivatedRouteSnapshot, currentUrl?: string): RouteContext {
  const path = route.pathFromRoot
    .flatMap(snapshot => snapshot.url.map(segment => segment.path))
    .filter(Boolean)
    .join('/')

  return Object.freeze({
    url: currentUrl ?? `/${path}`,
    fragment: route.fragment,
    param: (name: string) => route.paramMap.get(name),
    query: (name: string) => route.queryParamMap.get(name),
  })
}
