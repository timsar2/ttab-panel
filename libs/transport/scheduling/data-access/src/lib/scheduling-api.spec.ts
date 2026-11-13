import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { Observable, Subject, filter, firstValueFrom, of, takeUntil } from 'rxjs'
import { SchedulingApi, provideSchedulingData } from './scheduling-api'
import { SchedulingStore } from './scheduling.store'

describe('legacy Shift list API contract', () => {
  let http: HttpTestingController
  let api: SchedulingApi

  beforeEach(() => {
    const user = signal<{ id: string } | null>({ id: 'test-user' })
    const version = signal(1)
    const changes = new Subject<number>()
    const company = signal<number | null>(12)
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionStore,
          useValue: {
            user,
            version,
            changes$: changes,
            untilChanged:
              (at: number) =>
              <T>(source: Observable<T>) =>
                source.pipe(takeUntil(changes.pipe(filter(() => version() !== at)))),
          },
        },
        provideSchedulingData({
          apiUrl: '/api',
          endpoints: {
            shifts: 'v1/shifts/get-shift',
            shiftDetail: 'v1/shifts',
            groups: 'v1/shifts/shift-group',
            types: 'v1/shifts/shift-type',
            shiftTimes: 'v1/shiftTimes',
            saveGroup: 'v1/shifts/set-group',
            saveShift: 'v1/shifts/set-shift',
          },
          company: () => company,
          access: () => () => of(true),
        }),
        SchedulingStore,
      ],
    })
    http = TestBed.inject(HttpTestingController)
    api = TestBed.inject(SchedulingApi)
  })

  afterEach(() => http.verify())

  it('POSTs the legacy URL and companyId payload, decodes the legacy envelope, and does not query groups', async () => {
    const result = firstValueFrom(api.listShifts())
    const request = http.expectOne('/api/v1/shifts/get-shift')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({ companyId: 12 })
    http.expectNone('/api/v1/shifts/shift-group')
    request.flush({
      code: '2000',
      massage: 'Success',
      result: [
        {
          name: 'ثابت خط تولید',
          shiftGroupId: 3,
          shiftGroupName: 'خط تولید',
          startTime: '07:30:00',
          endTime: '19:30:00',
          entranceShiftTimeName: 'سرویس صبح',
          returnShiftTimeName: 'سرویس عصر',
          orderNo: 1,
          id: 7,
        },
      ],
    })
    expect(await result).toEqual([
      {
        id: 7,
        shiftGroupId: 3,
        shiftGroupName: 'خط تولید',
        name: 'ثابت خط تولید',
        startTime: '07:30:00',
        endTime: '19:30:00',
        entranceShiftTimeName: 'سرویس صبح',
        returnShiftTimeName: 'سرویس عصر',
        orderNo: 1,
        entranceShiftTimeId: undefined,
        returnShiftTimeId: undefined,
      },
    ])
  })

  it('loads the list store without calling the Shift Group lookup endpoint', () => {
    const store = TestBed.inject(SchedulingStore)
    store.load()
    const request = http.expectOne('/api/v1/shifts/get-shift')
    expect(request.request.body).toEqual({ companyId: 12 })
    http.expectNone('/api/v1/shifts/shift-group')
    request.flush({
      code: '2000',
      massage: 'Success',
      result: [
        {
          name: 'ثابت خط تولید',
          shiftGroupId: 3,
          shiftGroupName: 'خط تولید',
          startTime: '07:30:00',
          endTime: '19:30:00',
          entranceShiftTimeName: 'سرویس صبح',
          returnShiftTimeName: 'سرویس عصر',
          orderNo: 1,
          id: 7,
        },
      ],
    })
    expect(store.shifts()).toEqual([
      expect.objectContaining({ id: 7, name: 'ثابت خط تولید', shiftGroupName: 'خط تولید' }),
    ])
  })
})
