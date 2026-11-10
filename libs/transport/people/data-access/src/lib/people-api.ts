import {
  Injectable,
  InjectionToken,
  Signal,
  computed,
  inject,
  makeEnvironmentProviders,
} from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { SessionStore } from '@org/auth-data-access'
import {
  TransportError,
  TransportHttp,
  TransportImageUpload,
  decodeTransportPage,
  normalizeTransportError,
  provideTransportHttp,
  transportInteger,
  transportPageRequest,
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
  PeopleCompanyId,
  PeopleSearch,
  PersonId,
  decodePersonDetail,
  decodePersonRow,
  peopleCompanyId,
  personId,
} from './person.models'
import { PersonDraft, personCreate, personUpdate } from './person-write.models'
import type { PersonDetail } from './person.models'

export interface PeopleAccessRequest {
  readonly action: 'search' | 'detail' | 'create' | 'update' | 'delete'
  readonly companyId: PeopleCompanyId
  readonly personId?: PersonId
}
export type PeopleAuthorize = (request: PeopleAccessRequest) => Observable<boolean>
export interface PeopleDataConfig {
  readonly apiUrl: string
  /** Factories run in DI context. Scope must be null while unauthorized or unresolved. */
  readonly company: () => Signal<PeopleCompanyId | null>
  /** Supply approved server-verified access, not menu visibility or a guessed role matrix. */
  readonly access: () => PeopleAuthorize
}

const PEOPLE_COMPANY = new InjectionToken<Signal<PeopleCompanyId | null>>('PEOPLE_COMPANY')
const PEOPLE_ACCESS = new InjectionToken<PeopleAuthorize>('PEOPLE_ACCESS')
export const PEOPLE_ACCESS_DENIED = 'people-access-denied'

export function providePeopleData(config: PeopleDataConfig) {
  if (typeof config.company !== 'function' || typeof config.access !== 'function') {
    throw new Error('Configure an explicit people company scope and approved access policy.')
  }
  return makeEnvironmentProviders([
    provideTransportHttp({ apiUrl: config.apiUrl }),
    { provide: PEOPLE_COMPANY, useFactory: config.company },
    { provide: PEOPLE_ACCESS, useFactory: config.access },
    PeopleApi,
  ])
}

function accessDenied() {
  return new TransportError(
    'business',
    0,
    'This people operation has no approved access.',
    {},
    PEOPLE_ACCESS_DENIED,
  )
}

@Injectable()
export class PeopleApi {
  readonly companyId = inject(PEOPLE_COMPANY)
  private readonly authorize = inject(PEOPLE_ACCESS)
  private readonly http = inject(TransportHttp)
  private readonly session = inject(SessionStore)
  private readonly scopeChanges = toObservable(computed(() => this.companyId()))

  search(query: PeopleSearch) {
    const snapshot = { ...query }
    return this.run('search', null, companyId => {
      const paging = transportPageRequest(snapshot.pageIndex, snapshot.pageSize)
      transportInteger(paging.pageNumber, 1, 2147483647)
      transportInteger(paging.pageSize, 1, 2147483647)
      if (
        snapshot.userShiftState !== null &&
        !['All', 'HasShift', 'HasNotShift'].includes(snapshot.userShiftState)
      ) {
        throw new TransportError('validation', 0, 'Choose a supported shift filter.')
      }
      return this.http
        .request(
          'POST',
          'users/search',
          value => unwrapTransport(value, result => decodeTransportPage(result, decodePersonRow)),
          {
            companyId,
            fullName: snapshot.fullName.trim() || null,
            nationalId: snapshot.nationalId.trim() || null,
            userShiftState: snapshot.userShiftState,
            ...paging,
          },
        )
        .pipe(
          map(page => {
            if (
              page.pagination.currentPage !== paging.pageNumber ||
              page.pagination.pageSize !== paging.pageSize ||
              new Set(page.items.map(person => person.id)).size !== page.items.length
            ) {
              throw new TransportError(
                'contract',
                0,
                'The server returned an inconsistent people page.',
              )
            }
            return page
          }),
        )
    })
  }

  detail(id: PersonId) {
    return this.run('detail', id, () =>
      this.http
        .request('GET', `users/${id}`, value =>
          unwrapTransport(value, result => (result === null ? null : decodePersonDetail(result))),
        )
        .pipe(
          map(detail => {
            if (detail && detail.id !== id)
              throw new TransportError(
                'contract',
                0,
                'The requested person does not match the server response.',
              )
            return detail
          }),
        ),
    )
  }

  /** Account creation and messaging side effects must be approved before enabling this operation. */
  create(draft: PersonDraft, image: TransportImageUpload | null = null) {
    const snapshot = { ...draft }
    const upload = image ? { ...image } : null
    return this.run('create', null, companyId =>
      this.http.request(
        'POST',
        'users',
        value =>
          unwrapTransport(value, result => (result === null ? null : decodePersonDetail(result))),
        personCreate(companyId, snapshot, upload),
      ),
    )
  }

  update(original: PersonDetail, draft: PersonDraft, image: TransportImageUpload | null = null) {
    const record = { ...original }
    const snapshot = { ...draft }
    const upload = image ? { ...image } : null
    return this.run('update', record.id, companyId =>
      this.http
        .request(
          'PUT',
          'users',
          value =>
            unwrapTransport(value, result => (result === null ? null : decodePersonDetail(result))),
          personUpdate(companyId, record, snapshot, upload),
        )
        .pipe(
          map(detail => {
            if (detail && detail.id !== record.id)
              throw new TransportError(
                'contract',
                0,
                'The updated person does not match the requested person.',
              )
            return detail
          }),
        ),
    )
  }

  /** Backend non-admin deletion rewrites to self; no caller may infer requested-row deletion. */
  delete(id: PersonId): Observable<PersonId> {
    return this.run('delete', id, () =>
      this.http
        .request('DELETE', `users/${id}`, value => unwrapTransport(value, personId))
        .pipe(
          map(deleted => {
            if (deleted !== id)
              throw new TransportError(
                'contract',
                0,
                'Deletion of the requested person was not confirmed.',
              )
            return deleted
          }),
        ),
    )
  }

  private run<T>(
    action: PeopleAccessRequest['action'],
    target: PersonId | null,
    operation: (company: PeopleCompanyId) => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const current = this.companyId()
      if (!this.session.user() || current === null) throw accessDenied()
      const companyId = peopleCompanyId(current)
      const id = target === null ? null : personId(target)
      const version = this.session.version()
      const decision = this.authorize({
        action,
        companyId,
        ...(id === null ? {} : { personId: id }),
      })
      if (!isObservable(decision))
        throw new TransportError('contract', 0, 'People access must return an observable decision.')
      return decision.pipe(
        take(1),
        defaultIfEmpty(false),
        switchMap(allowed => {
          if (
            allowed !== true ||
            this.companyId() !== companyId ||
            this.session.version() !== version
          )
            throw accessDenied()
          return operation(companyId)
        }),
        takeUntil(this.scopeChanges.pipe(filter(() => this.companyId() !== companyId))),
        this.session.untilChanged(version),
        map(result => {
          if (this.companyId() !== companyId || this.session.version() !== version)
            throw accessDenied()
          return result
        }),
      )
    }).pipe(catchError(error => throwError(() => normalizeTransportError(error))))
  }
}
