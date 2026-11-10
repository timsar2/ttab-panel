import { HttpErrorResponse } from '@angular/common/http'
import { TransportError } from '@org/transport-http'
import {
  decodeDepartureTime,
  decodeDepartureTimeList,
  departureClock,
  departureCompanyId,
  departureTimeError,
  departureTimeId,
  departureTimeInput,
  departureTimeSpan,
  departureTimeWrite,
} from '../index'

const company = departureCompanyId(2)
const dto = { id: 7, companyId: 2, name: 'Morning', shiftTime: '08:30:01.1234567' }

describe('departure-time source adapters', () => {
  it.each([0, -1, 32768, 1.5, '2', null, NaN])('rejects nonpositive/non-short IDs: %s', value => {
    expect(() => departureCompanyId(value)).toThrow(TransportError)
    expect(() => departureTimeId(value)).toThrow(TransportError)
  })
  it.each([
    '00:00:00',
    '23:59:59.9999999',
    '08:30:01.1234567',
    '1.01:02:03',
    '-00:10:00',
    '10675199.02:48:05.4775807',
    '-10675199.02:48:05.4775808',
  ])('round trips exact TimeSpan %s without Date conversion', time => {
    expect(departureTimeSpan(time)).toBe(time)
    expect(departureTimeInput(time)).toBe(time)
    expect(decodeDepartureTime({ ...dto, shiftTime: time }).shiftTime).toBe(time)
  })
  it.each([
    '08:30',
    '24:00:00',
    '08:60:00',
    '08:00:60',
    '8:00:00',
    '08:00:00.12345678',
    '2026-11-10T08:30:00Z',
    '08:30:00+03:30',
    'P1D',
    '10675199.02:48:05.4775808',
    '-10675199.02:48:05.4775809',
    '',
    null,
  ])('rejects malformed/out-of-range wire time %s', time => {
    expect(() => departureTimeSpan(time)).toThrow(TransportError)
  })
  it('converts only deliberate minute entry, and never truncates seconds/fractions/days', () => {
    expect(departureTimeInput('08:30')).toBe('08:30:00')
    expect(departureClock(departureTimeSpan(dto.shiftTime))).toBe(dto.shiftTime)
    expect(departureClock(departureTimeSpan('1.08:30:00'))).toBeNull()
    expect(departureClock(departureTimeSpan('-00:30:00'))).toBeNull()
    expect(() => departureTimeInput('')).toThrowError(
      expect.objectContaining({ kind: 'validation' }),
    )
  })
  it('allowlists writes, omits create ID, and explicitly retains company and update identity', () => {
    const draft = {
      name: ' Morning ',
      shiftTime: '08:30',
      companyId: 9,
      id: 9,
      timezone: 'guessed',
    }
    expect(departureTimeWrite(company, draft)).toEqual({
      companyId: 2,
      name: 'Morning',
      shiftTime: '08:30:00',
    })
    expect(departureTimeWrite(company, draft, departureTimeId(7))).toEqual({
      id: 7,
      companyId: 2,
      name: 'Morning',
      shiftTime: '08:30:00',
    })
    expect(() => departureTimeWrite(company, { ...draft, name: ' ' })).toThrowError(
      expect.objectContaining({ fieldErrors: { name: ['Name is required.'] } }),
    )
  })
  it('does not claim completeness or total counts for empty or bounded lists', () => {
    expect(decodeDepartureTimeList(null, company)).toEqual({
      items: [],
      limit: 1000,
      atLimit: false,
      completeness: 'unknown',
    })
    const full = decodeDepartureTimeList(
      Array.from({ length: 1000 }, (_, i) => ({ ...dto, id: i + 1 })),
      company,
    )
    expect(full.atLimit).toBe(true)
    expect(full.completeness).toBe('unknown')
    expect(full).not.toHaveProperty('totalCount')
  })
  it.each([[dto, dto], [{ ...dto, companyId: 3 }], Array(1001).fill(dto), {}, [null]])(
    'rejects dishonest/malformed lists',
    value => {
      expect(() => decodeDepartureTimeList(value, company)).toThrow(TransportError)
    },
  )
  it('normalizes model-state fields, retains unknown errors and does not fabricate reference-conflict policy', () => {
    const error = departureTimeError(
      new HttpErrorResponse({
        status: 400,
        error: {
          errors: {
            Name: ['Required'],
            name: ['Duplicate'],
            ShiftTime: ['Time required'],
            CompanyId: ['Required'],
            Other: ['Global'],
            constructor: ['Unknown field retained'],
          },
        },
      }),
    )
    expect(error.fieldErrors).toEqual({
      name: ['Required', 'Duplicate'],
      shiftTime: ['Time required'],
      companyId: ['Required'],
      Other: ['Global'],
      constructor: ['Unknown field retained'],
    })
    const conflict = departureTimeError(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'backend-reference', massage: 'Referenced', result: null },
      }),
    )
    expect(conflict).toMatchObject({
      status: 409,
      code: 'backend-reference',
      message: 'Referenced',
    })
    expect(
      departureTimeError(
        new HttpErrorResponse({ status: 500, error: { messages: ['sensitive SQL'] } }),
      ).message,
    ).not.toContain('SQL')
  })
})
