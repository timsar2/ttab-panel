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
import { RouteId } from '@org/transport-routes-data-access'
import { Subscription } from 'rxjs'
import { LINES_ACCESS_DENIED, LinesApi } from './lines-api'
import { LineDetail, LineDraft, LineId, LineRow, LineSearch } from './line.models'

export type LineDetailStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'denied' | 'error'
export type LineSaveOutcome = 'none' | 'confirmed' | 'unconfirmed'

export const LinesStore = signalStore(
  withState({
    _company: null as number | null,
    _directionId: null as RouteId | null,
    _version: null as number | null,
    _page: null as TransportPage<LineRow> | null,
    _query: null as LineSearch | null,
    _listLoading: false,
    _listError: null as TransportError | null,
    _lineId: null as LineId | null,
    _line: null as LineDetail | null,
    _detailStatus: 'idle' as LineDetailStatus,
    _detailError: null as TransportError | null,
    _saving: false,
    _saveError: null as TransportError | null,
    _saveOutcome: 'none' as LineSaveOutcome,
    _savedId: null as LineId | null,
  }),
  withProps(() => ({ _api: inject(LinesApi), _session: inject(SessionStore) })),
  withComputed(store => {
    const scoped = computed(
      () =>
        !!store._session.user() &&
        store._company() !== null &&
        store._company() === store._api.companyId() &&
        store._directionId() !== null &&
        store._directionId() === store._api.directionId() &&
        store._version() === store._session.version(),
    )
    return {
      companyId: computed(() => (scoped() ? store._company() : null)),
      directionId: computed(() => (scoped() ? store._directionId() : null)),
      page: computed(() => (scoped() ? store._page() : null)),
      query: computed(() => (scoped() ? store._query() : null)),
      listLoading: computed(() => scoped() && store._listLoading()),
      listError: computed(() => (scoped() ? store._listError() : null)),
      line: computed(() => (scoped() ? store._line() : null)),
      detailStatus: computed(() => (scoped() ? store._detailStatus() : 'idle')),
      detailError: computed(() => (scoped() ? store._detailError() : null)),
      saving: computed(() => scoped() && store._saving()),
      saveError: computed(() => (scoped() ? store._saveError() : null)),
      saveOutcome: computed(() => (scoped() ? store._saveOutcome() : 'none')),
      savedId: computed(() => (scoped() ? store._savedId() : null)),
    }
  }),
  withMethods(store => {
    let listRequest: Subscription | undefined
    let detailRequest: Subscription | undefined
    let saveRequest: Subscription | undefined
    let epoch = 0
    let listEpoch = 0
    let detailEpoch = 0
    let lastCompany = store._api.companyId()
    let lastDirection = store._api.directionId()
    let lastVersion = store._session.version()

    const clearDetail = () => {
      detailEpoch++
      detailRequest?.unsubscribe()
      patchState(store, { _lineId: null, _line: null, _detailStatus: 'idle', _detailError: null })
    }
    const clear = () => {
      epoch++
      listEpoch++
      listRequest?.unsubscribe()
      saveRequest?.unsubscribe()
      clearDetail()
      lastCompany = store._api.companyId()
      lastDirection = store._api.directionId()
      lastVersion = store._session.version()
      patchState(store, {
        _company: null,
        _directionId: null,
        _version: null,
        _page: null,
        _query: null,
        _listLoading: false,
        _listError: null,
        _saving: false,
        _saveError: null,
        _saveOutcome: 'none',
        _savedId: null,
      })
    }
    const beginScope = () => {
      if (
        store._company() !== store._api.companyId() ||
        store._directionId() !== store._api.directionId() ||
        store._version() !== store._session.version()
      )
        clear()
      lastCompany = store._api.companyId()
      lastDirection = store._api.directionId()
      lastVersion = store._session.version()
      patchState(store, {
        _company: lastCompany,
        _directionId: lastDirection,
        _version: lastVersion,
      })
      const current = epoch
      const company = lastCompany
      const directionId = lastDirection
      const version = lastVersion
      return () =>
        current === epoch &&
        company === store._api.companyId() &&
        directionId === store._api.directionId() &&
        version === store._session.version() &&
        !!store._session.user()
    }

    const sessionChanges = store._session.changes$.subscribe(clear)
    effect(() => {
      const company = store._api.companyId()
      const direction = store._api.directionId()
      const version = store._session.version()
      if (company !== lastCompany || direction !== lastDirection || version !== lastVersion)
        untracked(clear)
    })
    inject(DestroyRef).onDestroy(() => {
      clear()
      sessionChanges.unsubscribe()
    })

    return {
      clear,
      clearDetail,
      loadList(query: LineSearch) {
        const matches = beginScope()
        const current = ++listEpoch
        listRequest?.unsubscribe()
        patchState(store, {
          _page: null,
          _query: { ...query },
          _listLoading: true,
          _listError: null,
        })
        listRequest = store._api.list(query).subscribe({
          next: page => {
            if (matches() && current === listEpoch)
              patchState(store, { _page: page, _listLoading: false })
          },
          error: error => {
            if (current !== listEpoch) return
            if (!matches()) return clear()
            patchState(store, { _listLoading: false, _listError: normalizeTransportError(error) })
          },
          complete: () => {
            if (matches() && current === listEpoch) patchState(store, { _listLoading: false })
          },
        })
      },
      loadDetail(id: LineId) {
        const matches = beginScope()
        clearDetail()
        const current = detailEpoch
        patchState(store, { _lineId: id, _detailStatus: 'loading' })
        detailRequest = store._api.detail(id).subscribe({
          next: line => {
            if (matches() && current === detailEpoch)
              patchState(store, { _line: line, _detailStatus: line ? 'ready' : 'missing' })
          },
          error: error => {
            if (current !== detailEpoch) return
            if (!matches()) return clear()
            const normalized = normalizeTransportError(error)
            const status: LineDetailStatus =
              normalized.status === 404
                ? 'missing'
                : normalized.status === 401 ||
                    normalized.status === 403 ||
                    normalized.code === LINES_ACCESS_DENIED
                  ? 'denied'
                  : 'error'
            patchState(store, { _line: null, _detailStatus: status, _detailError: normalized })
          },
          complete: () => {
            if (matches() && current === detailEpoch && store._detailStatus() === 'loading')
              clearDetail()
          },
        })
      },
      save(id: LineId | null, draft: LineDraft): boolean {
        const matches = beginScope()
        if (store._saving()) return false
        patchState(store, { _saving: true, _saveError: null, _saveOutcome: 'none', _savedId: null })
        saveRequest = store._api.save(id, draft).subscribe({
          next: savedId => {
            if (!matches()) return
            listEpoch++
            listRequest?.unsubscribe()
            clearDetail()
            const confirmed = savedId !== null && (id === null || savedId === id)
            patchState(store, {
              _page: null,
              _listLoading: false,
              _saving: false,
              _saveOutcome: confirmed ? 'confirmed' : 'unconfirmed',
              _savedId: confirmed ? savedId : null,
            })
          },
          error: error => {
            if (!matches()) return clear()
            const normalized = normalizeTransportError(error)
            patchState(store, {
              _saving: false,
              _saveError: normalized,
              _saveOutcome:
                normalized.kind === 'network' || normalized.status >= 500 ? 'unconfirmed' : 'none',
            })
          },
          complete: () => {
            if (matches()) patchState(store, { _saving: false })
          },
        })
        return true
      },
      clearSaveStatus() {
        patchState(store, { _saveError: null, _saveOutcome: 'none', _savedId: null })
      },
    }
  }),
)
