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
import { normalizeTransportError } from '@org/transport-http'
import { Subscription, forkJoin } from 'rxjs'
import { SchedulingApi } from './scheduling-api'
import { Shift, ShiftGroup } from './scheduling.models'

export const SchedulingStore = signalStore(
  withState({
    _companyId: null as number | null,
    _sessionVersion: null as number | null,
    _groups: [] as readonly ShiftGroup[],
    _shifts: [] as readonly Shift[],
    _loading: false,
    _error: null as string | null,
  }),
  withProps(() => ({ _api: inject(SchedulingApi), _session: inject(SessionStore) })),
  withComputed(store => {
    const scoped = computed(() =>
      Boolean(
        store._session.user() &&
        store._companyId() !== null &&
        store._companyId() === store._api.companyId() &&
        store._sessionVersion() === store._session.version(),
      ),
    )
    return {
      groups: computed(() => (scoped() ? store._groups() : [])),
      shifts: computed(() => (scoped() ? store._shifts() : [])),
      loading: computed(() => scoped() && store._loading()),
      error: computed(() => (scoped() ? store._error() : null)),
    }
  }),
  withMethods(store => {
    let read: Subscription | undefined
    let epoch = 0
    let lastCompany = store._api.companyId()
    const clear = () => {
      epoch++
      read?.unsubscribe()
      read = undefined
      lastCompany = store._api.companyId()
      patchState(store, {
        _companyId: null,
        _sessionVersion: null,
        _groups: [],
        _shifts: [],
        _loading: false,
        _error: null,
      })
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
      load() {
        const companyId = store._api.companyId()
        const user = store._session.user()
        if (companyId === null || !user) {
          clear()
          return
        }
        if (companyId !== lastCompany) clear()
        lastCompany = companyId
        const sessionVersion = store._session.version()
        const current = ++epoch
        read?.unsubscribe()
        patchState(store, {
          _companyId: companyId,
          _sessionVersion: sessionVersion,
          _groups: [],
          _shifts: [],
          _loading: true,
          _error: null,
        })
        const matches = () =>
          current === epoch &&
          companyId === store._api.companyId() &&
          sessionVersion === store._session.version() &&
          Boolean(store._session.user())
        read = forkJoin({
          groups: store._api.listGroups(),
          shifts: store._api.listShifts(),
        }).subscribe({
          next: data => {
            if (!matches()) return
            const groupIds = new Set(data.groups.map(group => group.id))
            if (data.shifts.some(shift => !groupIds.has(shift.shiftGroupId))) {
              patchState(store, {
                _loading: false,
                _error: 'Shift records contain a group outside the selected company.',
              })
              return
            }
            patchState(store, {
              _groups: data.groups,
              _shifts: data.shifts,
              _loading: false,
            })
          },
          error: error => {
            if (!matches()) return
            patchState(store, { _loading: false, _error: normalizeTransportError(error).message })
          },
          complete: () => {
            if (matches()) patchState(store, { _loading: false })
          },
        })
      },
    }
  }),
)
