import {
  DestroyRef,
  EnvironmentInjector,
  Injectable,
  InjectionToken,
  Signal,
  computed,
  createEnvironmentInjector,
  inject,
  makeEnvironmentProviders,
} from '@angular/core'
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop'
import { SessionStore } from '@org/auth-data-access'
import {
  TransportError,
  TransportHttp,
  decodeTransportPage,
  normalizeTransportError,
  provideTransportHttp,
  transportInteger,
  transportPageRequest,
  transportRecord,
  unwrapTransport,
} from '@org/transport-http'
import {
  Observable,
  catchError,
  defaultIfEmpty,
  defer,
  filter,
  isObservable,
  map,
  switchMap,
  take,
  takeUntil,
  throwError,
} from 'rxjs'
import { VehiclesStore } from './vehicles.store'
import {
  CarType,
  CarTypeDraft,
  VehicleCompanyId,
  VehicleDetail,
  VehicleDraft,
  VehicleId,
  VehicleRow,
  VehicleSearch,
  carCompanyId,
  carId,
  carTypeWrite,
  decodeCarType,
  decodeVehicleDetail,
  decodeVehicleRow,
  vehicleWrite,
} from './vehicle.models'

export interface VehicleAccessRequest {
  readonly action:
    'search' | 'detail' | 'list-types' | 'create-type' | 'create' | 'update' | 'delete'
  readonly companyId: VehicleCompanyId
  readonly id?: VehicleId
}
export type VehiclesAuthorize = (request: VehicleAccessRequest) => Observable<boolean>

export interface VehiclesDataConfig {
  readonly apiUrl: string
  readonly endpoints: {
    readonly collection: string
    readonly search: string
    readonly types: string
    readonly save: string
  }
  readonly company: () => Signal<number | null>
  /** Client-side preflight only; the API must independently authorize company/entity/action. */
  readonly access: () => VehiclesAuthorize
}

const CONFIG = new InjectionToken<VehiclesDataConfig>('VEHICLES_DATA_CONFIG')
const COMPANY = new InjectionToken<Signal<number | null>>('VEHICLES_COMPANY')
const ACCESS = new InjectionToken<VehiclesAuthorize>('VEHICLES_ACCESS')
const HTTP = new InjectionToken<TransportHttp>('VEHICLES_HTTP')
export const VEHICLES_ACCESS_DENIED = 'vehicles-access-denied'

export function provideVehiclesData(config: VehiclesDataConfig) {
  const paths = [
    config.endpoints?.collection,
    config.endpoints?.search,
    config.endpoints?.types,
    config.endpoints?.save,
  ]
  if (
    typeof config.company !== 'function' ||
    typeof config.access !== 'function' ||
    !paths.every(
      path => typeof path === 'string' && /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path),
    )
  ) {
    throw new Error('Configure explicit vehicle endpoints, company scope and approved access.')
  }
  const httpProviders = provideTransportHttp({ apiUrl: config.apiUrl })
  return makeEnvironmentProviders([
    {
      provide: HTTP,
      useFactory: () => {
        const child = createEnvironmentInjector([httpProviders], inject(EnvironmentInjector))
        inject(DestroyRef).onDestroy(() => child.destroy())
        return child.get(TransportHttp)
      },
    },
    { provide: CONFIG, useValue: { ...config, endpoints: { ...config.endpoints } } },
    { provide: COMPANY, useFactory: config.company },
    { provide: ACCESS, useFactory: config.access },
    VehiclesApi,
    VehiclesStore,
  ])
}

function accessDenied() {
  return new TransportError(
    'business',
    0,
    'This vehicle operation has no approved access.',
    {},
    VEHICLES_ACCESS_DENIED,
  )
}

function responseId(value: unknown): VehicleId | null {
  if (value === null) return null
  const row = transportRecord(value)
  return row['id'] == null ? null : carId(row['id'])
}

@Injectable()
export class VehiclesApi {
  readonly companyId = inject(COMPANY)
  private readonly access = inject(ACCESS)
  private readonly config = inject(CONFIG)
  private readonly http = inject(HTTP)
  private readonly session = inject(SessionStore)
  private readonly destroyRef = inject(DestroyRef)
  private readonly scopeChanges = toObservable(this.companyId)

  search(query: VehicleSearch) {
    const snapshot = { ...query }
    return this.run('search', undefined, companyId => {
      const paging = transportPageRequest(snapshot.pageIndex, snapshot.pageSize)
      transportInteger(paging.pageNumber, 1)
      return this.http
        .request(
          'POST',
          this.config.endpoints.search,
          value => unwrapTransport(value, result => decodeTransportPage(result, decodeVehicleRow)),
          { companyId, ...paging },
          { apiUrl: this.config.apiUrl },
        )
        .pipe(
          map(page => {
            if (
              page.pagination.currentPage !== paging.pageNumber ||
              page.pagination.pageSize !== paging.pageSize ||
              page.items.length > paging.pageSize ||
              new Set(page.items.map(vehicle => vehicle.id)).size !== page.items.length
            )
              throw new TransportError(
                'contract',
                0,
                'The server returned an inconsistent vehicle page.',
              )
            return page
          }),
        )
    })
  }

  detail(id: VehicleId): Observable<VehicleDetail | null> {
    return this.run('detail', id, () =>
      this.http
        .request(
          'GET',
          `${this.config.endpoints.collection}/${id}`,
          value =>
            unwrapTransport(value, result =>
              result === null ? null : decodeVehicleDetail(result),
            ),
          undefined,
          { apiUrl: this.config.apiUrl },
        )
        .pipe(
          map(detail => {
            if (detail && detail.id !== id)
              throw new TransportError(
                'contract',
                0,
                'The requested vehicle does not match the server response.',
              )
            return detail
          }),
        ),
    )
  }

  types(): Observable<readonly CarType[]> {
    return this.run('list-types', undefined, () =>
      this.http.request(
        'GET',
        this.config.endpoints.types,
        value =>
          unwrapTransport(value, result => {
            if (!Array.isArray(result))
              throw new TransportError('contract', 0, 'The server returned invalid car types.')
            const types = result.map(decodeCarType)
            if (new Set(types.map(type => type.id)).size !== types.length)
              throw new TransportError(
                'contract',
                0,
                'The server returned duplicate car-type identifiers.',
              )
            return types
          }),
        undefined,
        { apiUrl: this.config.apiUrl },
      ),
    )
  }

  save(id: VehicleId | null, draft: VehicleDraft): Observable<VehicleId | null> {
    return defer(() => {
      const body = vehicleWrite(id, draft)
      return this.run(id === null ? 'create' : 'update', id ?? undefined, () =>
        this.http.request(
          'POST',
          this.config.endpoints.save,
          value => unwrapTransport(value, responseId),
          body,
          { apiUrl: this.config.apiUrl },
        ),
      )
    })
  }

  createType(draft: CarTypeDraft): Observable<void> {
    return defer(() => {
      const body = carTypeWrite(draft)
      return this.run('create-type', undefined, () =>
        this.http.request(
          'POST',
          this.config.endpoints.types,
          value => unwrapTransport(value, () => undefined),
          body,
          { apiUrl: this.config.apiUrl },
        ),
      )
    })
  }

  delete(id: VehicleId): Observable<void> {
    return this.run('delete', id, () =>
      this.http.request(
        'DELETE',
        `${this.config.endpoints.collection}/${id}`,
        value => unwrapTransport(value, () => undefined),
        undefined,
        { apiUrl: this.config.apiUrl },
      ),
    )
  }

  private run<T>(
    action: VehicleAccessRequest['action'],
    target: VehicleId | undefined,
    operation: (company: VehicleCompanyId) => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const current = this.companyId()
      if (!this.session.user() || current === null) throw accessDenied()
      const companyId = carCompanyId(current)
      const id = target === undefined ? undefined : carId(target)
      const version = this.session.version()
      const matches = () =>
        this.companyId() === companyId &&
        this.session.version() === version &&
        !!this.session.user()
      if (!matches()) throw accessDenied()
      const decision = this.access({ action, companyId, ...(id === undefined ? {} : { id }) })
      if (!isObservable(decision))
        throw new TransportError(
          'contract',
          0,
          'Vehicle access must return an observable decision.',
        )
      return decision.pipe(
        take(1),
        defaultIfEmpty(false),
        switchMap(allowed => {
          if (allowed !== true || !matches()) throw accessDenied()
          return operation(companyId)
        }),
        takeUntil(this.scopeChanges.pipe(filter(() => !matches()))),
        this.session.untilChanged(version),
        takeUntilDestroyed(this.destroyRef),
        map(value => {
          if (!matches()) throw accessDenied()
          return value
        }),
        catchError(error =>
          throwError(() => (matches() ? normalizeTransportError(error) : accessDenied())),
        ),
      )
    }).pipe(catchError(error => throwError(() => normalizeTransportError(error))))
  }
}
