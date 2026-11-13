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
import { ROUTES_ACCESS_DENIED, RoutesApi } from './routes-api'
import { DirectionRoute, DirectionRouteDraft, RouteId, RouteStation } from './route.models'

export type RouteDetailStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'denied' | 'error'
export type RouteMapStatus = RouteDetailStatus
export type RouteSaveOutcome = 'none' | 'confirmed' | 'unconfirmed'

/** Route-scoped source-of-truth state; editors own Signal Forms drafts. */
export const RoutesStore = signalStore(
  withState({
    _company: null as number | null,
    _version: null as number | null,
    _routes: null as readonly DirectionRoute[] | null,
    _listLoading: false,
    _listError: null as TransportError | null,
    _routeId: null as RouteId | null,
    _route: null as DirectionRoute | null,
    _detailStatus: 'idle' as RouteDetailStatus,
    _detailError: null as TransportError | null,
    _stationRouteId: null as RouteId | null,
    _stations: null as readonly RouteStation[] | null,
    _mapStatus: 'idle' as RouteMapStatus,
    _mapError: null as TransportError | null,
    _saving: false,
    _saveError: null as TransportError | null,
    _saveOutcome: 'none' as RouteSaveOutcome,
    _savedId: null as RouteId | null,
  }),
  withProps(() => ({ _api: inject(RoutesApi), _session: inject(SessionStore) })),
  withComputed(store => {
    const scoped = computed(
      () =>
        !!store._session.user() &&
        store._company() !== null &&
        store._company() === store._api.companyId() &&
        store._version() === store._session.version(),
    )
    return {
      routes: computed(() => (scoped() ? store._routes() : null)),
      listLoading: computed(() => scoped() && store._listLoading()),
      listError: computed(() => (scoped() ? store._listError() : null)),
      route: computed(() => (scoped() ? store._route() : null)),
      detailStatus: computed(() => (scoped() ? store._detailStatus() : 'idle')),
      detailError: computed(() => (scoped() ? store._detailError() : null)),
      stations: computed(() => (scoped() ? store._stations() : null)),
      mapStatus: computed(() => (scoped() ? store._mapStatus() : 'idle')),
      mapError: computed(() => (scoped() ? store._mapError() : null)),
      saving: computed(() => scoped() && store._saving()),
      saveError: computed(() => (scoped() ? store._saveError() : null)),
      saveOutcome: computed(() => (scoped() ? store._saveOutcome() : 'none')),
      savedId: computed(() => (scoped() ? store._savedId() : null)),
    }
  }),
  withMethods(store => {
    let routesRequest: Subscription | undefined
    let detailRequest: Subscription | undefined
    let stationsRequest: Subscription | undefined
    let saveRequest: Subscription | undefined
    let epoch = 0
    let routesEpoch = 0
    let detailEpoch = 0
    let stationsEpoch = 0
    let lastCompany = store._api.companyId()
    let lastVersion = store._session.version()

    const clearDetail = () => {
      detailEpoch++
      detailRequest?.unsubscribe()
      patchState(store, { _routeId: null, _route: null, _detailStatus: 'idle', _detailError: null })
    }
    const clearStations = () => {
      stationsEpoch++
      stationsRequest?.unsubscribe()
      patchState(store, {
        _stationRouteId: null,
        _stations: null,
        _mapStatus: 'idle',
        _mapError: null,
      })
    }
    const clear = () => {
      epoch++
      routesEpoch++
      routesRequest?.unsubscribe()
      saveRequest?.unsubscribe()
      clearDetail()
      clearStations()
      lastCompany = store._api.companyId()
      lastVersion = store._session.version()
      patchState(store, {
        _company: null,
        _version: null,
        _routes: null,
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

    return {
      clear,
      clearDetail,
      loadList() {
        const matches = beginScope()
        const current = ++routesEpoch
        routesRequest?.unsubscribe()
        patchState(store, { _routes: null, _listLoading: true, _listError: null })
        routesRequest = store._api.list().subscribe({
          next: routes => {
            if (matches() && current === routesEpoch)
              patchState(store, { _routes: routes, _listLoading: false })
          },
          error: error => {
            if (current !== routesEpoch) return
            if (!matches()) return clear()
            patchState(store, { _listLoading: false, _listError: normalizeTransportError(error) })
          },
          complete: () => {
            if (matches() && current === routesEpoch) patchState(store, { _listLoading: false })
          },
        })
      },
      loadDetail(id: RouteId) {
        const matches = beginScope()
        clearDetail()
        const current = detailEpoch
        patchState(store, { _routeId: id, _detailStatus: 'loading' })
        detailRequest = store._api.detail(id).subscribe({
          next: route => {
            if (matches() && current === detailEpoch)
              patchState(store, { _route: route, _detailStatus: route ? 'ready' : 'missing' })
          },
          error: error => {
            if (current !== detailEpoch) return
            if (!matches()) return clear()
            const normalized = normalizeTransportError(error)
            const status: RouteDetailStatus =
              normalized.status === 404
                ? 'missing'
                : normalized.status === 401 ||
                    normalized.status === 403 ||
                    normalized.code === ROUTES_ACCESS_DENIED
                  ? 'denied'
                  : 'error'
            patchState(store, { _route: null, _detailStatus: status, _detailError: normalized })
          },
          complete: () => {
            if (matches() && current === detailEpoch && store._detailStatus() === 'loading')
              clearDetail()
          },
        })
      },
      loadStations(directionId: RouteId) {
        const matches = beginScope()
        clearStations()
        const current = stationsEpoch
        patchState(store, { _stationRouteId: directionId, _mapStatus: 'loading' })
        stationsRequest = store._api.stations(directionId).subscribe({
          next: stations => {
            if (matches() && current === stationsEpoch)
              patchState(store, { _stations: stations, _mapStatus: 'ready' })
          },
          error: error => {
            if (current !== stationsEpoch) return
            if (!matches()) return clear()
            const normalized = normalizeTransportError(error)
            const status: RouteMapStatus =
              normalized.status === 401 ||
              normalized.status === 403 ||
              normalized.code === ROUTES_ACCESS_DENIED
                ? 'denied'
                : 'error'
            patchState(store, { _stations: null, _mapStatus: status, _mapError: normalized })
          },
          complete: () => {
            if (matches() && current === stationsEpoch && store._mapStatus() === 'loading')
              patchState(store, { _stations: [], _mapStatus: 'ready' })
          },
        })
      },
      save(id: RouteId | null, draft: DirectionRouteDraft): boolean {
        const matches = beginScope()
        if (store._saving()) return false
        patchState(store, { _saving: true, _saveError: null, _saveOutcome: 'none', _savedId: null })
        saveRequest = store._api.save(id, draft).subscribe({
          next: savedId => {
            if (!matches()) return
            routesEpoch++
            routesRequest?.unsubscribe()
            clearDetail()
            const confirmed = savedId !== null && (id === null || savedId === id)
            patchState(store, {
              _routes: null,
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
