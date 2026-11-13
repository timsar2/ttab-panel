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

  it('loads passengers, directions, and shifts and populates both selectors', () => {
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
    expect(passengers.request.method).toBe('GET')
    expect(passengers.request.body).toMatchObject({
      companyId: 1,
      hasShift: true,
      hasStation: true,
    })
    expect(directions.request.method).toBe('GET')
    expect(directions.request.body).toEqual({ companyId: 1 })
    expect(shifts.request.method).toBe('GET')
    expect(shifts.request.body).toEqual({ companyId: 1 })

    const envelope = (result: unknown) => ({ code: '2000', massage: 'OK', result })
    passengers.flush(
      envelope({ list: [{ id: 45, fullName: 'Ava Reed', nationalId: '101', profileImage: '' }] }),
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

    const selects = fixture.nativeElement.querySelectorAll(
      'select',
    ) as NodeListOf<HTMLSelectElement>
    expect(selects[0].options[1].textContent).toContain('North Route')
    expect(selects[1].options[1].textContent).toContain('Morning')
    expect(fixture.nativeElement.textContent).toContain('Ava Reed')
    http.verify()
  })
})
