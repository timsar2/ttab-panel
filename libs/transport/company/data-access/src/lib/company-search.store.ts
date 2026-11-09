import { DestroyRef, inject } from '@angular/core'
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals'
import { SessionStore } from '@org/auth-data-access'
import { TransportError, TransportPage, normalizeTransportError } from '@org/transport-http'
import { Subscription } from 'rxjs'
import { CompanyApi } from './company-api'
import { CompanyRow, CompanySearch } from './company.models'

/** Provide at the feature boundary. There is no cross-company/session record cache. */
export const CompanySearchStore = signalStore(
  withState({
    page: null as TransportPage<CompanyRow> | null,
    loading: false,
    error: null as TransportError | null,
  }),
  withMethods(store => {
    const api = inject(CompanyApi)
    const session = inject(SessionStore)
    let request: Subscription | undefined
    let epoch = 0
    const clear = () => {
      epoch++
      request?.unsubscribe()
      request = undefined
      patchState(store, { page: null, loading: false, error: null })
    }
    const changes = session.changes$.subscribe(clear)
    inject(DestroyRef).onDestroy(() => {
      clear()
      changes.unsubscribe()
    })
    return {
      clear,
      load(query: CompanySearch) {
        clear()
        // An expired access token may still be refreshable by the scoped HTTP chain.
        if (!session.user()) {
          patchState(store, {
            error: new TransportError('http', 401, 'Sign in to search companies.'),
          })
          return
        }
        const current = epoch
        patchState(store, { loading: true })
        try {
          request = api.search(query).subscribe({
            next: page => {
              if (epoch === current) patchState(store, { page, loading: false })
            },
            error: error => {
              if (epoch === current)
                patchState(store, {
                  loading: false,
                  error: normalizeTransportError(error),
                })
            },
          })
        } catch (error) {
          if (epoch === current)
            patchState(store, { loading: false, error: normalizeTransportError(error) })
        }
      },
    }
  }),
)
