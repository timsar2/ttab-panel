import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { PASSENGER_IDENTITY } from './passenger.api'
import { PassengerSupportApi } from './support.api'

describe('PassengerSupportApi', () => {
  let api: PassengerSupportApi
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PassengerSupportApi,
        {
          provide: PASSENGER_IDENTITY,
          useValue: () => ({ passengerId: 165, companyId: 70, userId: 901 }),
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    api = TestBed.inject(PassengerSupportApi)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('loads the violation lookup for the reported person type', async () => {
    const result = api.violationTypes(2)
    const request = http.expectOne('/api/v1/support/violation-types/2')
    expect(request.request.method).toBe('GET')
    request.flush({
      code: '2000',
      massage: 'Success',
      result: [{ id: 8, code: 'D1', title: 'Unsafe driving' }],
    })
    await expect(result).resolves.toEqual([{ id: 8, code: 'D1', title: 'Unsafe driving' }])
  })

  it('searches support requests without trusting client-supplied person or company IDs', async () => {
    const result = api.search(2)
    const request = http.expectOne('/api/v1/support/search')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      supportTypeId: 2,
      pageNumber: 1,
      pageSize: 100,
      orderBy: ['RequestDate DESC'],
    })
    request.flush({
      code: '2000',
      massage: 'Success',
      result: {
        list: [
          {
            id: 12,
            supportTypeId: 2,
            supportTypeName: 'User ticket',
            subject: 'Commute',
            isAnswered: false,
          },
        ],
        pagination: { pageNumber: 1, pageSize: 100, totalCount: 1 },
      },
    })
    await expect(result).resolves.toMatchObject([{ id: 12, subject: 'Commute', isAnswered: false }])
  })

  it('creates a ticket with only client-owned fields and decodes report details', async () => {
    const payload = {
      Id: 0 as const,
      SupportTypeId: 4,
      Subject: 'Unsafe driving',
      Body: 'Please review this trip.',
      ReportedPersonId: 176,
      TripId: 72,
      ViolationTypeIds: '8,9',
      OccureAt: '2026-11-16T08:30:00',
    }
    const result = api.create(payload)
    const request = http.expectOne('/api/v1/support')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual(payload)
    expect(request.request.body).not.toHaveProperty('CompanyId')
    expect(request.request.body).not.toHaveProperty('PersonId')
    expect(request.request.body).not.toHaveProperty('IsAnswer')
    request.flush({
      code: '2000',
      massage: 'Created',
      result: {
        id: 41,
        companyId: 70,
        supportTypeId: 4,
        supportTypeName: 'Driver violation',
        personId: 165,
        subject: 'Unsafe driving',
        isAnswered: false,
        caseFile: [
          {
            personId: 176,
            fullName: 'Driver',
            tripId: 72,
            caseViolations: [{ supportViolationTypeId: 8, code: 'D1', title: 'Unsafe driving' }],
          },
        ],
      },
    })
    await expect(result).resolves.toMatchObject({
      id: 41,
      caseFiles: [{ tripId: 72, violations: [{ id: 8, code: 'D1' }] }],
    })
  })

  it('keeps numeric violation IDs in the backend CSV payload', async () => {
    const payload = {
      Id: 0 as const,
      SupportTypeId: 3,
      Subject: 'Report',
      Body: 'Details',
      ReportedPersonId: 176,
      TripId: 72,
      ViolationTypeIds: '8,9',
      OccureAt: '2024-03-20T08:30:00',
    }
    const result = api.create(payload)
    const request = http.expectOne('/api/v1/support')
    expect(request.request.body.ViolationTypeIds).toBe('8,9')
    expect(request.request.body.ViolationTypeIds).not.toContain('D1')
    expect(request.request.body.TripId).toBe(72)
    expect(request.request.body).not.toHaveProperty('Code')
    request.flush({
      code: '2000',
      massage: 'Created',
      result: { id: 42, supportTypeId: 3, subject: 'Report' },
    })
    await expect(result).resolves.toMatchObject({ id: 42 })
  })

  it('loads authorized ticket conversations and posts replies without an IsAnswer flag', async () => {
    const details = api.details(41)
    http.expectOne('/api/v1/support/41').flush({
      code: '2000',
      massage: 'Success',
      result: { id: 41, supportTypeId: 2, subject: 'Question', caseFile: [] },
    })
    await expect(details).resolves.toMatchObject({ id: 41, subject: 'Question' })

    const messages = api.messages(41)
    http.expectOne('/api/v1/support/41/messages').flush({
      code: '2000',
      massage: 'Success',
      result: [{ body: 'We received your request.', isAnswer: true }],
    })
    await expect(messages).resolves.toEqual([{ body: 'We received your request.', isAnswer: true }])

    const reply = api.reply(41, 'Thank you.')
    const request = http.expectOne('/api/v1/support/messages')
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({ supportId: 41, body: 'Thank you.' })
    request.flush({ code: '2000', massage: 'Saved', result: 5 })
    await expect(reply).resolves.toBeUndefined()
  })
})
