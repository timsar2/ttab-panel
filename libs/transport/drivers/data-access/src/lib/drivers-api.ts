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
  unwrapTransport,
} from '@org/transport-http'
import { PeopleApi } from '@org/transport-people-data-access'
import {
  Observable,
  catchError,
  defaultIfEmpty,
  defer,
  filter,
  forkJoin,
  isObservable,
  map,
  switchMap,
  take,
  takeUntil,
  throwError,
} from 'rxjs'
import {
  DRIVER_DOCUMENT_FIELDS,
  DriverCompanyId,
  DriverDetail,
  DriverDraft,
  DriverId,
  DriverRecord,
  DriverSearch,
  decodeDriverDetail,
  decodeDriverRow,
  driverCompanyId,
  driverId,
  driverWrite,
} from './driver.models'

export interface DriversAccessRequest {
  readonly action: 'search' | 'detail' | 'upsert'
  readonly companyId: DriverCompanyId
  readonly id?: DriverId
}
export type DriversAuthorize = (request: DriversAccessRequest) => Observable<boolean>
export interface DriversDataConfig {
  readonly apiUrl: string
  readonly endpoints: {
    readonly collection: string
    readonly search: string
    readonly save: string
  }
  readonly company: () => Signal<DriverCompanyId | null>
  /** Must verify entity/company access. Upsert also grants the backend Driver Identity role. */
  readonly access: () => DriversAuthorize
}
const CONFIG = new InjectionToken<DriversDataConfig>('DRIVERS_DATA_CONFIG')
const COMPANY = new InjectionToken<Signal<DriverCompanyId | null>>('DRIVERS_COMPANY')
const ACCESS = new InjectionToken<DriversAuthorize>('DRIVERS_ACCESS')
const HTTP = new InjectionToken<TransportHttp>('DRIVERS_HTTP')
export const DRIVERS_ACCESS_DENIED = 'drivers-access-denied'

export function provideDriversData(config: DriversDataConfig) {
  if (
    typeof config.company !== 'function' ||
    typeof config.access !== 'function' ||
    !config.endpoints ||
    ![config.endpoints.collection, config.endpoints.search, config.endpoints.save].every(
      path => typeof path === 'string' && /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path),
    )
  )
    throw new Error('Configure explicit driver endpoints, company scope and approved access.')
  const httpProviders = provideTransportHttp({ apiUrl: config.apiUrl })
  return makeEnvironmentProviders([
    {
      provide: HTTP,
      useFactory: () => {
        // Isolate endpoint configuration, not authentication: inherit the existing scoped HttpClient.
        const child = createEnvironmentInjector([httpProviders], inject(EnvironmentInjector))
        inject(DestroyRef).onDestroy(() => child.destroy())
        return child.get(TransportHttp)
      },
    },
    { provide: CONFIG, useValue: { ...config, endpoints: { ...config.endpoints } } },
    { provide: COMPANY, useFactory: config.company },
    { provide: ACCESS, useFactory: config.access },
    DriversApi,
  ])
}
function denied() {
  return new TransportError(
    'business',
    0,
    'This driver operation has no approved access.',
    {},
    DRIVERS_ACCESS_DENIED,
  )
}

@Injectable()
export class DriversApi {
  readonly companyId = inject(COMPANY)
  private readonly access = inject(ACCESS)
  private readonly config = inject(CONFIG)
  private readonly http = inject(HTTP)
  private readonly people = inject(PeopleApi)
  private readonly session = inject(SessionStore)
  private readonly destroyRef = inject(DestroyRef)
  private readonly scopeChanges = toObservable(
    computed(() => [this.companyId(), this.people.companyId()]),
  )

  search(query: DriverSearch) {
    const snapshot = { ...query }
    return this.run('search', undefined, companyId => {
      if (typeof snapshot.fullName !== 'string' || typeof snapshot.nationalId !== 'string')
        throw new TransportError('validation', 0, 'Invalid driver search filters.')
      const paging = transportPageRequest(snapshot.pageIndex, snapshot.pageSize)
      transportInteger(paging.pageNumber, 1, 2147483647)
      transportInteger(paging.pageSize, 1, 2147483647)
      return this.http
        .request(
          'POST',
          this.config.endpoints.search,
          value => unwrapTransport(value, result => decodeTransportPage(result, decodeDriverRow)),
          {
            companyId,
            fullName: snapshot.fullName.trim() || null,
            nationalId: snapshot.nationalId.trim() || null,
            ...paging,
          },
          { apiUrl: this.config.apiUrl },
        )
        .pipe(
          map(page => {
            if (
              page.pagination.currentPage !== paging.pageNumber ||
              page.pagination.pageSize !== paging.pageSize ||
              new Set(page.items.map(row => row.id)).size !== page.items.length ||
              page.items.length > paging.pageSize
            )
              throw new TransportError(
                'contract',
                0,
                'The server returned an inconsistent driver page.',
              )
            return page
          }),
        )
    })
  }

  detail(id: DriverId): Observable<DriverRecord | null> {
    return this.run('detail', id, () =>
      forkJoin({
        driver: this.http.request(
          'GET',
          `${this.config.endpoints.collection}/${id}`,
          value => unwrapTransport(value, result => this.record(result, id)),
          undefined,
          { apiUrl: this.config.apiUrl },
        ),
        person: this.people.detail(id),
      }).pipe(
        map(({ driver, person }) => {
          if (driver === null || person === null) return null
          if (person.id !== id)
            throw new TransportError(
              'contract',
              0,
              'The Person identity does not match the driver.',
            )
          return { driver, person }
        }),
      ),
    )
  }

  /** Requires a persisted Person detail before posting. Never auto-retries an ambiguous mutation. */
  upsert(id: DriverId, draft: DriverDraft): Observable<DriverRecord | null> {
    const snapshot: DriverDraft = { ...draft }
    for (const field of DRIVER_DOCUMENT_FIELDS) {
      if (draft[field] !== undefined) Object.assign(snapshot, { [field]: { ...draft[field] } })
    }
    return this.run('upsert', id, company => {
      const body = driverWrite(company, id, snapshot)
      return this.people.detail(id).pipe(
        switchMap(person => {
          if (
            this.companyId() !== company ||
            this.people.companyId() !== company ||
            !this.session.user()
          )
            throw denied()
          if (person === null || person.id !== id)
            throw new TransportError(
              'validation',
              0,
              'Select a persisted Person before saving driver information.',
            )
          if (!person.nationalId?.trim())
            throw new TransportError(
              'validation',
              0,
              'The selected Person needs a national ID before driver registration.',
            )
          return this.http
            .request(
              'POST',
              this.config.endpoints.save,
              value => unwrapTransport(value, result => this.record(result, id)),
              body,
              { apiUrl: this.config.apiUrl },
            )
            .pipe(map(driver => (driver === null ? null : { driver, person })))
        }),
      )
    })
  }

  private record(value: unknown, id: DriverId): DriverDetail | null {
    if (value === null) return null
    const record = decodeDriverDetail(value)
    if (record.id !== id)
      throw new TransportError(
        'contract',
        0,
        'The driver response does not match the requested Person identity.',
      )
    return record
  }

  private run<T>(
    action: DriversAccessRequest['action'],
    target: DriverId | undefined,
    operation: (company: DriverCompanyId) => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const current = this.companyId()
      if (!this.session.user() || current === null) throw denied()
      const companyId = driverCompanyId(current)
      const id = target === undefined ? undefined : driverId(target)
      const version = this.session.version()
      const matches = () =>
        this.companyId() === companyId &&
        this.people.companyId() === companyId &&
        this.session.version() === version &&
        !!this.session.user()
      if (!matches()) throw denied()
      const decision = this.access({ action, companyId, ...(id === undefined ? {} : { id }) })
      if (!isObservable(decision))
        throw new TransportError('contract', 0, 'Driver access must return an observable decision.')
      return decision.pipe(
        take(1),
        defaultIfEmpty(false),
        switchMap(allowed => {
          if (allowed !== true || !matches()) throw denied()
          return operation(companyId)
        }),
        takeUntil(this.scopeChanges.pipe(filter(() => !matches()))),
        this.session.untilChanged(version),
        takeUntilDestroyed(this.destroyRef),
        map(value => {
          if (!matches()) throw denied()
          return value
        }),
        catchError(error =>
          throwError(() => (matches() ? normalizeTransportError(error) : denied())),
        ),
      )
    }).pipe(catchError(error => throwError(() => normalizeTransportError(error))))
  }
}
