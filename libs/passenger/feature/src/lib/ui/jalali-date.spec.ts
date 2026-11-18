import { isLeapJalaaliYear, jalaaliMonthLength, toGregorian, toJalaali } from 'jalaali-js'
import { BrnJalaliDateAdapter, JalaliDate as SpartanJalaliDate } from '@spartan-ng/brain/date-time'
import {
  formatJalaliDate,
  formatServerDateTime,
  gregorianDateToJalali,
  jalaliDateTimeToGregorian,
  isValidOccurrenceDate,
  parseJalaliDate,
} from './jalali-date'

describe('Jalali support dates', () => {
  it('uses Spartan’s Jalali date adapter for year, month, and day values', () => {
    const adapter = new BrnJalaliDateAdapter()
    const selected = new SpartanJalaliDate(1403, 1, 1)

    expect(adapter.getYear(selected)).toBe(1403)
    expect(adapter.getMonth(selected)).toBe(0)
    expect(adapter.getDate(selected)).toBe(1)
    expect(selected.toString()).toBe('1403/01/01')
  })

  it('converts known Gregorian and Jalali dates both ways', () => {
    expect(toJalaali(2024, 3, 20)).toEqual({ jy: 1403, jm: 1, jd: 1 })
    expect(toGregorian(1403, 1, 1)).toEqual({ gy: 2024, gm: 3, gd: 20 })
  })

  it('validates leap years and month boundaries', () => {
    expect(isLeapJalaaliYear(1399)).toBe(true)
    expect(jalaaliMonthLength(1402, 6)).toBe(31)
    expect(jalaaliMonthLength(1402, 7)).toBe(30)
    expect(jalaaliMonthLength(1402, 12)).toBe(29)
    expect(jalaaliMonthLength(1399, 12)).toBe(30)
    expect(parseJalaliDate('۱۴۰۲/۱۲/۳۰')).toBeNull()
  })

  it('keeps local wall-clock time when mapping a Jalali choice to backend Gregorian', () => {
    expect(jalaliDateTimeToGregorian('۱۴۰۳/۰۱/۰۱', '08:30')).toBe('2024-03-20T08:30:00')
  })

  it('enforces the backend minimum occurrence date', () => {
    expect(isValidOccurrenceDate('۱۱۳۱/۱۰/۱۱')).toBe(false)
    expect(isValidOccurrenceDate('۱۱۳۱/۱۰/۱۲')).toBe(true)
    expect(jalaliDateTimeToGregorian('۱۱۳۱/۱۰/۱۲', '00:00')).toBe('1753-01-01T00:00:00')
    expect(() => jalaliDateTimeToGregorian('۱۱۳۱/۱۰/۱۱', '08:30')).toThrow(
      'Occurrence date must be on or after 1753-01-01.',
    )
  })

  it('formats Gregorian server ISO timestamps as Jalali calendar dates', () => {
    expect(gregorianDateToJalali('2024-03-20T23:30:00Z')).toBe('۱۴۰۳/۰۱/۰۱')
    expect(formatJalaliDate({ year: 1403, month: 1, day: 1 }, false)).toBe('1403/01/01')
    expect(formatServerDateTime('2024-03-20T08:35:00Z', true)).toBe('۱۴۰۳/۰۱/۰۱ · ۰۸:۳۵')
    expect(formatServerDateTime('2024-03-20T08:35:00Z', false)).toBe('1403/01/01 · 08:35')
    expect(formatServerDateTime('2024-02-30T08:35:00Z', true)).toBe('نامشخص')
    expect(formatServerDateTime('not-a-server-date', false)).toBe('Unavailable')
    expect(gregorianDateToJalali('2024-02-30T00:00:00Z')).toBe('')
  })
})
