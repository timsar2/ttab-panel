import {
  DestroyRef,
  EnvironmentInjector,
  Injectable,
  InjectionToken,
  Signal,
  createEnvironmentInjector,
  inject,
  makeEnvironmentProviders,
} from '@angular/core'
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { SessionStore } from '@org/auth-data-access'
import {
  TransportError,
  TransportHttp,
  normalizeTransportError,
  provideTransportHttp,
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
import { RoutesStore } from './routes.store'
import {
  DirectionRoute,
  DirectionRouteDraft,
  RouteId,
  RouteStation,
  decodeRoute,
  decodeStation,
  routeId,
  routeWrite,
} from './route.models'

export interface RouteAccessRequest {
  readonly action: 'search' | 'detail' | 'stations' | 'create' | 'update'
  readonly companyId: number
  readonly id?: RouteId
}
export type RouteAuthorize = (request: RouteAccessRequest) => Observable<boolean>

export interface RoutesDataConfig {
  readonly apiUrl: string
  readonly endpoints: {
    readonly routes: string
    readonly search: string
    readonly stations: string
    readonly save: string
  }
  readonly company: () => Signal<number | null>
  /** Client preflight only; the backend must independently authorize company and Route ownership. */
  readonly access: () => RouteAuthorize
}

const CONFIG = new InjectionToken<RoutesDataConfig>('ROUTES_DATA_CONFIG')
const COMPANY = new InjectionToken<Signal<number | null>>('ROUTES_COMPANY')
const ACCESS = new InjectionToken<RouteAuthorize>('ROUTES_ACCESS')
const HTTP = new InjectionToken<TransportHttp>('ROUTES_HTTP')
export const ROUTES_ACCESS_DENIED = 'routes-access-denied'

export function provideRoutesData(config: RoutesDataConfig) {
  const paths = [
    config.endpoints?.routes,
    config.endpoints?.search,
    config.endpoints?.stations,
    config.endpoints?.save,
  ]
  if (
    typeof config.company !== 'function' ||
    typeof config.access !== 'function' ||
    !paths.every(
      path => typeof path === 'string' && /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path),
    )
  ) {
    throw new Error('Configure explicit Route/station endpoints, company scope and access.')
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
    RoutesApi,
    RoutesStore,
  ])
}

function denied() {
  return new TransportError(
    'business',
    0,
    'This Route operation has no approved company access.',
    {},
    ROUTES_ACCESS_DENIED,
  )
}

function responseRouteId(value: unknown): RouteId | null {
  if (value === null) return null
  const row = transportRecord(value)
  return row['id'] == null ? null : routeId(row['id'])
}

@Injectable()
export class RoutesApi {
  readonly companyId = inject(COMPANY)
  private readonly access = inject(ACCESS)
  private readonly config = inject(CONFIG)
  private readonly http = inject(HTTP)
  private readonly session = inject(SessionStore)
  private readonly destroyRef = inject(DestroyRef)
  private readonly scopeChanges = toObservable(this.companyId)

  list(): Observable<readonly DirectionRoute[]> {
    return this.run('search', undefined, companyId =>
      this.http.request(
        'POST',
        this.config.endpoints.search,
        value =>
          unwrapTransport(value, result => {
            if (!Array.isArray(result))
              throw new TransportError('contract', 0, 'The server returned an invalid Route list.')
            const routes = result.map(decodeRoute)
            if (new Set(routes.map(route => route.id)).size !== routes.length)
              throw new TransportError('contract', 0, 'The server returned duplicate Route IDs.')
            return routes
          }),
        { companyId },
        { apiUrl: this.config.apiUrl },
      ),
    )
  }

  detail(id: RouteId): Observable<DirectionRoute | null> {
    return this.run('detail', id, () =>
      this.http
        .request(
          'GET',
          `${this.config.endpoints.routes}/${id}`,
          value => unwrapTransport(value, result => (result === null ? null : decodeRoute(result))),
          undefined,
          { apiUrl: this.config.apiUrl },
        )
        .pipe(
          map(route => {
            if (route && route.id !== id)
              throw new TransportError(
                'contract',
                0,
                'The requested Route does not match the response.',
              )
            return route
          }),
        ),
    )
  }

  stations(directionId: RouteId): Observable<readonly RouteStation[]> {
    return this.run('stations', directionId, companyId =>
      this.http.request(
        'POST',
        this.config.endpoints.stations,
        value =>
          unwrapTransport(value, result => {
            if (!Array.isArray(result))
              throw new TransportError('contract', 0, 'The server returned invalid Route stations.')
            const stations = result.map(decodeStation)
            if (stations.some(station => station.directionId !== directionId))
              throw new TransportError(
                'contract',
                0,
                'The server returned a station from a different Route.',
              )
            if (new Set(stations.map(station => station.id)).size !== stations.length)
              throw new TransportError('contract', 0, 'The server returned duplicate Station IDs.')
            return [...stations].sort((left, right) => left.orderNo - right.orderNo)
          }),
        { companyId, directionId, name: '' },
        { apiUrl: this.config.apiUrl },
      ),
    )
  }

  save(id: RouteId | null, draft: DirectionRouteDraft): Observable<RouteId | null> {
    return defer(() => {
      const body = routeWrite({ ...draft, ...(id === null ? {} : { id }) })
      const action = id === null ? 'create' : 'update'
      return this.run(action, id ?? undefined, () =>
        this.http.request(
          'POST',
          this.config.endpoints.save,
          value => unwrapTransport(value, responseRouteId),
          body,
          { apiUrl: this.config.apiUrl },
        ),
      )
    })
  }

  private run<T>(
    action: RouteAccessRequest['action'],
    target: RouteId | undefined,
    operation: (companyId: number) => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const companyId = this.companyId()
      if (
        !this.session.user() ||
        companyId === null ||
        !Number.isSafeInteger(companyId) ||
        companyId < 1
      )
        throw denied()
      const version = this.session.version()
      const id = target === undefined ? undefined : routeId(target)
      const matches = () =>
        this.companyId() === companyId &&
        this.session.version() === version &&
        !!this.session.user()
      const decision = this.access({ action, companyId, ...(id === undefined ? {} : { id }) })
      if (!isObservable(decision))
        throw new TransportError('contract', 0, 'Route access must return an observable decision.')
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
