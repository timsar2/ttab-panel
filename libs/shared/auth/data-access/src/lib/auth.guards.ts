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
  if (config.mode === 'cookie')
    return session.restore().pipe(map(valid => (valid ? true : login())))
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
  if (config.mode === 'cookie')
    return session.restore().pipe(map(valid => (valid ? destination() : true)))
  if (!session.accessToken()) return true
  return session.refresh().pipe(
    map(destination),
    catchError(() => of(true)),
  )
}

export function hasAnyRole(
  userRoles: readonly string[] | undefined,
  allowedRoles: readonly string[],
) {
  return allowedRoles.some(role => userRoles?.includes(role))
}

export function hasAllRoles(
  userRoles: readonly string[] | undefined,
  requiredRoles: readonly string[],
) {
  return requiredRoles.every(role => userRoles?.includes(role))
}

function roleGuard(
  roles: readonly string[],
  matches: (userRoles: readonly string[] | undefined, roles: readonly string[]) => boolean,
): CanActivateFn {
  return (route, state) => {
    const session = inject(SessionStore)
    const allowed = () => matches(session.user()?.roles, roles)
    const authenticated = authGuard(route, state)
    if (authenticated === true) return allowed()
    if (authenticated && typeof authenticated === 'object' && 'pipe' in authenticated) {
      return authenticated.pipe(map(result => (result === true ? allowed() : result)))
    }
    return authenticated
  }
}

/** Require every listed role. Role checks improve UX; the API must authorize each operation. */
export function requireRoles(roles: readonly string[]): CanActivateFn {
  return roleGuard(roles, hasAllRoles)
}

/** Require at least one listed role. Role checks improve UX; the API must authorize each operation. */
export function requireAnyRole(roles: readonly string[]): CanActivateFn {
  return roleGuard(roles, hasAnyRole)
}
