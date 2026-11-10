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
  normalizeTransportError,
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
  SupportCompanyId,
  SupportId,
  SupportSearch,
  decodeSupportDetail,
  decodeSupportPage,
  supportCompanyId,
  supportId,
  supportSearchRequest,
} from './support.models'

export interface SupportAccessRequest {
  readonly action: 'search' | 'detail'
  readonly companyId: SupportCompanyId
  readonly id?: SupportId
}
export type SupportAuthorize = (request: SupportAccessRequest) => Observable<boolean>
export interface SupportDataConfig {
  readonly apiUrl: string
  readonly endpoints: { readonly collection: string; readonly search: string }
  /** Factories execute in the consuming injector; null means unresolved/denied. */
  readonly company: () => Signal<SupportCompanyId | null>
  /** Approved company/entity access. Selection and authentication alone are not authorization. */
  readonly access: () => SupportAuthorize
}
const ENDPOINTS = new InjectionToken<SupportDataConfig['endpoints']>('SUPPORT_ENDPOINTS')
const COMPANY = new InjectionToken<Signal<SupportCompanyId | null>>('SUPPORT_COMPANY')
const ACCESS = new InjectionToken<SupportAuthorize>('SUPPORT_ACCESS')
export const SUPPORT_ACCESS_DENIED = 'support-access-denied'

export function provideSupportData(config: SupportDataConfig) {
  if (
    typeof config.company !== 'function' ||
    typeof config.access !== 'function' ||
    !config.endpoints ||
    ![config.endpoints.collection, config.endpoints.search].every(
      path => typeof path === 'string' && /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path),
    )
  )
    throw new Error('Configure explicit support endpoints, company scope and access policy.')
  return makeEnvironmentProviders([
    provideTransportHttp({ apiUrl: config.apiUrl }),
    { provide: ENDPOINTS, useValue: { ...config.endpoints } },
    { provide: COMPANY, useFactory: config.company },
    { provide: ACCESS, useFactory: config.access },
    SupportApi,
  ])
}
function denied() {
  return new TransportError(
    'business',
    0,
    'This support read has no approved access.',
    {},
    SUPPORT_ACCESS_DENIED,
  )
}

/** Read-only API using the consumer's existing scoped authenticated HttpClient. */
@Injectable()
export class SupportApi {
  readonly companyId = inject(COMPANY)
  private readonly access = inject(ACCESS)
  private readonly endpoints = inject(ENDPOINTS)
  private readonly http = inject(TransportHttp)
  private readonly session = inject(SessionStore)
  private readonly destroyRef = inject(DestroyRef)
  private readonly scopeChanges = toObservable(computed(() => this.companyId()))

  search(query: SupportSearch) {
    const snapshot = { ...query }
    return this.run('search', undefined, company => {
      const request = supportSearchRequest(company, snapshot)
      return this.http.request(
        'POST',
        this.endpoints.search,
        value => unwrapTransport(value, result => decodeSupportPage(result, request)),
        request,
      )
    })
  }
  detail(id: SupportId) {
    return this.run('detail', id, company =>
      this.http.request('GET', `${this.endpoints.collection}/${id}`, value =>
        unwrapTransport(value, result => {
          if (result === null) return null
          const detail = decodeSupportDetail(result)
          if (detail.id !== id || detail.companyId !== company)
            throw new TransportError(
              'contract',
              0,
              'The support detail does not match the requested ID and company.',
            )
          return detail
        }),
      ),
    )
  }
  private run<T>(
    action: SupportAccessRequest['action'],
    target: SupportId | undefined,
    operation: (company: SupportCompanyId) => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const current = this.companyId()
      if (current === null || !this.session.user()) throw denied()
      const companyId = supportCompanyId(current)
      const id = target === undefined ? undefined : supportId(target)
      const version = this.session.version()
      const matches = () =>
        this.companyId() === companyId &&
        this.session.version() === version &&
        !!this.session.user()
      const decision = this.access({ action, companyId, ...(id === undefined ? {} : { id }) })
      if (!isObservable(decision))
        throw new TransportError(
          'contract',
          0,
          'Support access must return an observable decision.',
        )
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
