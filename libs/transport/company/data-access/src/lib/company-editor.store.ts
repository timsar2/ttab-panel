import { DestroyRef, inject } from '@angular/core'
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals'
import { SessionStore } from '@org/auth-data-access'
import { TransportError, normalizeTransportError } from '@org/transport-http'
import { Subscription, forkJoin, map, of, switchMap } from 'rxjs'
import { CompanyApi } from './company-api'
import { CompanyLookup, CompanyLookupsApi } from './company-lookups-api'
import { CompanyDetail } from './company.models'
import { CompanyDraft, CompanyLogoUpload, companyWrite } from './company-write.models'

const empty: readonly CompanyLookup[] = []

export const CompanyEditorStore = signalStore(
  withState({
    original: null as CompanyDetail | null,
    status: 'idle' as 'idle' | 'loading' | 'ready' | 'missing' | 'error',
    types: empty,
    provinces: empty,
    cities: empty,
    cityProvinceId: '',
    citiesLoading: false,
    citiesError: null as TransportError | null,
    error: null as TransportError | null,
    saving: false,
    saved: false,
    revision: 0,
  }),
  withMethods(store => {
    const api = inject(CompanyApi)
    const lookups = inject(CompanyLookupsApi)
    const session = inject(SessionStore)
    let read: Subscription | undefined
    let cities: Subscription | undefined
    let write: Subscription | undefined
    let epoch = 0
    let cityEpoch = 0
    let revision = 0
    const clear = () => {
      epoch++
      cityEpoch++
      read?.unsubscribe()
      cities?.unsubscribe()
      write?.unsubscribe()
      patchState(store, {
        original: null,
        status: 'idle',
        types: empty,
        provinces: empty,
        cities: empty,
        cityProvinceId: '',
        citiesLoading: false,
        citiesError: null,
        error: null,
        saving: false,
        saved: false,
        revision: ++revision,
      })
    }
    const changes = session.changes$.subscribe(clear)
    inject(DestroyRef).onDestroy(() => {
      clear()
      changes.unsubscribe()
    })
    return {
      clear,
      load(id: number | null) {
        clear()
        if (!session.user()) return
        const current = epoch
        patchState(store, { status: 'loading' })
        try {
          read = forkJoin({
            types: lookups.types(),
            provinces: lookups.provinces(),
            original: id === null ? of(null) : api.detail(id),
          })
            .pipe(
              switchMap(result =>
                result.original?.provinceId
                  ? lookups
                      .cities(String(result.original.provinceId))
                      .pipe(map(cities => ({ ...result, cities })))
                  : of({ ...result, cities: empty }),
              ),
            )
            .subscribe({
              next: result => {
                if (current === epoch)
                  patchState(store, {
                    ...result,
                    cityProvinceId: result.original?.provinceId?.toString() ?? '',
                    status: id !== null && result.original === null ? 'missing' : 'ready',
                    revision: ++revision,
                  })
              },
              error: error => {
                if (current === epoch)
                  patchState(store, { status: 'error', error: normalizeTransportError(error) })
              },
            })
        } catch (error) {
          patchState(store, { status: 'error', error: normalizeTransportError(error) })
        }
      },
      loadCities(provinceId: string) {
        cities?.unsubscribe()
        const current = ++cityEpoch
        patchState(store, {
          cities: empty,
          cityProvinceId: provinceId,
          citiesLoading: !!provinceId,
          citiesError: null,
        })
        if (!provinceId) return
        try {
          cities = lookups.cities(provinceId).subscribe({
            next: list => {
              if (current === cityEpoch) patchState(store, { cities: list, citiesLoading: false })
            },
            error: error => {
              if (current === cityEpoch)
                patchState(store, {
                  citiesLoading: false,
                  citiesError: normalizeTransportError(error),
                })
            },
          })
        } catch (error) {
          patchState(store, { citiesLoading: false, citiesError: normalizeTransportError(error) })
        }
      },
      save(draft: CompanyDraft, logo: CompanyLogoUpload | null = null) {
        if (store.saving() || store.status() !== 'ready' || !session.user()) return
        const current = epoch
        try {
          const body = companyWrite(draft, store.original(), logo)
          patchState(store, { saving: true, saved: false, error: null })
          write = api.save(body).subscribe({
            next: original => {
              if (current === epoch)
                patchState(store, { original, saving: false, saved: true, revision: ++revision })
            },
            error: error => {
              if (current === epoch)
                patchState(store, { saving: false, error: normalizeTransportError(error) })
            },
          })
        } catch (error) {
          patchState(store, { saving: false, saved: false, error: normalizeTransportError(error) })
        }
      },
    }
  }),
)
