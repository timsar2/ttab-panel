import { signal } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { provideTransportHttp } from '@org/transport-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PASSENGER_COMPANY, PASSENGER_FEATURE, PASSENGER_LANGUAGE } from '../passengers.routes'
import { PassengerPage } from './passenger-page'

describe('PassengerPage route entry', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )
  })

  afterEach(() => {
    TestBed.resetTestingModule()
    vi.unstubAllGlobals()
  })

  it('loads legacy lookups on entry, dependent lookups by direction, and submits the legacy payload', () => {
    TestBed.configureTestingModule({
      imports: [PassengerPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTransportHttp({ apiUrl: '/api' }),
        {
          provide: PASSENGER_FEATURE,
          useValue: {
            apiUrl: '/api',
            endpoints: {
              search: 'v1/passengers/search',
              directions: 'v1/directions/search',
              shifts: 'v1/shifts/get-shift',
              stations: 'v1/stations/search',
              lines: 'v1/lines/search',
              assign: 'v1/companys/batch',
            },
          },
        },
        { provide: PASSENGER_COMPANY, useValue: signal(1) },
        { provide: PASSENGER_LANGUAGE, useValue: signal<'fa' | 'en'>('en') },
      ],
    })

    const fixture = TestBed.createComponent(PassengerPage)
    const http = TestBed.inject(HttpTestingController)
    fixture.detectChanges()

    const passengers = http.expectOne('/api/v1/passengers/search')
    const directions = http.expectOne('/api/v1/directions/search')
    const shifts = http.expectOne('/api/v1/shifts/get-shift')
    expect(passengers.request.method).toBe('POST')
    expect(passengers.request.body).toMatchObject({
      companyId: 1,
      hasShift: true,
      hasStation: true,
    })
    expect(directions.request.method).toBe('POST')
    expect(directions.request.body).toEqual({ companyId: 1 })
    expect(shifts.request.method).toBe('POST')
    expect(shifts.request.body).toEqual({ companyId: 1 })

    const envelope = (result: unknown) => ({ code: '2000', massage: 'OK', result })
    passengers.flush(
      envelope({
        list: [
          {
            id: 45,
            fullName: 'Ava Reed',
            mobileNumber: '09120000000',
            nationalId: '101',
            profileImage: '',
          },
        ],
      }),
    )
    directions.flush(envelope([{ id: 12, name: 'North Route', departureTime: '08:00' }]))
    shifts.flush(
      envelope([
        {
          id: 7,
          name: 'Morning',
          shiftGroupName: 'Day',
          startTime: '08:00',
          endTime: '16:00',
          orderNo: 1,
        },
      ]),
    )
    fixture.detectChanges()

    let selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>
    expect(selects[0].options[1].textContent).toContain('North Route')
    expect(selects[1].options[1].textContent).toContain('Morning')
    expect(fixture.nativeElement.textContent).toContain('Ava Reed')
    expect(fixture.nativeElement.textContent).toContain('09120000000')
    expect(
      Array.from(fixture.nativeElement.querySelectorAll('thead th')).map((cell: Element) =>
        cell.textContent?.trim(),
      ),
    ).toEqual(['', 'Passenger name', 'Mobile number'])

    selects[0].selectedIndex = 1
    selects[0].dispatchEvent(new Event('change', { bubbles: true }))
    fixture.detectChanges()
    const stations = http.expectOne('/api/v1/stations/search')
    const lines = http.expectOne('/api/v1/lines/search')
    expect(stations.request.method).toBe('POST')
    expect(stations.request.body).toEqual({ companyId: 1, directionId: 12, name: '' })
    expect(lines.request.method).toBe('POST')
    expect(lines.request.body).toEqual({ directionId: 12 })
    stations.flush(envelope([{ id: 31, name: 'Central Stop' }]))
    lines.flush(envelope([{ id: 41, name: 'Blue Line' }]))
    fixture.detectChanges()

    selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>
    for (const select of [selects[1], selects[2], selects[3]]) {
      select.selectedIndex = 1
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }
    const passengerCheckbox = fixture.nativeElement.querySelector(
      'tbody input[type="checkbox"]',
    ) as HTMLInputElement
    passengerCheckbox.checked = true
    passengerCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
    fixture.detectChanges()
    const submit = fixture.nativeElement.querySelector('button[hlmBtn]') as HTMLButtonElement
    submit.click()
    const assignment = http.expectOne('/api/v1/companys/batch')
    expect(assignment.request.method).toBe('POST')
    expect(assignment.request.body).toMatchObject({
      passengerIds: [45],
      shiftId: 7,
      stationId: 31,
      lineId: 41,
    })
    expect(assignment.request.body.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    assignment.flush(envelope(true))
    http.expectOne('/api/v1/passengers/search').flush(
      envelope({
        list: [
          {
            id: 45,
            fullName: 'Ava Reed',
            mobileNumber: '09120000000',
            nationalId: '101',
            profileImage: '',
          },
        ],
      }),
    )
    http.verify()
  })
})
