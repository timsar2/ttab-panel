import { InjectionToken, Signal, inject, makeEnvironmentProviders } from '@angular/core'
import { SessionStore } from '@org/auth-data-access'
import {
  TransportError,
  TransportHttp,
  provideTransportHttp,
  unwrapTransport,
} from '@org/transport-http'
import { Observable, defer, map, switchMap, take, throwError } from 'rxjs'
import {
  ShiftDraft,
  ShiftGroupDraft,
  ShiftTime,
  decodeShift,
  decodeShiftGroup,
  decodeShiftType,
  schedulingId,
} from './scheduling.models'

export type SchedulingAction =
  'list' | 'lookup' | 'detail' | 'create-group' | 'update-group' | 'create-shift' | 'update-shift'
export interface SchedulingAccessRequest {
  readonly action: SchedulingAction
  readonly companyId: number
  readonly id?: number
}
export type SchedulingAuthorize = (request: SchedulingAccessRequest) => Observable<boolean>

export interface SchedulingDataConfig {
  readonly apiUrl: string
  readonly endpoints: {
    readonly shifts: string
    readonly shiftDetail: string
    readonly groups: string
    readonly types: string
    readonly shiftTimes: string
    readonly saveGroup: string
    readonly saveShift: string
  }
  readonly company: () => Signal<number | null>
  readonly access: () => SchedulingAuthorize
}

const CONFIG = new InjectionToken<SchedulingDataConfig>('SCHEDULING_DATA_CONFIG')
const COMPANY = new InjectionToken<Signal<number | null>>('SCHEDULING_COMPANY')
const ACCESS = new InjectionToken<SchedulingAuthorize>('SCHEDULING_ACCESS')

export function provideSchedulingData(config: SchedulingDataConfig) {
  const paths = Object.values(config.endpoints ?? {})
  if (
    typeof config.company !== 'function' ||
    typeof config.access !== 'function' ||
    paths.length !== 7 ||
    !paths.every(path => /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path))
  )
    throw new Error('Configure scheduling endpoints, company scope, and access policy.')
  return makeEnvironmentProviders([
    provideTransportHttp({ apiUrl: config.apiUrl }),
    { provide: CONFIG, useValue: config },
    { provide: COMPANY, useFactory: config.company },
    { provide: ACCESS, useFactory: config.access },
    SchedulingApi,
  ])
}

function denied() {
  return new TransportError(
    'business',
    0,
    'Scheduling access is not enabled for this company.',
    {},
    'scheduling-access-denied',
  )
}

export class SchedulingApi {
  readonly companyId = inject(COMPANY)
  private readonly config = inject(CONFIG)
  private readonly authorize = inject(ACCESS)
  private readonly http = inject(TransportHttp)
  private readonly session = inject(SessionStore)

  listGroups() {
    return this.run('list', companyId =>
      this.http.request(
        'POST',
        this.config.endpoints.groups,
        value =>
          unwrapTransport(value, result => {
            const groups = this.rows(result, decodeShiftGroup)
            if (groups.some(group => group.companyId !== companyId))
              throw new TransportError(
                'contract',
                0,
                'Shift groups contain records from another company.',
              )
            return groups
          }),
        { companyId },
      ),
    )
  }
  listShifts() {
    return this.run('list', companyId =>
      this.http.request(
        'POST',
        this.config.endpoints.shifts,
        value => unwrapTransport(value, result => this.rows(result, decodeShift)),
        { companyId },
      ),
    )
  }
  listTypes() {
    return this.run('lookup', () =>
      this.http.request('GET', this.config.endpoints.types, value =>
        unwrapTransport(value, result => this.rows(result, decodeShiftType)),
      ),
    )
  }
  listShiftTimes() {
    return this.run('lookup', companyId =>
      this.http.request(
        'POST',
        this.config.endpoints.shiftTimes,
        value =>
          unwrapTransport(value, result =>
            this.rows(result, row => {
              const data = row as Record<string, unknown>
              if (typeof data['name'] !== 'string' || typeof data['shiftTime'] !== 'string')
                throw new TransportError('contract', 0, 'Invalid shift-time lookup.')
              return {
                id: schedulingId(data['id']),
                name: data['name'],
                shiftTime: data['shiftTime'],
              } satisfies ShiftTime
            }),
          ),
        { companyId },
      ),
    )
  }
  detail(id: number) {
    const target = schedulingId(id)
    return this.run(
      'detail',
      companyId =>
        this.listGroups().pipe(
          switchMap(groups =>
            this.http.request('GET', `${this.config.endpoints.shiftDetail}/${target}`, value =>
              unwrapTransport(value, result => {
                if (result == null) return null
                const shift = decodeShift(result)
                if (shift.id !== target)
                  throw new TransportError(
                    'contract',
                    0,
                    'Shift response does not match the requested id.',
                  )
                if (
                  !groups.some(
                    group => group.id === shift.shiftGroupId && group.companyId === companyId,
                  )
                )
                  return null
                return shift
              }),
            ),
          ),
        ),
      target,
    )
  }
  saveGroup(draft: ShiftGroupDraft, id?: number) {
    return this.run(id === undefined ? 'create-group' : 'update-group', companyId =>
      this.http.request(
        'POST',
        this.config.endpoints.saveGroup,
        value =>
          unwrapTransport(value, result => {
            if (result == null) return null
            const group = decodeShiftGroup(result)
            if (group.companyId !== companyId || (id !== undefined && group.id !== id))
              throw new TransportError(
                'contract',
                0,
                'Saved shift group does not match the requested company or id.',
              )
            return group
          }),
        { ...draft, id, companyId },
        { apiUrl: this.config.apiUrl },
      ),
    )
  }
  saveShift(draft: ShiftDraft, id?: number) {
    const body = {
      ...draft,
      id,
      ...(draft.offShift ? { entranceShiftTimeId: null, returnShiftTimeId: null } : {}),
    }
    return this.run(id === undefined ? 'create-shift' : 'update-shift', companyId =>
      this.listGroups().pipe(
        switchMap(groups => {
          if (
            !groups.some(group => group.id === body.shiftGroupId && group.companyId === companyId)
          )
            return throwError(
              () => new TransportError('validation', 0, 'Select a shift group from this company.'),
            )
          return this.http.request(
            'POST',
            this.config.endpoints.saveShift,
            value =>
              unwrapTransport(value, result => {
                if (result == null) return null
                const shift = decodeShift(result)
                if (
                  shift.shiftGroupId !== body.shiftGroupId ||
                  (id !== undefined && shift.id !== id)
                )
                  throw new TransportError(
                    'contract',
                    0,
                    'Saved shift does not match the requested group or id.',
                  )
                return shift
              }),
            body,
            { apiUrl: this.config.apiUrl },
          )
        }),
      ),
    )
  }

  private rows<T>(value: unknown, decode: (row: unknown) => T): readonly T[] {
    if (!Array.isArray(value))
      throw new TransportError('contract', 0, 'Expected a scheduling list.')
    return value.map(decode)
  }
  private run<T>(
    action: SchedulingAction,
    operation: (companyId: number) => Observable<T>,
    id?: number,
  ) {
    return defer(() => {
      const companyId = this.companyId()
      const user = this.session.user()
      if (companyId === null || !user) throw denied()
      const sessionVersion = this.session.version()
      return this.authorize({ action, companyId, ...(id === undefined ? {} : { id }) }).pipe(
        take(1),
        switchMap(allowed => {
          if (
            allowed !== true ||
            this.companyId() !== companyId ||
            this.session.version() !== sessionVersion ||
            !this.session.user()
          )
            return throwError(() => denied())
          return operation(companyId)
        }),
        map(result => {
          if (
            this.companyId() !== companyId ||
            this.session.version() !== sessionVersion ||
            !this.session.user()
          )
            throw denied()
          return result
        }),
      )
    })
  }
}
