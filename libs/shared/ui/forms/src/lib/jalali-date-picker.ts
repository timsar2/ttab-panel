import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core'
import { BrnCalendarI18nService, type MonthLabels } from '@spartan-ng/brain/calendar'
import {
  BrnJalaliDateAdapter,
  JalaliDate as SpartanJalaliDate,
  provideDateAdapter,
} from '@spartan-ng/brain/date-time'
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker'
import {
  currentJalaliDate,
  formatJalaliDate,
  gregorianDateToJalali,
  jalaliDateToGregorian,
  parseJalaliDate,
} from './jalali-date'

const jalaliMonthsFa = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const
const jalaliMonthsEn = [
  'Farvardin',
  'Ordibehesht',
  'Khordad',
  'Tir',
  'Mordad',
  'Shahrivar',
  'Mehr',
  'Aban',
  'Azar',
  'Dey',
  'Bahman',
  'Esfand',
] as const
const weekdaysFa = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']
const weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function jalaliCalendarI18n(language: () => 'fa' | 'en') {
  const months = (): MonthLabels =>
    [...(language() === 'fa' ? jalaliMonthsFa : jalaliMonthsEn)] as unknown as MonthLabels
  const weekdays = () => (language() === 'fa' ? weekdaysFa : weekdaysEn)
  const localizedDigits = (value: string) =>
    language() === 'fa' ? value.replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]) : value
  const monthName = (month: number) => months()[month]
  return {
    formatWeekdayName: (index: number) =>
      language() === 'fa'
        ? ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'][index]
        : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][index],
    formatHeader: (month: number, year: number) =>
      `${monthName(month)} ${localizedDigits(String(year))}`,
    formatYear: (year: number) => localizedDigits(String(year)),
    formatMonth: monthName,
    labelPrevious: () => (language() === 'fa' ? 'ماه قبل' : 'Previous month'),
    labelNext: () => (language() === 'fa' ? 'ماه بعد' : 'Next month'),
    labelWeekday: (index: number) => weekdays()[index],
    months,
    years: (startYear?: number, endYear?: number) => {
      const minYear = startYear ?? 1131
      const maxYear = endYear ?? currentJalaliDate().year + 10
      return Array.from(
        { length: Math.max(0, maxYear - minYear + 1) },
        (_, index) => minYear + index,
      )
    },
    firstDayOfWeek: () => 6 as const,
  }
}

@Component({
  selector: 'lib-jalali-date-picker',
  imports: [HlmDatePickerImports],
  providers: [
    provideDateAdapter(BrnJalaliDateAdapter),
    {
      provide: BrnCalendarI18nService,
      useFactory: () => new BrnCalendarI18nService(),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <hlm-date-picker
      captionLayout="dropdown"
      [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'"
      [date]="selectedJalaliDate()"
      [defaultFocusedDate]="defaultFocusedDate"
      [formatDate]="formatPickerDate"
      [autoCloseOnSelect]="true"
      [disabled]="disabled()"
      (dateChange)="selectJalaliDate($event)"
    >
      <hlm-date-picker-input
        [inputId]="inputId()"
        [placeholder]="language() === 'fa' ? '۱۴۰۵/۰۸/۲۷' : '1405/08/27'"
        [parseDate]="parsePickerDate"
        [formatInputDate]="formatPickerDate"
        [calendarAriaLabel]="language() === 'fa' ? 'باز کردن تقویم شمسی' : 'Open Jalali calendar'"
        [clearAriaLabel]="language() === 'fa' ? 'پاک کردن تاریخ' : 'Clear date'"
        showClear
      />
    </hlm-date-picker>
  `,
})
export class JalaliDatePicker {
  readonly value = input<string | null>(null)
  readonly valueChange = output<string | null>()
  readonly language = input<'fa' | 'en'>('fa')
  readonly inputId = input('jalali-date')
  readonly disabled = input(false)
  private readonly calendarI18n = inject(BrnCalendarI18nService)

  constructor() {
    effect(() => this.calendarI18n.use(jalaliCalendarI18n(() => this.language())))
  }

  protected readonly selectedJalaliDate = computed(() => {
    const value = this.value()
    const formatted = value ? gregorianDateToJalali(value, false) : ''
    const parsed = formatted ? parseJalaliDate(formatted) : null
    return parsed ? new SpartanJalaliDate(parsed.year, parsed.month, parsed.day) : undefined
  })
  protected readonly defaultFocusedDate = (() => {
    const current = currentJalaliDate()
    return new SpartanJalaliDate(current.year, current.month, current.day)
  })()
  protected readonly formatPickerDate = (date: SpartanJalaliDate): string =>
    formatJalaliDate(
      { year: date.year, month: date.month, day: date.day },
      this.language() === 'fa',
    )
  protected readonly parsePickerDate = (value: string): SpartanJalaliDate | null => {
    const parsed = parseJalaliDate(value)
    return parsed ? new SpartanJalaliDate(parsed.year, parsed.month, parsed.day) : null
  }

  protected selectJalaliDate(date: SpartanJalaliDate | null) {
    if (!date) {
      this.valueChange.emit(null)
      return
    }
    this.valueChange.emit(
      jalaliDateToGregorian(
        formatJalaliDate({ year: date.year, month: date.month, day: date.day }, false),
      ),
    )
  }
}
