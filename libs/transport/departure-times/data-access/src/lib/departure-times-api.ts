import {
  DestroyRef,
  Injectable,
  InjectionToken,
  Signal,
  computed,
  inject,
  makeEnvironmentProviders,
} from '@angular/core'
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop'
import { SessionStore } from '@org/auth-data-access'
import {
  TransportError,
  TransportHttp,
  provideTransportHttp,
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
import {
  DepartureCompanyId,
  DepartureTimeDraft,
  DepartureTimeId,
  DepartureTimeListRequest,
  DepartureTimeSearch,
  decodeDepartureTime,
  decodeDepartureTimeList,
  departureCompanyId,
  departureTimeId,
  departureTimeWrite,
  departureTimeError,
} from './departure-time.models'

export interface DepartureTimeAccessRequest {
  readonly action: 'list' | 'detail' | 'create' | 'update'
  readonly companyId: DepartureCompanyId
  readonly id?: DepartureTimeId
}
export type DepartureTimeAuthorize = (request: DepartureTimeAccessRequest) => Observable<boolean>
export interface DepartureTimesDataConfig {
  readonly apiUrl: string
  readonly endpoints: { readonly collection: string; readonly save: string }
  /** Factories run in this injector. Null scope means unresolved or denied access. */
  readonly company: () => Signal<DepartureCompanyId | null>
  /** Must verify company/entity access, not infer it from company selection or menu visibility. */
  readonly access: () => DepartureTimeAuthorize
}

const CONFIG = new InjectionToken<DepartureTimesDataConfig['endpoints']>('DEPARTURE_TIME_ENDPOINTS')
const COMPANY = new InjectionToken<Signal<DepartureCompanyId | null>>('DEPARTURE_TIME_COMPANY')
const ACCESS = new InjectionToken<DepartureTimeAuthorize>('DEPARTURE_TIME_ACCESS')
export const DEPARTURE_TIME_ACCESS_DENIED = 'departure-time-access-denied'

export function provideDepartureTimesData(config: DepartureTimesDataConfig) {
  if (
    typeof config.company !== 'function' ||
    typeof config.access !== 'function' ||
    !config.endpoints ||
    ![config.endpoints.collection, config.endpoints.save].every(
      path => typeof path === 'string' && /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path),
    )
  ) {
    throw new Error(
      'Configure explicit departure-time endpoints, company scope, and access policy.',
    )
  }
  return makeEnvironmentProviders([
    provideTransportHttp({ apiUrl: config.apiUrl }),
    { provide: CONFIG, useValue: { ...config.endpoints } },
    { provide: COMPANY, useFactory: config.company },
    { provide: ACCESS, useFactory: config.access },
    DepartureTimesApi,
  ])
}

function denied() {
  return new TransportError(
    'business',
    0,
    'This departure-time operation has no approved access.',
    {},
    DEPARTURE_TIME_ACCESS_DENIED,
  )
}

@Injectable()
export class DepartureTimesApi {
  readonly companyId = inject(COMPANY)
  private readonly access = inject(ACCESS)
  private readonly paths = inject(CONFIG)
  private readonly http = inject(TransportHttp)
  private readonly session = inject(SessionStore)
  private readonly destroyRef = inject(DestroyRef)
  private readonly scopeChanges = toObservable(computed(() => this.companyId()))

  list(search: DepartureTimeSearch = { name: '' }) {
    const query = { ...search }
    return this.run('list', undefined, companyId => {
      if (typeof query.name !== 'string')
        throw new TransportError('validation', 0, 'Invalid name filter.')
      const body: DepartureTimeListRequest = { companyId, name: query.name.trim() || null }
      return this.http.request(
        'POST',
        this.paths.collection,
        value => unwrapTransport(value, result => decodeDepartureTimeList(result, companyId)),
        body,
      )
    })
  }

  detail(id: DepartureTimeId) {
    return this.run('detail', id, company =>
      this.http.request('GET', `${this.paths.collection}/${id}`, value =>
        unwrapTransport(value, result => this.record(result, company, id)),
      ),
    )
  }

  /** Cancellation suppresses results; it cannot roll back a server-accepted mutation. Never auto-retry. */
  create(draft: DepartureTimeDraft) {
    return this.save({ ...draft })
  }
  update(id: DepartureTimeId, draft: DepartureTimeDraft) {
    return this.save({ ...draft }, id)
  }

  private save(draft: DepartureTimeDraft, id?: DepartureTimeId) {
    return this.run(id === undefined ? 'create' : 'update', id, company =>
      this.http.request(
        'POST',
        this.paths.save,
        value => unwrapTransport(value, result => this.record(result, company, id)),
        departureTimeWrite(company, draft, id),
      ),
    )
  }

  private record(value: unknown, company: DepartureCompanyId, id?: DepartureTimeId) {
    if (value === null) return null
    const record = decodeDepartureTime(value)
    if (record.companyId !== company || (id !== undefined && record.id !== id)) {
      throw new TransportError(
        'contract',
        0,
        'The response does not match the requested departure-time scope.',
      )
    }
    return record
  }

  private run<T>(
    action: DepartureTimeAccessRequest['action'],
    target: DepartureTimeId | undefined,
    operation: (company: DepartureCompanyId) => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const current = this.companyId()
      if (!this.session.user() || current === null) throw denied()
      const companyId = departureCompanyId(current)
      const id = target === undefined ? undefined : departureTimeId(target)
      const version = this.session.version()
      const matches = () =>
        this.companyId() === companyId &&
        this.session.version() === version &&
        !!this.session.user()
      const decision = this.access({ action, companyId, ...(id === undefined ? {} : { id }) })
      if (!isObservable(decision))
        throw new TransportError('contract', 0, 'Access must return an observable decision.')
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
        catchError(error => throwError(() => (matches() ? departureTimeError(error) : denied()))),
      )
    }).pipe(catchError(error => throwError(() => departureTimeError(error))))
  }
}
