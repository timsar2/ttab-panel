import { isValidJalaaliDate, toGregorian, toJalaali } from 'jalaali-js'

export interface JalaliCalendarDate {
  readonly year: number
  readonly month: number
  readonly day: number
}

export function formatJalaliDate(date: JalaliCalendarDate, persianDigits = true): string {
  const formatted = `${date.year}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`
  return persianDigits ? formatted.replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]) : formatted
}

export function parseJalaliDate(value: string): JalaliCalendarDate | null {
  const normalized = value.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized)
  if (!match) return null
  const [, year, month, day] = match
  const date = { year: Number(year), month: Number(month), day: Number(day) }
  return isValidJalaaliDate(date.year, date.month, date.day) ? date : null
}

export function gregorianDateToJalali(value: string, persianDigits = true): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match || !isValidGregorianDate(Number(match[1]), Number(match[2]), Number(match[3])))
    return ''
  try {
    const jalali = toJalaali(Number(match[1]), Number(match[2]), Number(match[3]))
    return formatJalaliDate({ year: jalali.jy, month: jalali.jm, day: jalali.jd }, persianDigits)
  } catch {
    return ''
  }
}

export function jalaliDateToGregorian(value: string): string | null {
  const date = parseJalaliDate(value)
  if (!date) return null
  const gregorian = toGregorian(date.year, date.month, date.day)
  return `${gregorian.gy}-${String(gregorian.gm).padStart(2, '0')}-${String(gregorian.gd).padStart(2, '0')}`
}

export function currentJalaliDate(): JalaliCalendarDate {
  const date = toJalaali(new Date())
  return { year: date.jy, month: date.jm, day: date.jd }
}

function isValidGregorianDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}
