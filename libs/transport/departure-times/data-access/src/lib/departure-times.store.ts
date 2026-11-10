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
import { TransportError, normalizeTransportError } from '@org/transport-http'
import { Subscription } from 'rxjs'
import { DEPARTURE_TIME_ACCESS_DENIED, DepartureTimesApi } from './departure-times-api'
import {
  DepartureCompanyId,
  DepartureTimeDraft,
  DepartureTimeDto,
  DepartureTimeId,
  DepartureTimeList,
  DepartureTimeSearch,
} from './departure-time.models'

export type DepartureTimeDetailStatus =
  'idle' | 'loading' | 'ready' | 'missing' | 'denied' | 'error'

/** Provide per consuming route/workflow, never globally. No editable drafts or cross-page selection. */
export const DepartureTimesStore = signalStore(
  withState({
    _company: null as DepartureCompanyId | null,
    _version: null as number | null,
    _list: null as DepartureTimeList | null,
    _query: null as DepartureTimeSearch | null,
    _loading: false,
    _saving: false,
    _error: null as TransportError | null,
    _saveError: null as TransportError | null,
    _detailId: null as DepartureTimeId | null,
    _detail: null as DepartureTimeDto | null,
    _detailStatus: 'idle' as DepartureTimeDetailStatus,
    _detailError: null as TransportError | null,
    _saved: null as DepartureTimeDto | null,
    _saveOutcome: 'none' as 'none' | 'confirmed' | 'unconfirmed',
  }),
  withProps(() => ({ _api: inject(DepartureTimesApi), _session: inject(SessionStore) })),
  withComputed(store => {
    const scoped = computed(
      () =>
        !!store._session.user() &&
        store._company() !== null &&
        store._company() === store._api.companyId() &&
        store._version() === store._session.version(),
    )
    const list = computed(() => (scoped() ? store._list() : null))
    return {
      list,
      query: computed(() => (scoped() ? store._query() : null)),
      lookupOptions: computed(
        () =>
          list()?.items.map(item => ({
            value: item.id,
            label: item.name,
            shiftTime: item.shiftTime,
          })) ?? [],
      ),
      loading: computed(() => scoped() && store._loading()),
      saving: computed(() => scoped() && store._saving()),
      error: computed(() => (scoped() ? (store._saveError() ?? store._error()) : null)),
      saveError: computed(() => (scoped() ? store._saveError() : null)),
      detail: computed(() => (scoped() ? store._detail() : null)),
      detailStatus: computed(() => (scoped() ? store._detailStatus() : 'idle')),
      detailError: computed(() => (scoped() ? store._detailError() : null)),
      saved: computed(() => (scoped() ? store._saved() : null)),
      saveOutcome: computed(() => (scoped() ? store._saveOutcome() : 'none')),
    }
  }),
  withMethods(store => {
    let read: Subscription | undefined
    let write: Subscription | undefined
    let detailRead: Subscription | undefined
    let epoch = 0
    let readEpoch = 0
    let detailEpoch = 0
    let lastCompany = store._api.companyId()
    const clearDetail = () => {
      detailEpoch++
      detailRead?.unsubscribe()
      detailRead = undefined
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
      patchState(store, {
        _company: null,
        _version: null,
        _list: null,
        _query: null,
        _loading: false,
        _saving: false,
        _error: null,
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
        version === store._session.version() &&
        !!store._session.user()
    }
    const sessionChanges = store._session.changes$.subscribe(clear)
    effect(() => {
      if (store._api.companyId() !== lastCompany) untracked(clear)
    })
    inject(DestroyRef).onDestroy(() => {
      clear()
      sessionChanges.unsubscribe()
    })
    return {
      clear,
      clearDetail,
      loadDetail(id: DepartureTimeId) {
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
            const status: DepartureTimeDetailStatus =
              normalized.status === 404
                ? 'missing'
                : normalized.status === 401 ||
                    normalized.status === 403 ||
                    normalized.code === DEPARTURE_TIME_ACCESS_DENIED
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
      load(search: DepartureTimeSearch = { name: '' }) {
        const matches = scope()
        const current = ++readEpoch
        read?.unsubscribe()
        patchState(store, { _list: null, _query: { ...search }, _loading: true, _error: null })
        read = store._api.list(search).subscribe({
          next: list => {
            if (matches() && current === readEpoch)
              patchState(store, { _list: list, _loading: false })
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
      /** Caller keeps its draft. A failed or unconfirmed save never overwrites it. */
      save(draft: DepartureTimeDraft, id?: DepartureTimeId): boolean {
        const matches = scope()
        if (store._saving()) return false
        patchState(store, {
          _saving: true,
          _error: null,
          _saveError: null,
          _saved: null,
          _saveOutcome: 'none',
        })
        write = (
          id === undefined ? store._api.create(draft) : store._api.update(id, draft)
        ).subscribe({
          next: saved => {
            if (!matches()) return
            // Only this scoped list is invalidated; no global cache and no guessed schedule recomputation.
            readEpoch++
            read?.unsubscribe()
            patchState(store, {
              _list: null,
              _loading: false,
              _saving: false,
              _saved: saved,
              _saveOutcome: saved === null ? 'unconfirmed' : 'confirmed',
            })
            if (saved !== null && id !== undefined && store._detailId() === id && saved.id === id) {
              // A pre-save detail read must not overwrite this confirmed matching update.
              detailEpoch++
              detailRead?.unsubscribe()
              patchState(store, { _detail: saved, _detailStatus: 'ready', _detailError: null })
            }
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
