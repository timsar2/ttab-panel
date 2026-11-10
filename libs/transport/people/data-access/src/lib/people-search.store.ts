import { DestroyRef, effect, inject, untracked } from '@angular/core'
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals'
import { SessionStore } from '@org/auth-data-access'
import { TransportError, TransportPage, normalizeTransportError } from '@org/transport-http'
import { Subscription } from 'rxjs'
import { PEOPLE_ACCESS_DENIED, PeopleApi } from './people-api'
import { PeopleCompanyId, PeopleSearch, PersonId, PersonRow } from './person.models'

export const PeopleSearchStore = signalStore(
  withState({
    companyId: null as PeopleCompanyId | null,
    query: null as PeopleSearch | null,
    page: null as TransportPage<PersonRow> | null,
    selected: null as PersonRow | null,
    loading: false,
    status: 'idle' as 'idle' | 'loading' | 'ready' | 'denied' | 'error',
    error: null as TransportError | null,
  }),
  withMethods(store => {
    const api = inject(PeopleApi)
    const session = inject(SessionStore)
    let request: Subscription | undefined
    let epoch = 0
    let loadedVersion: number | null = null
    let lastCompany = api.companyId()
    const clear = () => {
      epoch++
      request?.unsubscribe()
      request = undefined
      loadedVersion = null
      patchState(store, {
        companyId: null,
        query: null,
        page: null,
        selected: null,
        loading: false,
        status: 'idle',
        error: null,
      })
    }
    const changes = session.changes$.subscribe(clear)
    effect(() => {
      const company = api.companyId()
      if (company !== lastCompany) {
        lastCompany = company
        untracked(clear)
      }
    })
    inject(DestroyRef).onDestroy(() => {
      clear()
      changes.unsubscribe()
    })
    return {
      clear,
      load(query: PeopleSearch) {
        clear()
        const company = api.companyId()
        lastCompany = company
        if (company === null || !session.user()) {
          patchState(store, { status: 'denied' })
          return
        }
        const current = epoch
        const version = session.version()
        loadedVersion = version
        const snapshot = { ...query }
        patchState(store, { companyId: company, query: snapshot, loading: true, status: 'loading' })
        request = api.search(snapshot).subscribe({
          next: page => {
            if (current === epoch && api.companyId() === company && session.version() === version) {
              patchState(store, { page, loading: false, status: 'ready' })
            }
          },
          error: error => {
            if (current !== epoch) return
            if (api.companyId() !== company || session.version() !== version) {
              clear()
              return
            }
            const normalized = normalizeTransportError(error)
            patchState(store, {
              loading: false,
              error: normalized,
              status:
                normalized.status === 401 ||
                normalized.status === 403 ||
                normalized.code === PEOPLE_ACCESS_DENIED
                  ? 'denied'
                  : 'error',
            })
          },
          complete: () => {
            if (current === epoch && store.loading()) clear()
          },
        })
      },
      select(id: PersonId | null) {
        if (
          store.companyId() !== api.companyId() ||
          loadedVersion !== session.version() ||
          !session.user()
        ) {
          clear()
          return id === null
        }
        const person =
          id === null ? null : (store.page()?.items.find(person => person.id === id) ?? null)
        patchState(store, { selected: person })
        return id === null || person !== null
      },
    }
  }),
)
