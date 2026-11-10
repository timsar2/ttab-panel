import { HttpErrorResponse } from '@angular/common/http'
import { DestroyRef, computed, inject } from '@angular/core'
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals'
import {
  Observable,
  Subject,
  catchError,
  defer,
  filter,
  finalize,
  firstValueFrom,
  map,
  mergeMap,
  of,
  shareReplay,
  takeUntil,
  throwError,
} from 'rxjs'
import { AUTH_CONFIG } from './auth.config'
import {
  AuthBackend,
  AuthCredentials,
  AuthSession,
  AuthTokens,
  createDefaultAuthBackend,
  validateAuthSession,
} from './auth.backend'
import { AuthUser, decodeUser } from '../claims'

export type AuthStatus = 'anonymous' | 'authenticating' | 'authenticated' | 'refreshing'

export type AuthErrorCode =
  'configuration' | 'invalid-credentials' | 'unavailable' | 'invalid-response' | 'session-expired'

function loginError(error: unknown): { error: string; errorCode: AuthErrorCode } {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 400 || error.status === 401 || error.status === 422)
      return {
        error: 'Sign-in failed. Check your username and password.',
        errorCode: 'invalid-credentials',
      }
    return {
      error: 'The authentication server is unavailable. Please try again.',
      errorCode: 'unavailable',
    }
  }
  return {
    error: 'Unable to sign in. The authentication response was invalid.',
    errorCode: 'invalid-response',
  }
}

export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState({
    status: 'anonymous' as AuthStatus,
    user: null as AuthUser | null,
    error: null as string | null,
    errorCode: null as AuthErrorCode | null,
    version: 0,
  }),
  withComputed(() => {
    const config = inject(AUTH_CONFIG)
    return { configured: computed(() => config.configured) }
  }),
  withProps(() => {
    const changes = new Subject<number>()
    return { _changes: changes, changes$: changes.asObservable() }
  }),
  withMethods(store => {
    const config = inject(AUTH_CONFIG)
    // Resolve the default in this injector, not an ancestor configured for another app.
    const backend =
      inject(AuthBackend, { optional: true, self: true }) ?? createDefaultAuthBackend()
    let tokens: AuthTokens | null = null
    let expiresAt = 0
    let flight: Observable<string> | null = null
    let restoration: Observable<boolean> | null = null
    let signedOut = false
    let logoutFlight: Promise<void> | null = null
    const changes = store._changes
    const changes$ = store.changes$
    const cancelled = () => new Error('The authentication session changed.')
    const untilChanged = <T>(version: number) =>
      takeUntil<T>(
        changes$.pipe(
          filter(current => current !== version),
          mergeMap(() => throwError(cancelled)),
        ),
      )
    const clear = () => {
      tokens = null
      expiresAt = 0
      flight = null
      restoration = null
      patchState(store, {
        status: 'anonymous',
        user: null,
        error: null,
        errorCode: null,
        version: store.version() + 1,
      })
      changes.next(store.version())
    }
    inject(DestroyRef).onDestroy(() => {
      clear()
      changes.complete()
    })
    const accept = (value: AuthTokens | AuthSession, version: number): string => {
      if (store.version() !== version) throw cancelled()
      if (config.mode === 'cookie') {
        const session = validateAuthSession(value)
        expiresAt = session.expiresAt
        patchState(store, {
          user: session.user,
          status: 'authenticated',
          error: null,
          errorCode: null,
        })
        return ''
      }
      if (!('token' in value)) throw new Error('Invalid bearer session.')
      if (
        value.tenant !== undefined &&
        !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value.tenant)
      )
        throw new Error('Invalid session tenant.')
      if (
        !value?.refreshToken ||
        !Number.isFinite(Date.parse(value.refreshTokenExpiryTime)) ||
        Date.parse(value.refreshTokenExpiryTime) <= Date.now()
      )
        throw new Error('Invalid refresh token.')
      const decoded = decodeUser(value.token)
      tokens = { ...value }
      expiresAt = decoded.expiresAt
      patchState(store, {
        user: decoded.user,
        status: 'authenticated',
        error: null,
        errorCode: null,
      })
      return value.token
    }
    const refresh = (): Observable<string> => {
      if (flight) return flight
      const version = store.version()
      const current = tokens
      const request = defer(() => {
        if (version !== store.version()) return throwError(cancelled)
        if (config.mode === 'cookie' && signedOut) return throwError(cancelled)
        if (!config.configured)
          return throwError(
            () => new Error(config.configurationError ?? 'Authentication is unavailable.'),
          )
        if (
          config.mode !== 'cookie' &&
          (!current || Date.parse(current.refreshTokenExpiryTime) <= Date.now())
        )
          return throwError(() => new Error('Your session has expired. Please sign in again.'))
        patchState(store, { status: 'refreshing' })
        return backend.refresh(current)
      }).pipe(
        untilChanged<AuthTokens | AuthSession>(version),
        map(value => accept(value, version)),
        catchError(error => {
          if (store.version() === version) {
            clear()
            patchState(store, {
              error: config.configurationError ?? 'Your session has expired. Please sign in again.',
              errorCode: config.configured ? 'session-expired' : 'configuration',
            })
          }
          return throwError(() => error)
        }),
        finalize(() => {
          if (flight === guarded) flight = null
        }),
      )
      const shared = request.pipe(shareReplay({ bufferSize: 1, refCount: false }))
      const guarded = defer(() => (store.version() === version ? shared : throwError(cancelled)))
      flight = guarded
      return guarded
    }
    const isAuthenticated = (): boolean =>
      store.user() !== null && (config.mode === 'cookie' || !!tokens) && expiresAt > Date.now()
    const restore = (): Observable<boolean> => {
      // Navigation to login can run before the logout response clears its HttpOnly cookie.
      if (signedOut) return of(false)
      if (isAuthenticated()) return of(true)
      const restoreSession = backend.restore?.bind(backend)
      if (config.mode !== 'cookie' || !restoreSession || !config.configured) return of(false)
      if (restoration) return restoration
      const version = store.version()
      const request = defer(restoreSession).pipe(
        untilChanged<AuthSession | null>(version),
        map(value => {
          if (!value) return false
          accept(value, version)
          return true
        }),
        catchError(() => {
          if (store.version() === version) clear()
          return of(false)
        }),
        finalize(() => {
          if (restoration === shared) restoration = null
        }),
      )
      const shared = request.pipe(shareReplay({ bufferSize: 1, refCount: false }))
      restoration = shared
      return shared
    }
    return {
      clear,
      refresh,
      restore,
      untilChanged,
      // Deliberately evaluated at call time: computed(Date.now()) would cache expiry.
      isAuthenticated,
      accessToken: (): string | null => tokens?.token ?? null,
      tenant: (): string => tokens?.tenant ?? config.tenant,
      async login(credentials: AuthCredentials): Promise<boolean> {
        clear()
        signedOut = false
        const version = store.version()
        if (!config.configured) {
          patchState(store, { error: config.configurationError, errorCode: 'configuration' })
          return false
        }
        patchState(store, { status: 'authenticating' })
        try {
          // A late logout response must not remove a newly issued login cookie.
          if (logoutFlight) await logoutFlight
          if (store.version() !== version) return false
          const value = await firstValueFrom(
            defer(() => backend.login(credentials)).pipe(
              untilChanged<AuthTokens | AuthSession>(version),
            ),
          )
          accept(value, version)
          return true
        } catch (error) {
          if (store.version() === version) {
            clear()
            patchState(store, loginError(error))
          }
          return false
        }
      },
      async logout(): Promise<void> {
        const token = tokens?.token
        signedOut = true
        clear()
        if (logoutFlight) return logoutFlight
        if (!(token || config.mode === 'cookie') || !config.configured) return
        logoutFlight = firstValueFrom(backend.logout(token ?? '')).then(
          () => undefined,
          () => undefined, // Stay signed out locally even if the server is unavailable.
        )
        try {
          await logoutFlight
        } finally {
          logoutFlight = null
        }
      },
    }
  }),
)

export type SessionStore = InstanceType<typeof SessionStore>
