import {
  DestroyRef,
  EnvironmentInjector,
  Injectable,
  InjectionToken,
  createEnvironmentInjector,
  inject,
  makeEnvironmentProviders,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { SessionStore } from '@org/auth-data-access'
import {
  TransportError,
  TransportHttp,
  normalizeTransportError,
  provideTransportHttp,
  transportInteger,
  unwrapTransport,
} from '@org/transport-http'
import {
  Observable,
  catchError,
  defaultIfEmpty,
  defer,
  isObservable,
  map,
  switchMap,
  take,
  throwError,
} from 'rxjs'
import {
  InspectionCorrectiveActionDraft,
  InspectionDefectDraft,
  InspectionId,
  InspectionSearch,
  InspectionVisitDraft,
  decodeInspectionDetail,
  decodeInspectionList,
  inspectionCorrectiveActionWrite,
  inspectionDefectWrite,
  inspectionId,
  inspectionVisitWrite,
} from './inspection.models'

export interface InspectionAccessRequest {
  readonly action: 'search' | 'detail' | 'create' | 'defect' | 'corrective-action' | 'status'
  readonly id?: InspectionId
}
export type InspectionAuthorize = (request: InspectionAccessRequest) => Observable<boolean>
export interface InspectionDataConfig {
  readonly apiUrl: string
  readonly endpoints: {
    readonly collection: string
    readonly search: string
    readonly defects: string
    readonly correctiveActions: string
    readonly status: string
  }
  /** Must resolve true only for the backend-supported Admin/Manager staff roles. */
  readonly access: () => InspectionAuthorize
}

const CONFIG = new InjectionToken<InspectionDataConfig>('INSPECTION_DATA_CONFIG')
const ACCESS = new InjectionToken<InspectionAuthorize>('INSPECTION_ACCESS')
const HTTP = new InjectionToken<TransportHttp>('INSPECTION_HTTP')
export const INSPECTION_ACCESS_DENIED = 'inspection-access-denied'

export function provideInspectionData(config: InspectionDataConfig) {
  if (
    typeof config.access !== 'function' ||
    !config.endpoints ||
    !Object.values(config.endpoints).every(
      path => typeof path === 'string' && /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path),
    )
  )
    throw new Error('Configure explicit Inspection endpoints and an Admin/Manager access policy.')
  const transport = provideTransportHttp({ apiUrl: config.apiUrl })
  return makeEnvironmentProviders([
    {
      provide: HTTP,
      useFactory: () => {
        const child = createEnvironmentInjector([transport], inject(EnvironmentInjector))
        inject(DestroyRef).onDestroy(() => child.destroy())
        return child.get(TransportHttp)
      },
    },
    { provide: CONFIG, useValue: { ...config, endpoints: { ...config.endpoints } } },
    { provide: ACCESS, useFactory: config.access },
    InspectionApi,
  ])
}

function denied() {
  return new TransportError(
    'business',
    0,
    'This Inspection operation has no approved access.',
    {},
    INSPECTION_ACCESS_DENIED,
  )
}

@Injectable()
export class InspectionApi {
  private readonly config = inject(CONFIG)
  private readonly access = inject(ACCESS)
  private readonly http = inject(HTTP)
  private readonly session = inject(SessionStore)
  private readonly destroyRef = inject(DestroyRef)

  search(search: InspectionSearch) {
    return this.run('search', undefined, () => {
      const pageNumber = transportInteger(search.pageNumber, 1, 32767)
      const pageSize = transportInteger(search.pageSize, 1, 100)
      const allowed: readonly string[] = [
        'Id',
        'Id DESC',
        'InspectionDate',
        'InspectionDate DESC',
        'InspectorName',
        'InspectorName DESC',
        'DriverName',
        'DriverName DESC',
      ]
      if (!allowed.includes(search.orderBy))
        throw new TransportError('validation', 0, 'Choose an available inspection sort.')
      return this.http.request(
        'POST',
        this.config.endpoints.search,
        value =>
          unwrapTransport(value, result =>
            decodeInspectionList(result, { ...search, pageNumber, pageSize }),
          ),
        { pageNumber, pageSize, orderBy: search.orderBy },
      )
    })
  }

  detail(id: InspectionId) {
    return this.run('detail', id, () =>
      this.http.request('GET', `${this.config.endpoints.collection}/${id}`, value =>
        unwrapTransport(value, result => {
          const detail = decodeInspectionDetail(result)
          if (detail.id !== id)
            throw new TransportError(
              'contract',
              0,
              'Inspection ID does not match the requested record.',
            )
          return detail
        }),
      ),
    )
  }

  createVisit(draft: InspectionVisitDraft) {
    return this.run('create', undefined, () =>
      this.http.request(
        'POST',
        this.config.endpoints.collection,
        value => unwrapTransport(value, result => transportInteger(result, 1, 2147483647)),
        inspectionVisitWrite(draft),
      ),
    )
  }

  addDefect(draft: InspectionDefectDraft) {
    return this.run('defect', draft.inspectionVisitId, () =>
      this.http.request(
        'POST',
        this.config.endpoints.defects,
        value => unwrapTransport(value, result => transportInteger(result, 1, 2147483647)),
        inspectionDefectWrite(draft),
      ),
    )
  }

  addCorrectiveAction(draft: InspectionCorrectiveActionDraft) {
    return this.run('corrective-action', draft.inspectionVisitId, () =>
      this.http.request(
        'POST',
        this.config.endpoints.correctiveActions,
        value => unwrapTransport(value, result => transportInteger(result, 1, 2147483647)),
        inspectionCorrectiveActionWrite(draft),
      ),
    )
  }

  setStatus(id: InspectionId, statusTypeId: number) {
    return this.run('status', id, () => {
      if (![1, 2, 3].includes(statusTypeId))
        throw new TransportError('validation', 0, 'Choose a supported inspection status.')
      return this.http.request(
        'POST',
        this.config.endpoints.status,
        value =>
          unwrapTransport(value, result => {
            if (result !== true)
              throw new TransportError('contract', 0, 'The inspection status was not confirmed.')
            return true
          }),
        { id, statusTypeId },
      )
    })
  }

  private run<T>(
    action: InspectionAccessRequest['action'],
    target: InspectionId | undefined,
    operation: () => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      if (!this.session.user()) throw denied()
      const id = target === undefined ? undefined : inspectionId(target)
      const version = this.session.version()
      const matches = () => this.session.version() === version && !!this.session.user()
      const decision = this.access({ action, ...(id === undefined ? {} : { id }) })
      if (!isObservable(decision))
        throw new TransportError(
          'contract',
          0,
          'Inspection access must return an observable decision.',
        )
      return decision.pipe(
        take(1),
        defaultIfEmpty(false),
        switchMap(allowed => {
          if (allowed !== true || !matches()) throw denied()
          return operation()
        }),
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
