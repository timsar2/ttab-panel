import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { InspectionApi, InspectionStore } from '../index'
import {
  InspectionDetail,
  InspectionId,
  InspectionSearch,
  InspectionVisitRow,
} from './inspection.models'
import { Subject, firstValueFrom, of, throwError } from 'rxjs'

const visit: InspectionVisitRow = {
  id: 11 as InspectionId,
  inspectorId: 5,
  inspectorName: 'Inspector',
  inspectionDate: '2026-11-14',
  driverId: 21,
  driverName: 'Driver',
  vehicleId: 31,
  carPlate: 'AB123',
  statusTypeName: 'Pending action',
}

describe('InspectionStore', () => {
  it('keeps list/detail independent and synchronously hides and clears records after session changes', () => {
    const listResponse = new Subject<readonly InspectionVisitRow[]>()
    const detailResponse = new Subject<never>()
    const changes = new Subject<void>()
    const user = signal<{ id: string } | null>({ id: 'staff' })
    const version = signal(1)
    const api = {
      search: vi.fn(() => listResponse),
      detail: vi.fn(() => detailResponse),
      createVisit: vi.fn(() => of(1)),
      addDefect: vi.fn(() => of(1)),
      addCorrectiveAction: vi.fn(() => of(1)),
    }
    TestBed.configureTestingModule({
      providers: [
        InspectionStore,
        { provide: InspectionApi, useValue: api },
        {
          provide: SessionStore,
          useValue: {
            user: () => user(),
            version: () => version(),
            changes$: changes,
          },
        },
      ],
    })
    const store = TestBed.inject(InspectionStore)
    const search: InspectionSearch = { pageNumber: 1, pageSize: 25, orderBy: 'Id DESC' }
    store.load(search)
    expect(store.listStatus()).toBe('loading')
    listResponse.next([visit])
    expect(store.visits()).toEqual([visit])
    expect(store.listStatus()).toBe('ready')
    expect(store.detail()).toBeNull()

    store.loadDetail(11 as InspectionId)
    expect(store.visits()).toEqual([visit])
    user.set(null)
    expect(store.visits()).toBeNull()
    expect(store.detail()).toBeNull()
    version.set(2)
    changes.next()
    expect(store.listStatus()).toBe('idle')
    expect(store.detailStatus()).toBe('idle')
    expect(store.visits()).toBeNull()
  })

  it('appends only confirmed insert-only action results to the matching detail record', async () => {
    const changes = new Subject<void>()
    const user = signal<{ id: string } | null>({ id: 'staff' })
    const detail: InspectionDetail = {
      ...visit,
      tiresCondition: false,
      lightsCondition: false,
      seatsCondition: false,
      hasSeatBelt: false,
      heaterCondition: false,
      airConditionerCondition: false,
      hasFirstAidKit: false,
      hasFireExtinguisher: false,
      hasTurnSignals: false,
      wipersCondition: false,
      windowsCondition: false,
      hasSafetyVestAndWarningTriangle: false,
      description: 'Initial check',
      defects: [],
      correctiveActions: [],
    }
    const api = {
      search: vi.fn(() => of([visit])),
      detail: vi.fn(() => of(detail)),
      createVisit: vi.fn(() => of(1)),
      addDefect: vi.fn(() => of(50)),
      addCorrectiveAction: vi.fn(() => of(51)),
    }
    TestBed.configureTestingModule({
      providers: [
        InspectionStore,
        { provide: InspectionApi, useValue: api },
        {
          provide: SessionStore,
          useValue: { user: () => user(), version: () => 1, changes$: changes },
        },
      ],
    })
    const store = TestBed.inject(InspectionStore)
    store.loadDetail(visit.id)
    expect(store.detail()).toEqual(detail)
    store
      .addDefect({
        id: 0,
        inspectionVisitId: visit.id,
        dueDate: '2026-11-20',
        description: ' Replace tire ',
      })
      .subscribe()
    expect(store.detail()?.defects).toEqual([
      {
        id: 50,
        inspectionVisitId: visit.id,
        dueDate: '2026-11-20',
        description: 'Replace tire',
      },
    ])
    store
      .addCorrectiveAction({
        id: 0,
        inspectionVisitId: visit.id,
        completedAt: '2026-11-21',
        description: ' Tire replaced ',
      })
      .subscribe()
    expect(store.detail()?.correctiveActions).toEqual([
      {
        id: 51,
        inspectionVisitId: visit.id,
        completedAt: '2026-11-21',
        description: 'Tire replaced',
      },
    ])
    expect(api.detail).toHaveBeenCalledTimes(1)
    api.addDefect.mockReturnValueOnce(throwError(() => new Error('insert failed')))
    await expect(
      firstValueFrom(
        store.addDefect({
          id: 0,
          inspectionVisitId: visit.id,
          dueDate: '2026-11-22',
          description: 'Broken lamp',
        }),
      ),
    ).rejects.toThrow('insert failed')
    expect(store.detail()?.defects).toHaveLength(1)
  })

  it('leaves loading when a detail observable completes without a response', () => {
    const detailResponse = new Subject<never>()
    const user = signal<{ id: string } | null>({ id: 'staff' })
    const changes = new Subject<void>()
    const api = {
      search: vi.fn(() => of([])),
      detail: vi.fn(() => detailResponse),
      createVisit: vi.fn(() => of(1)),
      addDefect: vi.fn(() => of(1)),
      addCorrectiveAction: vi.fn(() => of(1)),
    }
    TestBed.configureTestingModule({
      providers: [
        InspectionStore,
        { provide: InspectionApi, useValue: api },
        {
          provide: SessionStore,
          useValue: { user: () => user(), version: () => 1, changes$: changes },
        },
      ],
    })
    const store = TestBed.inject(InspectionStore)
    store.loadDetail(11 as InspectionId)
    expect(store.detailStatus()).toBe('loading')

    detailResponse.complete()

    expect(store.detailStatus()).toBe('error')
    expect(store.detailError()).not.toBeNull()
  })
})
