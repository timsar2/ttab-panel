import { DestroyRef, computed, effect, inject, untracked } from '@angular/core'
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals'
import { SessionStore } from '@org/auth-data-access'
import { TransportError, TransportPage, normalizeTransportError } from '@org/transport-http'
import { PeopleApi } from '@org/transport-people-data-access'
import { Subscription } from 'rxjs'
import { DRIVERS_ACCESS_DENIED, DriversApi } from './drivers-api'
import {
  DriverCompanyId,
  DriverDraft,
  DriverId,
  DriverRecord,
  DriverRow,
  DriverSearch,
} from './driver.models'

export type DriverDetailStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'denied' | 'error'
export type DriverSaveOutcome = 'none' | 'confirmed' | 'unconfirmed'

/** Provide per route/workflow. Drafts and Person selection remain local to the consumer. */
export const DriversStore = signalStore(
  withState({
    _company: null as DriverCompanyId | null,
    _version: null as number | null,
    _page: null as TransportPage<DriverRow> | null,
    _query: null as DriverSearch | null,
    _loading: false,
    _error: null as TransportError | null,
    _detailId: null as DriverId | null,
    _detail: null as DriverRecord | null,
    _detailStatus: 'idle' as DriverDetailStatus,
    _detailError: null as TransportError | null,
    _saving: false,
    _saveError: null as TransportError | null,
    _saved: null as DriverRecord | null,
    _saveOutcome: 'none' as DriverSaveOutcome,
  }),
  withProps(() => ({
    _api: inject(DriversApi),
    _session: inject(SessionStore),
    _people: inject(PeopleApi),
  })),
  withComputed(store => {
    const scoped = computed(
      () =>
        !!store._session.user() &&
        store._company() !== null &&
        store._company() === store._api.companyId() &&
        store._company() === store._people.companyId() &&
        store._version() === store._session.version(),
    )
    return {
      page: computed(() => (scoped() ? store._page() : null)),
      query: computed(() => (scoped() ? store._query() : null)),
      loading: computed(() => scoped() && store._loading()),
      error: computed(() => (scoped() ? store._error() : null)),
      detail: computed(() => (scoped() ? store._detail() : null)),
      detailStatus: computed(() => (scoped() ? store._detailStatus() : 'idle')),
      detailError: computed(() => (scoped() ? store._detailError() : null)),
      saving: computed(() => scoped() && store._saving()),
      saveError: computed(() => (scoped() ? store._saveError() : null)),
      saved: computed(() => (scoped() ? store._saved() : null)),
      saveOutcome: computed(() => (scoped() ? store._saveOutcome() : 'none')),
    }
  }),
  withMethods(store => {
    let read: Subscription | undefined
    let detailRead: Subscription | undefined
    let write: Subscription | undefined
    let epoch = 0
    let readEpoch = 0
    let detailEpoch = 0
    let lastCompany = store._api.companyId()
    let lastPeopleCompany = store._people.companyId()
    const clearDetail = () => {
      detailEpoch++
      detailRead?.unsubscribe()
      patchState(store, {
        _detailId: null,
        _detail: null,
        _detailStatus: 'idle',
        _detailError: null,
      })
    }
    const clear = () => {
      epoch++
      readEpoch++
      read?.unsubscribe()
      write?.unsubscribe()
      clearDetail()
      lastCompany = store._api.companyId()
      lastPeopleCompany = store._people.companyId()
      patchState(store, {
        _company: null,
        _version: null,
        _page: null,
        _query: null,
        _loading: false,
        _error: null,
        _saving: false,
        _saveError: null,
        _saved: null,
        _saveOutcome: 'none',
      })
    }
    const scope = () => {
      if (
        store._company() !== store._api.companyId() ||
        store._version() !== store._session.version()
      )
        clear()
      lastCompany = store._api.companyId()
      patchState(store, { _company: lastCompany, _version: store._session.version() })
      const current = epoch
      const company = lastCompany
      const version = store._session.version()
      return () =>
        current === epoch &&
        company === store._api.companyId() &&
        company === store._people.companyId() &&
        version === store._session.version() &&
        !!store._session.user()
    }
    const sessionChanges = store._session.changes$.subscribe(clear)
    effect(() => {
      if (lastCompany !== store._api.companyId() || lastPeopleCompany !== store._people.companyId())
        untracked(clear)
    })
    inject(DestroyRef).onDestroy(() => {
      clear()
      sessionChanges.unsubscribe()
    })
    return {
      clear,
      clearDetail,
      search(query: DriverSearch) {
        const matches = scope()
        const current = ++readEpoch
        read?.unsubscribe()
        patchState(store, { _page: null, _query: { ...query }, _loading: true, _error: null })
        read = store._api.search(query).subscribe({
          next: page => {
            if (matches() && current === readEpoch)
              patchState(store, { _page: page, _loading: false })
          },
          error: error => {
            if (current !== readEpoch) return
            if (!matches()) {
              clear()
              return
            }
            patchState(store, { _loading: false, _error: normalizeTransportError(error) })
          },
          complete: () => {
            if (matches() && current === readEpoch) patchState(store, { _loading: false })
          },
        })
      },
      loadDetail(id: DriverId) {
        const matches = scope()
        clearDetail()
        const current = detailEpoch
        patchState(store, { _detailId: id, _detailStatus: 'loading' })
        detailRead = store._api.detail(id).subscribe({
          next: detail => {
            if (matches() && current === detailEpoch)
              patchState(store, {
                _detail: detail,
                _detailStatus: detail === null ? 'missing' : 'ready',
              })
          },
          error: error => {
            if (current !== detailEpoch) return
            if (!matches()) {
              clear()
              return
            }
            const normalized = normalizeTransportError(error)
            const status: DriverDetailStatus =
              normalized.status === 404
                ? 'missing'
                : normalized.status === 401 ||
                    normalized.status === 403 ||
                    normalized.code === DRIVERS_ACCESS_DENIED ||
                    normalized.code === 'people-access-denied'
                  ? 'denied'
                  : 'error'
            patchState(store, { _detail: null, _detailStatus: status, _detailError: normalized })
          },
          complete: () => {
            if (matches() && current === detailEpoch && store._detailStatus() === 'loading')
              clearDetail()
          },
        })
      },
      /** False means another mutation is pending. Never discards or stores the caller's draft. */
      save(id: DriverId, draft: DriverDraft): boolean {
        const matches = scope()
        if (store._saving()) return false
        patchState(store, { _saving: true, _saveError: null, _saved: null, _saveOutcome: 'none' })
        write = store._api.upsert(id, draft).subscribe({
          next: saved => {
            if (!matches()) return
            readEpoch++
            read?.unsubscribe()
            // Even an unconfirmed accepted save invalidates matching pre-save detail reads.
            const matchingDetail = store._detailId() === id
            if (matchingDetail) clearDetail()
            patchState(store, {
              _page: null,
              _loading: false,
              _saving: false,
              _saved: saved,
              _saveOutcome: saved === null ? 'unconfirmed' : 'confirmed',
            })
            if (saved !== null && matchingDetail)
              patchState(store, {
                _detailId: id,
                _detail: saved,
                _detailStatus: 'ready',
                _detailError: null,
              })
          },
          error: error => {
            if (!matches()) {
              clear()
              return
            }
            patchState(store, { _saving: false, _saveError: normalizeTransportError(error) })
          },
          complete: () => {
            if (matches()) patchState(store, { _saving: false })
          },
        })
        return true
      },
    }
  }),
)
