import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SessionStore } from '@org/auth-data-access'
import { departureTimeId } from '@org/transport-departure-times-data-access'
import { firstValueFrom, of } from 'rxjs'
import { routeId } from '@org/transport-routes-data-access'
import { LinesApi, LinesDataConfig, provideLinesData } from './lines-api'
import { LineDraft, lineId } from './line.models'

const config: LinesDataConfig = {
  apiUrl: '/test-api',
  endpoints: { collection: 'v1/lines', search: 'v1/lines/search', save: 'v1/lines' },
  company: () => signal(2),
  directionId: () => signal(routeId(42)),
  access: () => request => of(request.companyId === 2 && request.directionId === routeId(42)),
}

describe('LinesApi', () => {
  let http: HttpTestingController
  let api: LinesApi

  beforeEach(() => {
    const session = {
      user: signal({ roles: ['Admin'] }),
      version: signal(1),
      changes$: of(undefined),
      untilChanged:
        () =>
        <T>(source: import('rxjs').Observable<T>) =>
          source,
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionStore, useValue: session },
        provideLinesData(config),
      ],
    })
    http = TestBed.inject(HttpTestingController)
    api = TestBed.inject(LinesApi)
  })

  afterEach(() => http.verify())

  it('loads the server-paged Line list on the selected company and Direction', async () => {
    const result = firstValueFrom(api.list({ pageIndex: 0, pageSize: 10 }))
    const request = http.expectOne('/test-api/v1/lines/search')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      companyId: 2,
      directionId: 42,
      pageNumber: 1,
      pageSize: 10,
    })
    request.flush({
      code: '2000',
      massage: 'Success',
      result: {
        list: [
          {
            id: 5,
            directionId: 42,
            directionName: 'Route',
            name: 'اداری ثابت',
            entranceShiftTimeName: 'سرویس صبح',
            returnShiftTimeName: 'سرویس عصر',
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          pageSize: 10,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      },
    })
    await expect(result).resolves.toMatchObject({ items: [{ id: 5, name: 'اداری ثابت' }] })
  })

  it('loads detail and serializes add/update with the nested parent and optional time IDs', async () => {
    const detail = firstValueFrom(api.detail(lineId(5)))
    const get = http.expectOne('/test-api/v1/lines/5')
    expect(get.request.method).toBe('GET')
    get.flush({
      code: '2000',
      massage: 'Success',
      result: {
        id: 5,
        directionId: 42,
        directionName: 'Route',
        name: 'اداری ثابت',
        entranceShiftTimeId: 10,
        returnShiftTimeId: null,
        entranceShiftTimeName: 'سرویس صبح',
        returnShiftTimeName: null,
      },
    })
    await expect(detail).resolves.toMatchObject({ id: 5, entranceShiftTimeId: 10 })

    const draft: LineDraft = {
      directionId: routeId(42),
      name: 'Changed Line',
      entranceShiftTimeId: departureTimeId(10),
      returnShiftTimeId: null,
    }
    const saved = firstValueFrom(api.save(lineId(5), draft))
    const post = http.expectOne('/test-api/v1/lines')
    expect(post.request.method).toBe('POST')
    expect(post.request.body).toEqual({
      id: 5,
      companyId: 2,
      directionId: 42,
      name: 'Changed Line',
      entranceShiftTimeId: 10,
      returnShiftTimeId: null,
    })
    post.flush({ code: '2000', massage: 'Success', result: { id: 5 } })
    await expect(saved).resolves.toBe(5)

    const createDraft: LineDraft = {
      directionId: routeId(42),
      name: 'اداری ثابت',
      entranceShiftTimeId: null,
      returnShiftTimeId: null,
    }
    const created = firstValueFrom(api.save(null, createDraft))
    const createPost = http.expectOne('/test-api/v1/lines')
    expect(createPost.request.method).toBe('POST')
    expect(createPost.request.body).toEqual({
      companyId: 2,
      directionId: 42,
      name: 'اداری ثابت',
      entranceShiftTimeId: null,
      returnShiftTimeId: null,
    })
    createPost.flush({ code: '2000', massage: 'Success', result: { id: 6 } })
    await expect(created).resolves.toBe(6)
  })

  it('denies requests for a Direction outside the configured route scope before HTTP', async () => {
    TestBed.resetTestingModule()
    const session = {
      user: signal({ roles: ['Admin'] }),
      version: signal(1),
      changes$: of(undefined),
      untilChanged:
        () =>
        <T>(source: import('rxjs').Observable<T>) =>
          source,
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionStore, useValue: session },
        provideLinesData({
          ...config,
          directionId: () => signal(routeId(24)),
          access: () => () => of(false),
        }),
      ],
    })
    const otherApi = TestBed.inject(LinesApi)
    const controller = TestBed.inject(HttpTestingController)
    await expect(
      firstValueFrom(otherApi.list({ pageIndex: 0, pageSize: 10 })),
    ).rejects.toMatchObject({ code: 'lines-access-denied' })
    controller.expectNone('/test-api/v1/lines/search')
  })
})
