import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { catchError, map, of } from 'rxjs'
import { AUTH_CONFIG, safeReturnUrl } from './auth.config'
import { SessionStore } from './session.store'

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore)
  const router = inject(Router)
  const config = inject(AUTH_CONFIG)
  const login = () => {
    const tree = router.parseUrl(config.loginUrl)
    tree.queryParams = {
      ...tree.queryParams,
      returnUrl: safeReturnUrl(state.url, config.afterLoginUrl, config.loginUrl),
    }
    return tree
  }
  if (!session.configured()) return login()
  if (session.isAuthenticated()) return true
  if (!session.accessToken()) return login()
  return session.refresh().pipe(
    map(() => true),
    catchError(() => of(login())),
  )
}

export const guestGuard: CanActivateFn = route => {
  const session = inject(SessionStore)
  const router = inject(Router)
  const config = inject(AUTH_CONFIG)
  const destination = () =>
    router.parseUrl(
      safeReturnUrl(route.queryParamMap.get('returnUrl'), config.afterLoginUrl, config.loginUrl),
    )
  if (session.isAuthenticated()) return destination()
  if (!session.accessToken()) return true
  return session.refresh().pipe(
    map(destination),
    catchError(() => of(true)),
  )
}

/**
 * Role checks improve UX only; the API must independently authorize every operation.
 * Denial cancels navigation. Callers can compose a dedicated forbidden route if desired.
 */
export function requireRoles(roles: readonly string[]): CanActivateFn {
  return (route, state) => {
    const session = inject(SessionStore)
    const allowed = () => roles.every(role => session.user()?.roles.includes(role))
    const authenticated = authGuard(route, state)
    if (authenticated === true) return allowed()
    if (authenticated && typeof authenticated === 'object' && 'pipe' in authenticated) {
      return authenticated.pipe(map(result => (result === true ? allowed() : result)))
    }
    return authenticated
  }
}
