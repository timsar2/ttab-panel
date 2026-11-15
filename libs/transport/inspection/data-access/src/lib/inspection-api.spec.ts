import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { Observable, Subject, firstValueFrom, takeUntil } from 'rxjs'
import {
  InspectionApi,
  InspectionCheck,
  InspectionVisitDraft,
  provideInspectionData,
  INSPECTION_ACCESS_DENIED,
} from '../index'

const checkKeys: readonly InspectionCheck[] = [
  'tiresCondition',
  'lightsCondition',
  'seatsCondition',
  'hasSeatBelt',
  'heaterCondition',
  'airConditionerCondition',
  'hasFirstAidKit',
  'hasFireExtinguisher',
  'hasTurnSignals',
  'wipersCondition',
  'windowsCondition',
  'hasSafetyVestAndWarningTriangle',
]
const listRow = {
  id: 12,
  inspectorId: 5,
  inspectorName: 'Inspector',
  inspectionDate: '2026-11-14T00:00:00',
  driverId: 60000,
  driverName: 'Driver',
  vehicleId: 32000,
  carPlate: 'AB12345',
  statusTypeId: 'Pending approval',
}
const detail = {
  ...listRow,
  statusTypeId: undefined,
  ...Object.fromEntries(checkKeys.map(key => [key, true])),
  description: 'Initial inspection',
  defects: [
    { id: 40, inspectionVisitId: 12, dueDate: '2026-11-20T00:00:00', description: 'Replace tire' },
  ],
  correctiveActions: [
    {
      id: 41,
      inspectionVisitId: 12,
      completedAt: '2026-11-21T00:00:00',
      description: 'Tire replaced',
    },
  ],
}
const envelope = <T>(result: T) => ({ code: '2000', massage: null, result })
const config = {
  apiUrl: '/api',
  endpoints: {
    collection: 'v1/inspections',
    search: 'v1/inspections/search',
    defects: 'v1/inspections/defects',
    correctiveActions: 'v1/inspections/corrective-actions',
    status: 'v1/inspections/status',
  },
  access: () =>
    vi.fn(
      () =>
        new Observable<boolean>(subscriber => {
          subscriber.next(true)
          subscriber.complete()
        }),
    ),
}

describe('InspectionApi', () => {
  let http: HttpTestingController
  let api: InspectionApi
  let allowed: ReturnType<typeof vi.fn>
  let sessionChanges: Subject<number>

  beforeEach(() => {
    sessionChanges = new Subject<number>()
    allowed = vi.fn(
      () =>
        new Observable<boolean>(subscriber => {
          subscriber.next(true)
          subscriber.complete()
        }),
    )
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionStore,
          useValue: {
            user: () => ({ id: 'identity' }),
            version: () => 1,
            changes$: sessionChanges,
            untilChanged:
              () =>
              <T>(source: Observable<T>) =>
                source.pipe(takeUntil(sessionChanges)),
          },
        },
        provideInspectionData({ ...config, access: () => allowed }),
      ],
    })
    http = TestBed.inject(HttpTestingController)
    api = TestBed.inject(InspectionApi)
  })

  afterEach(() => http.verify())

  it('uses a bounded search contract and decodes status display name as text', async () => {
    const result = firstValueFrom(
      api.search({ pageNumber: 2, pageSize: 25, orderBy: 'InspectionDate DESC' }),
    )
    const request = http.expectOne('/api/v1/inspections/search')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      pageNumber: 2,
      pageSize: 25,
      orderBy: 'InspectionDate DESC',
    })
    request.flush(envelope([listRow]))
    expect(await result).toMatchObject([
      { id: 12, driverId: 60000, vehicleId: 32000, statusTypeId: 'Pending approval' },
    ])
    expect(allowed).toHaveBeenCalledWith({ action: 'search' })
  })

  it('loads detail arrays as typed records and preserves date-only values', async () => {
    const result = firstValueFrom(api.detail(12 as never))
    const request = http.expectOne('/api/v1/inspections/12')
    request.flush(envelope(detail))
    expect(await result).toMatchObject({
      id: 12,
      inspectionDate: '2026-11-14',
      defects: [{ id: 40, dueDate: '2026-11-20' }],
      correctiveActions: [{ id: 41, completedAt: '2026-11-21' }],
    })
  })

  it('posts visit data with insert-only ID and all required check values', async () => {
    const draft = Object.fromEntries(checkKeys.map(key => [key, true])) as Record<
      InspectionCheck,
      boolean
    >
    const input: InspectionVisitDraft = {
      id: 0,
      inspectionDate: '2026-11-14',
      driverId: 60000,
      vehicleId: 32000,
      description: 'Initial inspection',
      ...draft,
    }
    const result = firstValueFrom(api.createVisit(input))
    const request = http.expectOne('/api/v1/inspections')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toMatchObject({
      id: 0,
      inspectionDate: '2026-11-14',
      driverId: 60000,
      vehicleId: 32000,
    })
    expect(checkKeys.every(key => request.request.body[key] === true)).toBe(true)
    request.flush(envelope(81))
    expect(await result).toBe(81)
  })

  it('posts separate required-action and completed-action fields', async () => {
    const defectResult = firstValueFrom(
      api.addDefect({
        id: 0,
        inspectionVisitId: 12 as never,
        dueDate: '2026-11-20',
        description: 'Replace tire',
      }),
    )
    const defect = http.expectOne('/api/v1/inspections/defects')
    expect(defect.request.body).toEqual({
      id: 0,
      inspectionVisitId: 12,
      dueDate: '2026-11-20',
      description: 'Replace tire',
    })
    defect.flush(envelope(91))
    expect(await defectResult).toBe(91)

    const actionResult = firstValueFrom(
      api.addCorrectiveAction({
        id: 0,
        inspectionVisitId: 12 as never,
        completedAt: '2026-11-21',
        description: 'Tire replaced',
      }),
    )
    const action = http.expectOne('/api/v1/inspections/corrective-actions')
    expect(action.request.body).toEqual({
      id: 0,
      inspectionVisitId: 12,
      completedAt: '2026-11-21',
      description: 'Tire replaced',
    })
    action.flush(envelope(92))
    expect(await actionResult).toBe(92)
  })

  it('uses exact status fields and refuses unsupported IDs', async () => {
    const result = firstValueFrom(api.setStatus(12 as never, 2))
    const request = http.expectOne('/api/v1/inspections/status')
    expect(request.request.body).toEqual({ id: 12, statusTypeId: 2 })
    request.flush(envelope(true))
    expect(await result).toBe(true)
    await expect(firstValueFrom(api.setStatus(12 as never, 4))).rejects.toBeDefined()
    http.expectNone('/api/v1/inspections/status')
  })

  it('fails closed before HTTP when the role policy denies access', async () => {
    allowed.mockReturnValue(
      new Observable<boolean>(subscriber => {
        subscriber.next(false)
        subscriber.complete()
      }),
    )
    await expect(
      firstValueFrom(api.search({ pageNumber: 1, pageSize: 25, orderBy: 'Id' })),
    ).rejects.toMatchObject({ code: INSPECTION_ACCESS_DENIED })
    http.expectNone(() => true)
  })

  it('cancels pending reads when the authenticated session changes', async () => {
    const result = firstValueFrom(api.search({ pageNumber: 1, pageSize: 25, orderBy: 'Id DESC' }))
    const request = http.expectOne('/api/v1/inspections/search')
    sessionChanges.next(2)
    await expect(result).rejects.toBeDefined()
    expect(request.cancelled).toBe(true)
  })
})
