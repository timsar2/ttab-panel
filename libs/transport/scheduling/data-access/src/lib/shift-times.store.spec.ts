import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { ShiftTimesStore } from './shift-times.store'

describe('ShiftTimesStore', () => {
  let companyId: ReturnType<typeof signal<number | null>>
  let http: HttpTestingController
  let store: ShiftTimesStore

  beforeEach(() => {
    companyId = signal<number | null>(3)
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionStore, useValue: { user: () => ({ companyId: companyId() }) } },
      ],
    })
    store = TestBed.inject(ShiftTimesStore)
    http = TestBed.inject(HttpTestingController)
    TestBed.flushEffects()
  })

  afterEach(() => http.verify())

  it('loads and indexes shift names and departure times for the active company', async () => {
    const request = http.expectOne('/api/v1/shiftTimes')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({ companyId: 3 })
    request.flush({
      code: '2000',
      massage: 'Success',
      result: [{ id: 8, companyId: 3, name: 'صبح', shiftTime: '07:00:00' }],
    })

    expect(store.byId().get(8)).toEqual({
      id: 8,
      companyId: 3,
      name: 'صبح',
      shiftTime: '07:00:00',
    })
    expect(store.loading()).toBe(false)
    expect(store.error()).toBeNull()
    await expect(store.ensureLoaded()).resolves.toBeUndefined()
  })

  it('clears company-scoped shift times after logout', () => {
    const request = http.expectOne('/api/v1/shiftTimes')
    request.flush({
      code: '2000',
      massage: 'Success',
      result: [{ id: 8, companyId: 3, name: 'صبح', shiftTime: '07:00:00' }],
    })

    companyId.set(null)
    TestBed.flushEffects()

    expect(store.times()).toEqual([])
    expect(store.loading()).toBe(false)
  })
})
