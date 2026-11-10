import { DestroyRef, inject } from '@angular/core'
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals'
import { SessionStore } from '@org/auth-data-access'
import { TransportError, normalizeTransportError } from '@org/transport-http'
import { Subject, catchError, defer, finalize, map, of, takeUntil } from 'rxjs'
import { CompanyApi } from './company-api'
import { CompanyDetail } from './company.models'

export type CompanyContextStatus =
  'idle' | 'loading' | 'ready' | 'invalid' | 'missing' | 'denied' | 'error'

/** Route-owned read context. A matching server response is required; list rows never grant access. */
export const CompanyContextStore = signalStore(
  withState({
    company: null as CompanyDetail | null,
    status: 'idle' as CompanyContextStatus,
    error: null as TransportError | null,
  }),
  withMethods(store => {
    const api = inject(CompanyApi)
    const session = inject(SessionStore)
    const canceled = new Subject<void>()
    let epoch = 0
    let prepared: CompanyDetail | null = null
    const clear = () => {
      epoch++
      prepared = null
      canceled.next()
      patchState(store, { company: null, status: 'idle', error: null })
    }
    const changes = session.changes$.subscribe(clear)
    inject(DestroyRef).onDestroy(() => {
      clear()
      changes.unsubscribe()
      canceled.complete()
    })
    const load = (routeId: string | null, publish: boolean) => {
      return defer(() => {
        clear()
        const current = epoch
        if (!routeId || !/^[1-9]\d*$/.test(routeId) || Number(routeId) > 32767) {
          patchState(store, { status: 'invalid' })
          return of(false)
        }
        // Permit the HTTP interceptor to refresh an expired, still-restorable identity.
        if (!session.user()) {
          patchState(store, { status: 'denied' })
          return of(false)
        }
        patchState(store, { status: 'loading' })
        return api.detail(Number(routeId)).pipe(
          takeUntil(canceled),
          map(company => {
            if (current !== epoch) return false
            if (!company) patchState(store, { status: 'missing' })
            else if (publish) patchState(store, { company, status: 'ready' })
            else prepared = company
            return company !== null
          }),
          catchError(error => {
            if (current === epoch) {
              const normalized = normalizeTransportError(error)
              const status =
                normalized.status === 401 || normalized.status === 403 ? 'denied' : 'error'
              patchState(store, { company: null, status, error: normalized })
            }
            return of(false)
          }),
          finalize(() => {
            if (current === epoch && store.status() === 'loading' && !prepared) clear()
          }),
        )
      })
    }
    return {
      clear,
      load: (routeId: string | null) => load(routeId, true),
      prepare: (routeId: string | null) => load(routeId, false),
      canEnterRoute(routeId: string | null) {
        if (!routeId || !/^[1-9]\d*$/.test(routeId)) return false
        return (
          prepared?.id === Number(routeId) ||
          (store.status() === 'ready' && store.company()?.id === Number(routeId))
        )
      },
      activate(routeId: string | null) {
        if (prepared && routeId === String(prepared.id)) {
          const company = prepared
          prepared = null
          patchState(store, { company, status: 'ready' })
        } else if (prepared) clear()
      },
      discardPending() {
        if (prepared || store.status() === 'loading') clear()
      },
    }
  }),
)
