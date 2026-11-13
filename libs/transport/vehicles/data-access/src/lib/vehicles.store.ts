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
import { VEHICLES_ACCESS_DENIED, VehiclesApi } from './vehicles-api'
import {
  CarType,
  CarTypeDraft,
  VehicleDetail,
  VehicleDraft,
  VehicleId,
  VehicleRow,
  VehicleSearch,
} from './vehicle.models'

export type VehicleDetailStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'denied' | 'error'
export type VehicleSaveOutcome = 'none' | 'confirmed' | 'unconfirmed'

/** Route-scoped source state. Editable drafts remain local to Signal Forms components. */
export const VehiclesStore = signalStore(
  withState({
    _company: null as number | null,
    _version: null as number | null,
    _page: null as TransportPage<VehicleRow> | null,
    _query: null as VehicleSearch | null,
    _loading: false,
    _error: null as TransportError | null,
    _detailId: null as VehicleId | null,
    _detail: null as VehicleDetail | null,
    _detailStatus: 'idle' as VehicleDetailStatus,
    _detailError: null as TransportError | null,
    _types: null as readonly CarType[] | null,
    _typesRevision: 0,
    _typesLoading: false,
    _typesError: null as TransportError | null,
    _mutating: false,
    _mutationError: null as TransportError | null,
    _saveOutcome: 'none' as VehicleSaveOutcome,
    _savedId: null as VehicleId | null,
    _deleteOutcome: false,
  }),
  withProps(() => ({ _api: inject(VehiclesApi), _session: inject(SessionStore) })),
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
      loading: computed(() => scoped() && store._loading()),
      error: computed(() => (scoped() ? store._error() : null)),
      detail: computed(() => (scoped() ? store._detail() : null)),
      detailStatus: computed(() => (scoped() ? store._detailStatus() : 'idle')),
      detailError: computed(() => (scoped() ? store._detailError() : null)),
      types: computed(() => (scoped() ? store._types() : null)),
      typesRevision: computed(() => (scoped() ? store._typesRevision() : 0)),
      typesLoading: computed(() => scoped() && store._typesLoading()),
      typesError: computed(() => (scoped() ? store._typesError() : null)),
      mutating: computed(() => scoped() && store._mutating()),
      mutationError: computed(() => (scoped() ? store._mutationError() : null)),
      saveOutcome: computed(() => (scoped() ? store._saveOutcome() : 'none')),
      savedId: computed(() => (scoped() ? store._savedId() : null)),
      deleteOutcome: computed(() => scoped() && store._deleteOutcome()),
    }
  }),
  withMethods(store => {
    let pageRead: Subscription | undefined
    let detailRead: Subscription | undefined
    let typeRead: Subscription | undefined
    let mutation: Subscription | undefined
    let epoch = 0
    let pageEpoch = 0
    let detailEpoch = 0
    let typeEpoch = 0
    let lastCompany = store._api.companyId()
    let lastVersion = store._session.version()

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
      pageEpoch++
      typeEpoch++
      pageRead?.unsubscribe()
      typeRead?.unsubscribe()
      mutation?.unsubscribe()
      clearDetail()
      lastCompany = store._api.companyId()
      lastVersion = store._session.version()
      patchState(store, {
        _company: null,
        _version: null,
        _page: null,
        _query: null,
        _loading: false,
        _error: null,
        _types: null,
        _typesRevision: 0,
        _typesLoading: false,
        _typesError: null,
        _mutating: false,
        _mutationError: null,
        _saveOutcome: 'none',
        _savedId: null,
        _deleteOutcome: false,
      })
    }
    const scope = () => {
      if (
        store._company() !== store._api.companyId() ||
        store._version() !== store._session.version()
      )
        clear()
      lastCompany = store._api.companyId()
      lastVersion = store._session.version()
      patchState(store, { _company: lastCompany, _version: lastVersion })
      const current = epoch
      const company = lastCompany
      const version = lastVersion
      return () =>
        current === epoch &&
        company === store._api.companyId() &&
        version === store._session.version() &&
        !!store._session.user()
    }

    const sessionChanges = store._session.changes$.subscribe(clear)
    effect(() => {
      const company = store._api.companyId()
      const version = store._session.version()
      if (company !== lastCompany || version !== lastVersion) untracked(clear)
    })
    inject(DestroyRef).onDestroy(() => {
      clear()
      sessionChanges.unsubscribe()
    })

    const loadTypes = () => {
      const matches = scope()
      const current = ++typeEpoch
      typeRead?.unsubscribe()
      patchState(store, {
        _types: null,
        _typesRevision: store._typesRevision() + 1,
        _typesLoading: true,
        _typesError: null,
      })
      typeRead = store._api.types().subscribe({
        next: types => {
          if (matches() && current === typeEpoch)
            patchState(store, { _types: types, _typesLoading: false })
        },
        error: error => {
          if (current !== typeEpoch) return
          if (!matches()) return clear()
          patchState(store, { _typesLoading: false, _typesError: normalizeTransportError(error) })
        },
        complete: () => {
          if (matches() && current === typeEpoch) patchState(store, { _typesLoading: false })
        },
      })
    }

    return {
      clear,
      clearDetail,
      clearMutation() {
        patchState(store, {
          _mutationError: null,
          _saveOutcome: 'none',
          _savedId: null,
          _deleteOutcome: false,
        })
      },
      search(query: VehicleSearch) {
        const matches = scope()
        const current = ++pageEpoch
        pageRead?.unsubscribe()
        patchState(store, { _page: null, _query: { ...query }, _loading: true, _error: null })
        pageRead = store._api.search(query).subscribe({
          next: page => {
            if (matches() && current === pageEpoch)
              patchState(store, { _page: page, _loading: false })
          },
          error: error => {
            if (current !== pageEpoch) return
            if (!matches()) return clear()
            patchState(store, { _loading: false, _error: normalizeTransportError(error) })
          },
          complete: () => {
            if (matches() && current === pageEpoch) patchState(store, { _loading: false })
          },
        })
      },
      loadDetail(id: VehicleId) {
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
            if (!matches()) return clear()
            const normalized = normalizeTransportError(error)
            const status: VehicleDetailStatus =
              normalized.status === 404
                ? 'missing'
                : normalized.status === 401 ||
                    normalized.status === 403 ||
                    normalized.code === VEHICLES_ACCESS_DENIED
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
      loadTypes,
      save(id: VehicleId | null, draft: VehicleDraft): boolean {
        const matches = scope()
        if (store._mutating()) return false
        patchState(store, {
          _mutating: true,
          _mutationError: null,
          _saveOutcome: 'none',
          _savedId: null,
        })
        mutation = store._api.save(id, draft).subscribe({
          next: savedId => {
            if (!matches()) return
            pageEpoch++
            pageRead?.unsubscribe()
            clearDetail()
            const confirmed = savedId !== null && (id === null || savedId === id)
            patchState(store, {
              _page: null,
              _loading: false,
              _mutating: false,
              _saveOutcome: confirmed ? 'confirmed' : 'unconfirmed',
              _savedId: confirmed ? savedId : null,
            })
          },
          error: error => {
            if (!matches()) return clear()
            const normalized = normalizeTransportError(error)
            patchState(store, {
              _mutating: false,
              _mutationError: normalized,
              _saveOutcome:
                normalized.kind === 'network' || normalized.status >= 500 ? 'unconfirmed' : 'none',
            })
          },
          complete: () => {
            if (matches()) patchState(store, { _mutating: false })
          },
        })
        return true
      },
      createType(draft: CarTypeDraft): boolean {
        const matches = scope()
        if (store._mutating()) return false
        patchState(store, { _mutating: true, _mutationError: null })
        mutation = store._api.createType(draft).subscribe({
          next: () => {
            if (!matches()) return
            patchState(store, { _mutating: false })
            loadTypes()
          },
          error: error => {
            if (!matches()) return clear()
            patchState(store, { _mutating: false, _mutationError: normalizeTransportError(error) })
          },
          complete: () => {
            if (matches()) patchState(store, { _mutating: false })
          },
        })
        return true
      },
      delete(id: VehicleId): boolean {
        const matches = scope()
        if (store._mutating()) return false
        patchState(store, { _mutating: true, _mutationError: null, _deleteOutcome: false })
        mutation = store._api.delete(id).subscribe({
          next: () => {
            if (!matches()) return
            pageEpoch++
            pageRead?.unsubscribe()
            if (store._detailId() === id) clearDetail()
            patchState(store, {
              _page: null,
              _loading: false,
              _mutating: false,
              _deleteOutcome: true,
            })
          },
          error: error => {
            if (!matches()) return clear()
            patchState(store, { _mutating: false, _mutationError: normalizeTransportError(error) })
          },
          complete: () => {
            if (matches()) patchState(store, { _mutating: false })
          },
        })
        return true
      },
    }
  }),
)
