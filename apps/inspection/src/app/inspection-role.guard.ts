import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { SessionStore } from '@org/platform'

export function hasInspectorRole(roles: readonly string[] | undefined): boolean {
  return roles?.includes('Inspector') ?? false
}

export const inspectionRoleGuard: CanActivateFn = () => {
  const session = inject(SessionStore)
  const router = inject(Router)
  return hasInspectorRole(session.user()?.roles) ? true : router.parseUrl('/access-denied')
}
