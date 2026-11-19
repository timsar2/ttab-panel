import {
  formatJalaliDate,
  gregorianDateToJalali,
  jalaliDateToGregorian,
  parseJalaliDate,
} from './jalali-date'

describe('shared Jalali date conversions', () => {
  it('converts a Gregorian API date to a Jalali display value', () => {
    expect(gregorianDateToJalali('2024-03-20')).toBe('۱۴۰۳/۰۱/۰۱')
    expect(gregorianDateToJalali('2024-03-20', false)).toBe('1403/01/01')
  })

  it('converts a selected Jalali date back to Gregorian API format', () => {
    expect(jalaliDateToGregorian('۱۴۰۳/۰۱/۰۱')).toBe('2024-03-20')
    expect(jalaliDateToGregorian('۱۴۰۲/۱۲/۳۰')).toBeNull()
  })

  it('formats and parses valid Jalali dates in both digit styles', () => {
    expect(formatJalaliDate({ year: 1403, month: 1, day: 1 }, false)).toBe('1403/01/01')
    expect(parseJalaliDate('۱۴۰۳/۰۱/۰۱')).toEqual({ year: 1403, month: 1, day: 1 })
    expect(parseJalaliDate('۱۴۰۲/۱۲/۳۰')).toBeNull()
  })
})
