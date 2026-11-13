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
  TransportPage,
  TransportHttp,
  decodeTransportPage,
  normalizeTransportError,
  provideTransportHttp,
  transportPageRequest,
  transportRecord,
  unwrapTransport,
} from '@org/transport-http'
import { RouteId, routeId } from '@org/transport-routes-data-access'
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
  LineDetail,
  LineDraft,
  LineId,
  LineRow,
  LineSearch,
  lineId,
  lineWrite,
} from './line.models'
import { LinesStore } from './lines.store'

export interface LineAccessRequest {
  readonly action: 'search' | 'detail' | 'create' | 'update'
  readonly companyId: number
  readonly directionId: RouteId
  readonly id?: LineId
}
export type LinesAuthorize = (request: LineAccessRequest) => Observable<boolean>

export interface LinesDataConfig {
  readonly apiUrl: string
  readonly endpoints: {
    readonly collection: string
    readonly search: string
    readonly save: string
  }
  readonly company: () => Signal<number | null>
  readonly directionId: () => Signal<RouteId | null>
  /** Client preflight only; the API must also authorize Company, Direction, Line and action. */
  readonly access: () => LinesAuthorize
}

const CONFIG = new InjectionToken<LinesDataConfig>('LINES_DATA_CONFIG')
const COMPANY = new InjectionToken<Signal<number | null>>('LINES_COMPANY')
const DIRECTION = new InjectionToken<Signal<RouteId | null>>('LINES_DIRECTION')
const ACCESS = new InjectionToken<LinesAuthorize>('LINES_ACCESS')
const HTTP = new InjectionToken<TransportHttp>('LINES_HTTP')
export const LINES_ACCESS_DENIED = 'lines-access-denied'

export function provideLinesData(config: LinesDataConfig) {
  const paths = [config.endpoints?.collection, config.endpoints?.search, config.endpoints?.save]
  if (
    typeof config.company !== 'function' ||
    typeof config.directionId !== 'function' ||
    typeof config.access !== 'function' ||
    !paths.every(
      path => typeof path === 'string' && /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path),
    )
  ) {
    throw new Error('Configure explicit Line endpoints, Company/Direction scope and access.')
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
    { provide: DIRECTION, useFactory: config.directionId },
    { provide: ACCESS, useFactory: config.access },
    LinesApi,
    LinesStore,
  ])
}

function denied() {
  return new TransportError(
    'business',
    0,
    'This Line operation has no approved scope.',
    {},
    LINES_ACCESS_DENIED,
  )
}

function responseLineId(value: unknown): LineId | null {
  if (value === null) return null
  const row = transportRecord(value)
  return row['id'] == null ? null : lineId(row['id'])
}

@Injectable()
export class LinesApi {
  readonly companyId = inject(COMPANY)
  readonly directionId = inject(DIRECTION)
  private readonly config = inject(CONFIG)
  private readonly access = inject(ACCESS)
  private readonly http = inject(HTTP)
  private readonly session = inject(SessionStore)
  private readonly destroyRef = inject(DestroyRef)
  private readonly scopeChanges = toObservable(
    computed(() => `${this.companyId() ?? ''}:${this.directionId() ?? ''}`),
  )

  list(query: LineSearch): Observable<TransportPage<LineRow>> {
    const page = { ...query }
    return this.run('search', undefined, (companyId, directionId) => {
      const paging = transportPageRequest(page.pageIndex, page.pageSize)
      return this.http.request(
        'POST',
        this.config.endpoints.search,
        value =>
          unwrapTransport(value, result => {
            const decoded = decodeTransportPage(result, item => decodeLineRow(item))
            if (
              decoded.items.length > paging.pageSize ||
              decoded.pagination.currentPage !== paging.pageNumber ||
              decoded.items.some(line => line.directionId !== directionId) ||
              new Set(decoded.items.map(line => line.id)).size !== decoded.items.length
            )
              throw new TransportError(
                'contract',
                0,
                'The server returned an inconsistent Line page.',
              )
            return decoded
          }),
        { companyId, directionId, ...paging },
        { apiUrl: this.config.apiUrl },
      )
    })
  }

  detail(id: LineId): Observable<LineDetail | null> {
    return this.run('detail', id, (companyId, directionId) =>
      this.http.request(
        'GET',
        `${this.config.endpoints.collection}/${id}`,
        value =>
          unwrapTransport(value, result => {
            if (result === null) return null
            const detail = decodeLine(result)
            if (detail.id !== id || detail.directionId !== directionId)
              throw new TransportError(
                'contract',
                0,
                'The requested Line does not match its Direction scope.',
              )
            return detail
          }),
        undefined,
        { apiUrl: this.config.apiUrl },
      ),
    )
  }

  save(id: LineId | null, draft: LineDraft): Observable<LineId | null> {
    return defer(() => {
      const companyId = this.companyId()
      const directionId = this.directionId()
      if (companyId === null || directionId === null) throw denied()
      const body = lineWrite(companyId, directionId, draft, id ?? undefined)
      return this.run(
        id === null ? 'create' : 'update',
        id ?? undefined,
        (scopedCompany, scopedDirection) => {
          if (scopedCompany !== companyId || scopedDirection !== directionId) throw denied()
          return this.http.request(
            'POST',
            this.config.endpoints.save,
            value => unwrapTransport(value, responseLineId),
            body,
            { apiUrl: this.config.apiUrl },
          )
        },
      )
    })
  }

  private run<T>(
    action: LineAccessRequest['action'],
    target: LineId | undefined,
    operation: (companyId: number, directionId: RouteId) => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const companyId = this.companyId()
      const directionId = this.directionId()
      if (
        !this.session.user() ||
        companyId === null ||
        !Number.isSafeInteger(companyId) ||
        companyId < 1 ||
        directionId === null
      )
        throw denied()
      const scopedDirection = routeId(directionId)
      const id = target === undefined ? undefined : lineId(target)
      const version = this.session.version()
      const matches = () =>
        this.companyId() === companyId &&
        this.directionId() === scopedDirection &&
        this.session.version() === version &&
        !!this.session.user()
      const decision = this.access({
        action,
        companyId,
        directionId: scopedDirection,
        ...(id === undefined ? {} : { id }),
      })
      if (!isObservable(decision))
        throw new TransportError('contract', 0, 'Line access must return an observable decision.')
      return decision.pipe(
        take(1),
        defaultIfEmpty(false),
        switchMap(allowed => {
          if (allowed !== true || !matches()) throw denied()
          return operation(companyId, scopedDirection)
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
