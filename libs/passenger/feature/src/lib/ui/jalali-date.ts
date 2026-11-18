import { isValidJalaaliDate, toGregorian, toJalaali } from 'jalaali-js'

export interface JalaliDate {
  readonly year: number
  readonly month: number
  readonly day: number
}

export const MIN_OCCURRENCE_DATE: JalaliDate = { year: 1131, month: 10, day: 12 }

export function formatJalaliDate(date: JalaliDate, persianDigits = true): string {
  const value = `${date.year}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`
  return persianDigits ? value.replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]) : value
}

export function parseJalaliDate(value: string): JalaliDate | null {
  const normalized = value.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized)
  if (!match) return null
  const [, year, month, day] = match
  const result = { year: Number(year), month: Number(month), day: Number(day) }
  return isValidJalaaliDate(result.year, result.month, result.day) ? result : null
}

export function gregorianDateToJalali(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match || !isValidGregorianDate(Number(match[1]), Number(match[2]), Number(match[3])))
    return ''
  try {
    const converted = toJalaali(Number(match[1]), Number(match[2]), Number(match[3]))
    return formatJalaliDate({ year: converted.jy, month: converted.jm, day: converted.jd })
  } catch {
    return ''
  }
}

export function formatServerDateTime(value: string, persianDigits: boolean): string {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|([+-])(\d{2}):(\d{2}))?$/.exec(
      value,
    )
  if (
    !match ||
    !isValidGregorianDate(Number(match[1]), Number(match[2]), Number(match[3])) ||
    Number(match[4]) > 23 ||
    Number(match[5]) > 59 ||
    (match[6] !== undefined && Number(match[6]) > 59) ||
    (match[8] !== undefined &&
      (Number(match[9]) > 14 ||
        Number(match[10]) > 59 ||
        (Number(match[9]) === 14 && Number(match[10]) !== 0)))
  )
    return unavailableDate(persianDigits)
  let jalali: ReturnType<typeof toJalaali>
  try {
    jalali = toJalaali(Number(match[1]), Number(match[2]), Number(match[3]))
  } catch {
    return unavailableDate(persianDigits)
  }
  const date = formatJalaliDate(
    { year: jalali.jy, month: jalali.jm, day: jalali.jd },
    persianDigits,
  )
  const result = `${date} · ${match[4]}:${match[5]}`
  return persianDigits ? result.replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]) : result
}

export function jalaliDateTimeToGregorian(value: string, time: string): string {
  const date = parseJalaliDate(value)
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!date || !match) throw new Error('Choose a valid Jalali date and time.')
  if (isBeforeOccurrenceMinimum(date)) {
    throw new Error('Occurrence date must be on or after 1753-01-01.')
  }
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) throw new Error('Choose a valid Jalali date and time.')
  const gregorian = toGregorian(date.year, date.month, date.day)
  return `${gregorian.gy}-${String(gregorian.gm).padStart(2, '0')}-${String(gregorian.gd).padStart(2, '0')}T${match[1]}:${match[2]}:00`
}

export function isValidOccurrenceDate(value: string): boolean {
  const date = parseJalaliDate(value)
  return !!date && !isBeforeOccurrenceMinimum(date)
}

export function isBeforeOccurrenceMinimum(date: JalaliDate): boolean {
  if (
    date.year < MIN_OCCURRENCE_DATE.year ||
    (date.year === MIN_OCCURRENCE_DATE.year && date.month < MIN_OCCURRENCE_DATE.month)
  )
    return true
  if (date.year > MIN_OCCURRENCE_DATE.year || date.month > MIN_OCCURRENCE_DATE.month) return false
  return date.day < MIN_OCCURRENCE_DATE.day
}

function isValidGregorianDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

function unavailableDate(persianDigits: boolean): string {
  return persianDigits ? 'نامشخص' : 'Unavailable'
}

export function currentJalaliDate(): JalaliDate {
  const date = toJalaali(new Date())
  return { year: date.jy, month: date.jm, day: date.jd }
}
