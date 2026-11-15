import { DestroyRef, computed, inject } from '@angular/core'
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
import { Subscription, tap } from 'rxjs'
import { InspectionApi, INSPECTION_ACCESS_DENIED } from './inspection-api'
import {
  InspectionDetail,
  InspectionId,
  InspectionSearch,
  InspectionSort,
  InspectionVisitRow,
} from './inspection.models'

export type InspectionLoadStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'not-found' | 'error'

export const InspectionStore = signalStore(
  withState({
    _version: null as number | null,
    _visits: null as readonly InspectionVisitRow[] | null,
    _pageNumber: 1,
    _pageSize: 10,
    _orderBy: 'InspectionDate DESC' as InspectionSort,
    _hasNext: false,
    _listStatus: 'idle' as InspectionLoadStatus,
    _listError: null as TransportError | null,
    _detail: null as InspectionDetail | null,
    _detailId: null as InspectionId | null,
    _detailStatus: 'idle' as InspectionLoadStatus,
    _detailError: null as TransportError | null,
  }),
  withProps(() => ({ _api: inject(InspectionApi), _session: inject(SessionStore) })),
  withComputed(store => {
    const current = computed(
      () => !!store._session.user() && store._version() === store._session.version(),
    )
    return {
      visits: computed(() => (current() ? store._visits() : null)),
      pageNumber: computed(() => (current() ? store._pageNumber() : 1)),
      pageSize: computed(() => (current() ? store._pageSize() : 10)),
      orderBy: computed(() =>
        current() ? store._orderBy() : ('InspectionDate DESC' as InspectionSort),
      ),
      hasNext: computed(() => (current() ? store._hasNext() : false)),
      listStatus: computed(() =>
        current() ? store._listStatus() : ('idle' as InspectionLoadStatus),
      ),
      listError: computed(() => (current() ? store._listError() : null)),
      detail: computed(() => (current() ? store._detail() : null)),
      detailId: computed(() => (current() ? store._detailId() : null)),
      detailStatus: computed(() =>
        current() ? store._detailStatus() : ('idle' as InspectionLoadStatus),
      ),
      detailError: computed(() => (current() ? store._detailError() : null)),
    }
  }),
  withMethods(store => {
    let listSubscription: Subscription | undefined
    let detailSubscription: Subscription | undefined
    let listEpoch = 0
    let detailEpoch = 0
    let version = store._session.version()
    const clear = () => {
      listEpoch++
      detailEpoch++
      listSubscription?.unsubscribe()
      detailSubscription?.unsubscribe()
      version = store._session.version()
      patchState(store, {
        _version: null,
        _visits: null,
        _pageNumber: 1,
        _pageSize: 10,
        _orderBy: 'InspectionDate DESC',
        _hasNext: false,
        _listStatus: 'idle',
        _listError: null,
        _detail: null,
        _detailId: null,
        _detailStatus: 'idle',
        _detailError: null,
      })
    }
    const scope = () => {
      if (store._version() !== store._session.version()) clear()
      version = store._session.version()
      patchState(store, { _version: version })
      return () => version === store._session.version() && !!store._session.user()
    }
    const status = (error: TransportError, detail = false): InspectionLoadStatus =>
      error.status === 401 || error.status === 403 || error.code === INSPECTION_ACCESS_DENIED
        ? 'denied'
        : detail && error.status === 404
          ? 'not-found'
          : 'error'
    const changes = store._session.changes$.subscribe(clear)
    inject(DestroyRef).onDestroy(() => {
      clear()
      changes.unsubscribe()
    })
    return {
      clear,
      load(search: InspectionSearch) {
        const matches = scope()
        const epoch = ++listEpoch
        listSubscription?.unsubscribe()
        patchState(store, {
          _visits: null,
          _pageNumber: search.pageNumber,
          _pageSize: search.pageSize,
          _orderBy: search.orderBy,
          _hasNext: false,
          _listStatus: 'loading',
          _listError: null,
        })
        listSubscription = store._api.search(search).subscribe({
          next: visits => {
            if (epoch === listEpoch && matches())
              patchState(store, {
                _visits: visits,
                _hasNext: visits.length === search.pageSize,
                _listStatus: 'ready',
              })
          },
          error: error => {
            if (epoch !== listEpoch) return
            if (!matches()) {
              clear()
              return
            }
            const normalized = normalizeTransportError(error)
            patchState(store, { _listError: normalized, _listStatus: status(normalized) })
          },
        })
      },
      loadDetail(id: InspectionId) {
        const matches = scope()
        const epoch = ++detailEpoch
        detailSubscription?.unsubscribe()
        patchState(store, {
          _detail: null,
          _detailId: id,
          _detailStatus: 'loading',
          _detailError: null,
        })
        detailSubscription = store._api.detail(id).subscribe({
          next: detail => {
            if (epoch === detailEpoch && matches())
              patchState(store, { _detail: detail, _detailStatus: 'ready' })
          },
          error: error => {
            if (epoch !== detailEpoch) return
            if (!matches()) {
              clear()
              return
            }
            const normalized = normalizeTransportError(error)
            patchState(store, { _detailError: normalized, _detailStatus: status(normalized, true) })
          },
        })
      },
      createVisit: (draft: Parameters<InspectionApi['createVisit']>[0]) =>
        store._api.createVisit(draft),
      addDefect: (draft: Parameters<InspectionApi['addDefect']>[0]) =>
        store._api.addDefect(draft).pipe(
          tap(id => {
            const detail = store._detail()
            if (
              !detail ||
              detail.id !== draft.inspectionVisitId ||
              store._version() !== store._session.version() ||
              !store._session.user()
            )
              return
            patchState(store, {
              _detail: {
                ...detail,
                defects: [
                  ...detail.defects,
                  {
                    id,
                    inspectionVisitId: draft.inspectionVisitId,
                    dueDate: draft.dueDate,
                    description: draft.description.trim(),
                  },
                ],
              },
            })
          }),
        ),
      addCorrectiveAction: (draft: Parameters<InspectionApi['addCorrectiveAction']>[0]) =>
        store._api.addCorrectiveAction(draft).pipe(
          tap(id => {
            const detail = store._detail()
            if (
              !detail ||
              detail.id !== draft.inspectionVisitId ||
              store._version() !== store._session.version() ||
              !store._session.user()
            )
              return
            patchState(store, {
              _detail: {
                ...detail,
                correctiveActions: [
                  ...detail.correctiveActions,
                  {
                    id,
                    inspectionVisitId: draft.inspectionVisitId,
                    completedAt: draft.completedAt,
                    description: draft.description.trim(),
                  },
                ],
              },
            })
          }),
        ),
      setStatus: (id: InspectionId, statusTypeId: number) => store._api.setStatus(id, statusTypeId),
    }
  }),
)
