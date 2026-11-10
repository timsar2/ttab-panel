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
import { Subscription } from 'rxjs'
import { SUPPORT_ACCESS_DENIED, SupportApi } from './support-api'
import {
  SupportCompanyId,
  SupportDetail,
  SupportId,
  SupportRow,
  SupportSearch,
} from './support.models'

export type SupportReadStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'not-found' | 'error'

/** Provide on a route/workflow. No root provider, persistent cache, or list insertion from detail. */
export const SupportStore = signalStore(
  withState({
    _company: null as SupportCompanyId | null,
    _version: null as number | null,
    _query: null as SupportSearch | null,
    _page: null as TransportPage<SupportRow> | null,
    _detail: null as SupportDetail | null,
    _detailId: null as SupportId | null,
    _searchStatus: 'idle' as SupportReadStatus,
    _detailStatus: 'idle' as SupportReadStatus,
    _searchError: null as TransportError | null,
    _detailError: null as TransportError | null,
  }),
  withProps(() => ({ _api: inject(SupportApi), _session: inject(SessionStore) })),
  withComputed(store => {
    const scoped = computed(
      () =>
        !!store._session.user() &&
        store._company() !== null &&
        store._company() === store._api.companyId() &&
        store._version() === store._session.version(),
    )
    return {
      page: computed(() => (scoped() ? store._page() : null)),
      query: computed(() => (scoped() ? store._query() : null)),
      detail: computed(() => (scoped() ? store._detail() : null)),
      detailId: computed(() => (scoped() ? store._detailId() : null)),
      searchStatus: computed(() =>
        scoped() ? store._searchStatus() : ('idle' as SupportReadStatus),
      ),
      detailStatus: computed(() =>
        scoped() ? store._detailStatus() : ('idle' as SupportReadStatus),
      ),
      searchError: computed(() => (scoped() ? store._searchError() : null)),
      detailError: computed(() => (scoped() ? store._detailError() : null)),
    }
  }),
  withMethods(store => {
    let search: Subscription | undefined
    let detail: Subscription | undefined
    let searchEpoch = 0
    let detailEpoch = 0
    let lastCompany = store._api.companyId()
    const clear = () => {
      searchEpoch++
      detailEpoch++
      search?.unsubscribe()
      detail?.unsubscribe()
      lastCompany = store._api.companyId()
      patchState(store, {
        _company: null,
        _version: null,
        _query: null,
        _page: null,
        _detail: null,
        _detailId: null,
        _searchStatus: 'idle',
        _detailStatus: 'idle',
        _searchError: null,
        _detailError: null,
      })
    }
    const scope = () => {
      if (
        store._company() !== store._api.companyId() ||
        store._version() !== store._session.version()
      )
        clear()
      lastCompany = store._api.companyId()
      const company = lastCompany
      const version = store._session.version()
      patchState(store, { _company: company, _version: version })
      return () =>
        company === store._api.companyId() &&
        version === store._session.version() &&
        !!store._session.user()
    }
    const status = (error: TransportError): SupportReadStatus =>
      error.status === 401 || error.status === 403 || error.code === SUPPORT_ACCESS_DENIED
        ? 'denied'
        : error.status === 404
          ? 'not-found'
          : 'error'
    const changes = store._session.changes$.subscribe(clear)
    effect(() => {
      if (lastCompany !== store._api.companyId()) untracked(clear)
    })
    inject(DestroyRef).onDestroy(() => {
      clear()
      changes.unsubscribe()
    })
    return {
      clear,
      load(query: SupportSearch) {
        const matches = scope()
        const epoch = ++searchEpoch
        search?.unsubscribe()
        const snapshot = { ...query }
        patchState(store, {
          _query: snapshot,
          _page: null,
          _searchStatus: 'loading',
          _searchError: null,
        })
        search = store._api.search(snapshot).subscribe({
          next: page => {
            if (epoch === searchEpoch && matches())
              patchState(store, { _page: page, _searchStatus: 'ready' })
          },
          error: error => {
            if (epoch !== searchEpoch) return
            if (!matches()) {
              clear()
              return
            }
            const normalized = normalizeTransportError(error)
            patchState(store, { _searchError: normalized, _searchStatus: status(normalized) })
          },
          complete: () => {
            if (epoch === searchEpoch && matches() && store._searchStatus() === 'loading')
              patchState(store, { _searchStatus: 'idle' })
          },
        })
      },
      loadDetail(id: SupportId) {
        const matches = scope()
        const epoch = ++detailEpoch
        detail?.unsubscribe()
        patchState(store, {
          _detailId: id,
          _detail: null,
          _detailStatus: 'loading',
          _detailError: null,
        })
        detail = store._api.detail(id).subscribe({
          next: record => {
            if (epoch === detailEpoch && matches())
              patchState(store, {
                _detail: record,
                _detailStatus: record === null ? 'not-found' : 'ready',
              })
          },
          error: error => {
            if (epoch !== detailEpoch) return
            if (!matches()) {
              clear()
              return
            }
            const normalized = normalizeTransportError(error)
            patchState(store, { _detailError: normalized, _detailStatus: status(normalized) })
          },
          complete: () => {
            if (epoch === detailEpoch && matches() && store._detailStatus() === 'loading')
              patchState(store, { _detailStatus: 'idle' })
          },
        })
      },
    }
  }),
)
