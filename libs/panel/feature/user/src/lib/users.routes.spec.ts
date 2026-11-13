import { HttpClient, provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom } from 'rxjs'
import { UserFeatureConfig, userDetail, updateUser, userSearch } from './users.routes'

const config: UserFeatureConfig = {
  path: 'directory',
  apiUrl: '/alternate-api',
  companyId: () => () => 27,
  canManage: () => () => true,
}

describe('User feature API adapters', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  )
  afterEach(() => TestBed.inject(HttpTestingController).verify())

  it('uses the configured collection endpoint and company search payload', async () => {
    const http = TestBed.inject(HttpTestingController)
    const result = firstValueFrom(
      userSearch(TestBed.inject(HttpClient), config, {
        companyId: 27,
        fullName: 'Ada',
        nationalId: '',
        pageNumber: 2,
        pageSize: 25,
      }),
    )
    const request = http.expectOne('/alternate-api/users/search')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      companyId: 27,
      fullName: 'Ada',
      nationalId: '',
      pageNumber: 2,
      pageSize: 25,
    })
    request.flush({
      result: {
        list: [],
        pagination: {
          currentPage: 2,
          totalPages: 2,
          pageSize: 25,
          hasPreviousPage: true,
          hasNextPage: false,
        },
      },
    })
    await expect(result).resolves.toMatchObject({ result: { list: [] } })
  })

  it('loads detail by id and updates with the nested coordinate wire format', async () => {
    const http = TestBed.inject(HttpClient)
    const controller = TestBed.inject(HttpTestingController)
    const detail = firstValueFrom(userDetail(http, config, 81))
    const read = controller.expectOne('/alternate-api/users/81')
    expect(read.request.method).toBe('GET')
    read.flush({ result: { id: 81, cityId: 3 } })
    await expect(detail).resolves.toMatchObject({ result: { id: 81 } })

    const payload = {
      id: 81,
      companyId: 27,
      mobileNumber: '09120000000',
      phoneNumber: null,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
      cityId: 3,
      nationalId: null,
      address: '1 Analytical Way',
      postalCode: null,
      coordinate: { lat: 35.7, lng: 51.4 },
    } as const
    const update = firstValueFrom(updateUser(http, config, payload))
    const write = controller.expectOne('/alternate-api/users')
    expect(write.request.method).toBe('PUT')
    expect(write.request.body).toEqual(payload)
    expect(write.request.body.profileImage).toBeUndefined()
    write.flush({ result: { id: 81, cityId: 3 } })
    await expect(update).resolves.toMatchObject({ result: { id: 81 } })
  })
})
