import { DestroyRef, effect, inject, untracked } from '@angular/core'
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals'
import { SessionStore } from '@org/auth-data-access'
import { PeopleApi, PersonDetail, PersonDraft, PersonId } from '@org/transport-people-data-access'
import { TransportError, TransportImageUpload, normalizeTransportError } from '@org/transport-http'
import { Subscription } from 'rxjs'

/** Person editing workflow only; search and driver state retain their existing owners. */
export const DriverPersonEditorStore = signalStore(
  withState({
    saving: false,
    saved: null as PersonDetail | null,
    detail: null as PersonDetail | null,
    loading: false,
    error: null as TransportError | null,
    unconfirmed: false,
  }),
  withMethods(store => {
    const api = inject(PeopleApi)
    const session = inject(SessionStore)
    let request: Subscription | undefined
    let epoch = 0
    const clear = () => {
      epoch++
      request?.unsubscribe()
      patchState(store, {
        saving: false,
        saved: null,
        detail: null,
        loading: false,
        error: null,
        unconfirmed: false,
      })
    }
    const changes = session.changes$.subscribe(clear)
    let scope = api.companyId()
    effect(() => {
      const next = api.companyId()
      if (next !== scope) {
        scope = next
        untracked(clear)
      }
    })
    inject(DestroyRef).onDestroy(() => {
      clear()
      changes.unsubscribe()
    })
    return {
      clear,
      load(id: PersonId) {
        if (store.saving()) return
        clear()
        const current = epoch
        patchState(store, { loading: true })
        request = api.detail(id).subscribe({
          next: detail => {
            if (current === epoch)
              patchState(store, {
                detail,
                loading: false,
                error: detail ? null : new TransportError('validation', 404, 'Person not found.'),
              })
          },
          error: error => {
            if (current === epoch)
              patchState(store, { loading: false, error: normalizeTransportError(error) })
          },
          complete: () => {
            if (current === epoch) patchState(store, { loading: false })
          },
        })
      },
      save(
        draft: PersonDraft,
        original: PersonDetail | null = null,
        image: TransportImageUpload | null = null,
      ) {
        if (store.saving() || store.unconfirmed()) return
        const current = ++epoch
        patchState(store, { saving: true, error: null })
        request = (
          original ? api.update(original, draft, image) : api.create(draft, image)
        ).subscribe({
          next: saved => {
            if (current === epoch) patchState(store, { saving: false, saved, unconfirmed: !saved })
          },
          error: error => {
            if (current === epoch)
              patchState(store, { saving: false, error: normalizeTransportError(error) })
          },
          complete: () => {
            if (current === epoch && store.saving()) clear()
          },
        })
      },
    }
  }),
)
