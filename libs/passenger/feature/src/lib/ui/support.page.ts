import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core'
import { BrnCalendarI18nService, type MonthLabels } from '@spartan-ng/brain/calendar'
import {
  BrnJalaliDateAdapter,
  JalaliDate as SpartanJalaliDate,
  provideDateAdapter,
} from '@spartan-ng/brain/date-time'
import { RouterLink } from '@angular/router'
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { PassengerApi, ActiveTrip } from '../passenger.api'
import {
  CreateSupportRequest,
  PassengerSupportApi,
  SupportDetails,
  SupportMessage,
  SupportTicket,
  SupportViolationType,
} from '../support.api'
import { PASSENGER_FEATURE_CONFIG } from '../passenger.routes'
import {
  currentJalaliDate,
  isBeforeOccurrenceMinimum,
  isValidOccurrenceDate,
  formatJalaliDate,
  formatServerDateTime,
  parseJalaliDate,
} from './jalali-date'
import { buildViolationReportFields, violationOptionLabel } from './support-form'

const supportTypes = [
  { id: 1, en: 'Suggestion', fa: 'پیشنهاد' },
  { id: 2, en: 'User support ticket', fa: 'تیکت کاربران' },
  { id: 3, en: 'Passenger violation report', fa: 'گزارش تخلف مسافر' },
  { id: 4, en: 'Driver violation report', fa: 'گزارش تخلف راننده' },
] as const

const jalaliMonthNamesFa = [
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
const jalaliMonthNamesEn = [
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
const jalaliWeekdayNamesFa = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']
const jalaliWeekdayNamesEn = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function localizedDigits(value: string, language: 'fa' | 'en'): string {
  return language === 'fa' ? value.replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]) : value
}

function jalaliCalendarI18n(language: () => 'fa' | 'en') {
  const months = (): MonthLabels =>
    [...(language() === 'fa' ? jalaliMonthNamesFa : jalaliMonthNamesEn)] as unknown as MonthLabels
  const weekdays = () => (language() === 'fa' ? jalaliWeekdayNamesFa : jalaliWeekdayNamesEn)
  const monthName = (month: number) => months()[month]
  const yearLabel = (year: number) => localizedDigits(String(year), language())
  return {
    formatWeekdayName: (index: number) =>
      language() === 'fa'
        ? ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'][index]
        : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][index],
    formatHeader: (month: number, year: number) => `${monthName(month)} ${yearLabel(year)}`,
    formatYear: yearLabel,
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
  selector: 'lib-passenger-support-page',
  imports: [RouterLink, HlmDatePickerImports, HlmFieldImports],
  providers: [
    provideDateAdapter(BrnJalaliDateAdapter),
    {
      provide: BrnCalendarI18nService,
      useFactory: () => {
        const service = new BrnCalendarI18nService()
        const language = inject(PASSENGER_FEATURE_CONFIG).language
        service.use(jalaliCalendarI18n(language))
        return service
      },
    },
  ],
  template: `
    <div class="page-head support-intro">
      <span class="support-mark" aria-hidden="true">{{ fa() ? '؟' : '?' }}</span>
      <div class="support-intro-copy">
        <span class="support-kicker">{{ fa() ? 'مرکز پشتیبانی' : 'PASSENGER CARE' }}</span>
        <h1>{{ fa() ? 'راهنمایی و پشتیبانی' : 'Help and support' }}</h1>
        <p>
          {{
            fa()
              ? 'ثبت و پیگیری درخواست‌های پشتیبانی'
              : 'Create and follow up on your support requests'
          }}
        </p>
      </div>
    </div>

    @if (pageError()) {
      <p class="panel error" role="alert">{{ pageError() }}</p>
    }

    <section class="panel stack support-compose" aria-labelledby="support-form-heading">
      <div class="section-heading">
        <span class="section-index" aria-hidden="true">{{ fa() ? '۰۱' : '01' }}</span>
        <div>
          <span class="section-kicker">{{ fa() ? 'ارسال برای بررسی' : 'SEND FOR REVIEW' }}</span>
          <h2 id="support-form-heading">{{ fa() ? 'درخواست جدید' : 'New request' }}</h2>
        </div>
      </div>
      <label>
        {{ fa() ? 'نوع درخواست' : 'Request type' }}
        <select [value]="supportTypeId()" (change)="selectType($event)">
          @for (type of supportTypes; track type.id) {
            <option [value]="type.id">{{ fa() ? type.fa : type.en }}</option>
          }
        </select>
      </label>
      <label>
        {{ fa() ? 'موضوع' : 'Subject' }}
        <input
          maxlength="200"
          required
          [value]="subject()"
          (input)="subject.set($any($event.target).value)"
        />
      </label>
      <label>
        {{ fa() ? 'شرح درخواست' : 'Message' }}
        <textarea
          required
          [value]="body()"
          (input)="body.set($any($event.target).value)"
        ></textarea>
      </label>

      @if (isViolationReport()) {
        @if (activeTripLoading()) {
          <p role="status">{{ fa() ? 'در حال بررسی سفر فعال...' : 'Checking active trip...' }}</p>
        } @else if (activeTrip()) {
          <p class="notice">
            {{
              fa()
                ? 'در صورت ارتباط گزارش با سفر فعال، شناسه سفر به‌صورت خودکار ثبت می‌شود.'
                : 'If this report concerns your active trip, its ID will be included automatically.'
            }}
            {{ fa() ? 'شناسه سفر' : 'Trip ID' }}: {{ activeTrip()!.id }}
          </p>
        } @else {
          <p class="error trip-required" role="alert">
            {{
              fa()
                ? 'برای ثبت گزارش تخلف، داشتن سفر فعال الزامی است.'
                : 'An active trip is required to submit a violation report.'
            }}
          </p>
        }
        <label>
          {{
            supportTypeId() === 4
              ? fa()
                ? 'شناسه راننده گزارش‌شده'
                : 'Reported driver ID'
              : fa()
                ? 'شناسه مسافر گزارش‌شده'
                : 'Reported passenger ID'
          }}
          <input
            type="number"
            min="3"
            [value]="
              supportTypeId() === 4 && activeTrip() ? activeTrip()!.driverId : reportedPersonId()
            "
            [readonly]="supportTypeId() === 4 && !!activeTrip()"
            (input)="reportedPersonId.set($any($event.target).value)"
          />
        </label>
        <fieldset class="date-picker">
          <legend>
            {{ fa() ? 'زمان وقوع (تقویم شمسی)' : 'Occurrence date and time' }}
          </legend>
          <div hlmField>
            <label hlmFieldLabel for="support-occurred-date">
              {{ fa() ? 'تاریخ شمسی' : 'Jalali date' }}
            </label>
            <hlm-date-picker
              captionLayout="dropdown"
              [attr.dir]="fa() ? 'rtl' : 'ltr'"
              [date]="selectedJalaliDate()"
              [defaultFocusedDate]="defaultFocusedDate"
              [minDate]="minimumDate"
              [formatDate]="formatPickerDate"
              [autoCloseOnSelect]="true"
              (dateChange)="selectJalaliDate($event)"
            >
              <hlm-date-picker-input
                inputId="support-occurred-date"
                [placeholder]="fa() ? '۱۴۰۵/۰۸/۲۷' : '1405/08/27'"
                [parseDate]="parsePickerDate"
                [formatInputDate]="formatPickerDate"
                [forceInvalid]="showDateError()"
                [calendarAriaLabel]="fa() ? 'باز کردن تقویم شمسی' : 'Open Jalali calendar'"
                [clearAriaLabel]="fa() ? 'پاک کردن تاریخ' : 'Clear date'"
                showClear
              />
            </hlm-date-picker>
            <p hlmFieldDescription>
              {{
                fa()
                  ? 'سال، ماه و روز را از تقویم شمسی انتخاب کنید یا تاریخ را وارد کنید.'
                  : 'Choose a Jalali year, month, and day, or type the date.'
              }}
            </p>
            @if (showDateError()) {
              <hlm-field-error>{{ dateError() }}</hlm-field-error>
            }
          </div>
          <label>
            {{ fa() ? 'ساعت' : 'Time' }}
            <input
              type="time"
              required
              [value]="occurredTime()"
              [attr.aria-invalid]="showTimeError() ? 'true' : null"
              [attr.aria-describedby]="showTimeError() ? 'jalali-time-error' : null"
              (input)="setOccurredTime($any($event.target).value)"
              (blur)="timeTouched.set(true)"
            />
          </label>
          @if (showTimeError()) {
            <p id="jalali-time-error" class="error field-error" role="alert">{{ timeError() }}</p>
          }
        </fieldset>
        @if (violationTypesLoading()) {
          <p role="status">
            {{ fa() ? 'در حال بارگذاری انواع تخلف...' : 'Loading violation types...' }}
          </p>
        } @else if (violationTypes().length) {
          <fieldset class="stack">
            <legend>{{ fa() ? 'انواع تخلف' : 'Violation types' }}</legend>
            @for (violation of violationTypes(); track violation.id) {
              <label class="choice">
                <input
                  type="checkbox"
                  [checked]="selectedViolationIds().has(violation.id)"
                  (change)="toggleViolation(violation.id, $event)"
                />
                <span>{{ violationOptionLabel(violation) }}</span>
              </label>
            }
          </fieldset>
        } @else {
          <p class="notice">
            {{
              fa()
                ? 'نوع تخلفی دریافت نشد؛ امکان ارسال گزارش وجود ندارد.'
                : 'No violation types were returned; this report cannot be submitted.'
            }}
          </p>
        }
      }

      @if (formError()) {
        <p class="error" role="alert">{{ formError() }}</p>
      }
      <div class="actions">
        <button
          class="primary"
          type="button"
          [disabled]="submitting() || !canSubmit()"
          (click)="submit()"
        >
          {{
            submitting()
              ? fa()
                ? 'در حال ارسال...'
                : 'Sending...'
              : fa()
                ? 'ارسال درخواست'
                : 'Submit request'
          }}
        </button>
      </div>
    </section>

    <section class="panel stack support-history" aria-labelledby="support-history-heading">
      <div class="section-heading history-heading">
        <span class="section-index" aria-hidden="true">{{ fa() ? '۰۲' : '02' }}</span>
        <div>
          <span class="section-kicker">{{
            fa() ? 'پیگیری گفتگوها' : 'TRACK YOUR CONVERSATIONS'
          }}</span>
          <h2 id="support-history-heading">{{ fa() ? 'درخواست‌های من' : 'My requests' }}</h2>
        </div>
      </div>
      @if (ticketsLoading()) {
        <p role="status">{{ fa() ? 'در حال دریافت درخواست‌ها...' : 'Loading requests...' }}</p>
      } @else if (!tickets().length) {
        <p>{{ fa() ? 'درخواستی ثبت نشده است.' : 'No support requests yet.' }}</p>
      } @else {
        <ul class="ticket-list">
          @for (ticket of tickets(); track ticket.id) {
            <li>
              <button class="ticket-button" type="button" (click)="openTicket(ticket)">
                <span>{{ ticket.subject }}</span>
                <small>
                  {{ typeLabel(ticket.supportTypeId) }} ·
                  {{ formatServerDate(ticket.requestDate) }} ·
                  {{
                    ticket.isAnswered
                      ? fa()
                        ? 'پاسخ داده شده'
                        : 'Answered'
                      : fa()
                        ? 'در انتظار پاسخ'
                        : 'Awaiting response'
                  }}
                </small>
              </button>
            </li>
          }
        </ul>
      }
      @if (ticketError()) {
        <p class="error" role="alert">{{ ticketError() }}</p>
        <button class="secondary" type="button" (click)="loadTickets()">
          {{ fa() ? 'تلاش دوباره' : 'Retry' }}
        </button>
      }

      @if (selectedTicket(); as ticket) {
        <article class="ticket-detail stack">
          <h3>{{ ticket.subject }}</h3>
          <p>
            {{ typeLabel(ticket.supportTypeId) }} ·
            {{
              ticket.isAnswered
                ? fa()
                  ? 'پاسخ داده شده'
                  : 'Answered'
                : fa()
                  ? 'در انتظار پاسخ'
                  : 'Awaiting response'
            }}
          </p>
          @for (caseFile of ticket.caseFiles; track caseFile.tripId) {
            <p class="notice">
              {{ fa() ? 'سفر' : 'Trip' }} #{{ caseFile.tripId }}
              @if (caseFile.fullName) {
                · {{ caseFile.fullName }}
              }
              @for (violation of caseFile.violations; track violation.id) {
                · {{ violation.title }}
              }
            </p>
          }
          @if (messagesLoading()) {
            <p role="status">{{ fa() ? 'در حال بارگذاری گفتگو...' : 'Loading conversation...' }}</p>
          } @else {
            <ol class="messages">
              @for (message of messages(); track $index) {
                <li [class.answer]="message.isAnswer">
                  <strong>{{
                    message.isAnswer ? (fa() ? 'پشتیبانی' : 'Support') : fa() ? 'شما' : 'You'
                  }}</strong>
                  <p>{{ message.body }}</p>
                </li>
              }
            </ol>
          }
          @if (conversationError()) {
            <p class="error" role="alert">{{ conversationError() }}</p>
          }
          <label>
            {{ fa() ? 'پیام پیگیری' : 'Follow-up message' }}
            <textarea
              [value]="replyBody()"
              (input)="replyBody.set($any($event.target).value)"
            ></textarea>
          </label>
          <button
            class="secondary"
            type="button"
            [disabled]="replying() || !replyBody().trim()"
            (click)="sendReply()"
          >
            {{
              replying()
                ? fa()
                  ? 'در حال ارسال...'
                  : 'Sending...'
                : fa()
                  ? 'ارسال پیام'
                  : 'Send message'
            }}
          </button>
        </article>
      }
    </section>

    <div class="actions">
      <a class="secondary" routerLink="/passenger/home">{{
        fa() ? 'بازگشت به خانه' : 'Back to home'
      }}</a>
    </div>
  `,
  styles: [
    `
      .support-history {
        margin-top: 1rem;
      }
      .page-head h1 {
        font-size: clamp(1.5rem, 3vw, 1.75rem);
        line-height: 1.35;
      }
      .support-intro {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.15rem;
        border-inline-start: 4px solid var(--primary);
        border-radius: 0.7rem;
        background: var(--muted);
      }
      .support-mark {
        display: grid;
        width: 2.75rem;
        height: 2.75rem;
        flex: 0 0 2.75rem;
        place-items: center;
        border-radius: 50%;
        background: var(--primary);
        color: var(--primary-foreground);
        font-size: 1.3rem;
        font-weight: 700;
      }
      .support-intro-copy {
        min-width: 0;
      }
      .support-intro-copy h1 {
        margin: 0.15rem 0 0.2rem;
      }
      .support-kicker,
      .section-kicker {
        display: block;
        color: var(--muted-foreground);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.09em;
      }
      .support-compose {
        border-block-start: 3px solid var(--primary);
      }
      .section-heading {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding-block-end: 0.8rem;
        border-block-end: 1px solid var(--border);
      }
      .section-heading h2 {
        margin: 0.15rem 0 0;
      }
      .section-index {
        display: grid;
        width: 2.25rem;
        height: 2.25rem;
        flex: 0 0 2.25rem;
        place-items: center;
        border: 1px solid var(--border);
        border-radius: 0.55rem;
        color: var(--primary);
        font-size: 0.8rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .history-heading .section-index {
        background: var(--muted);
      }
      .page-head p {
        font-size: 0.95rem;
        line-height: 1.6;
      }
      .stack > h2 {
        margin: 0;
        font-size: 1.25rem;
        line-height: 1.4;
      }
      .date-picker {
        display: grid;
        gap: 0.75rem;
        border: 1px solid var(--border);
        border-radius: 0.7rem;
        padding: 1rem;
      }
      .date-picker hlm-date-picker {
        width: 100%;
      }
      .field-error {
        margin: -0.35rem 0 0;
        font-size: 0.875rem;
      }
      .trip-required {
        margin: 0;
      }
      .choice {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-weight: 400;
      }
      :host label {
        font-size: 0.95rem;
        line-height: 1.55;
      }
      .choice input {
        width: 2rem;
        height: 2rem;
        min-height: 2rem;
        flex: 0 0 2rem;
        accent-color: var(--primary);
      }
      fieldset {
        border: 1px solid var(--border);
        border-radius: 0.7rem;
        padding: 1rem;
      }
      .ticket-list,
      .messages {
        display: grid;
        gap: 0.65rem;
        padding: 0;
        list-style: none;
      }
      .ticket-button {
        display: grid;
        width: 100%;
        gap: 0.3rem;
        padding: 0.8rem;
        text-align: start;
        border: 1px solid var(--border);
        border-radius: 0.65rem;
        background: var(--background);
        color: var(--foreground);
        cursor: pointer;
      }
      .ticket-button small {
        color: var(--muted-foreground);
      }
      .ticket-detail {
        border-top: 1px solid var(--border);
        padding-top: 1rem;
      }
      .messages li {
        border: 1px solid var(--border);
        border-radius: 0.7rem;
        padding: 0.8rem;
      }
      .messages li.answer {
        border-inline-start: 3px solid var(--primary);
      }
      .messages p {
        margin-bottom: 0;
        white-space: pre-wrap;
      }
      @media (max-width: 700px) {
        .support-history {
          padding: 1rem;
        }
      }
    `,
  ],
  styleUrl: './passenger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerSupportPage {
  private readonly api = inject(PassengerSupportApi)
  private readonly passengerApi = inject(PassengerApi)
  private readonly config = inject(PASSENGER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')
  protected readonly supportTypes = supportTypes
  protected readonly violationOptionLabel = violationOptionLabel
  protected readonly supportTypeId = signal(2)
  protected readonly subject = signal('')
  protected readonly body = signal('')
  protected readonly reportedPersonId = signal('')
  protected readonly occurredDate = signal('')
  protected readonly occurredTime = signal('')
  protected readonly dateTouched = signal(false)
  protected readonly timeTouched = signal(false)
  protected readonly activeTripLoading = signal(true)
  protected readonly minimumDate = new SpartanJalaliDate(1131, 10, 12)
  protected readonly defaultFocusedDate = (() => {
    const current = currentJalaliDate()
    return new SpartanJalaliDate(current.year, current.month, current.day)
  })()
  protected readonly selectedJalaliDate = computed(() => {
    const selected = parseJalaliDate(this.occurredDate())
    return selected ? new SpartanJalaliDate(selected.year, selected.month, selected.day) : undefined
  })
  protected readonly formatPickerDate = (date: SpartanJalaliDate): string =>
    formatJalaliDate({ year: date.year, month: date.month, day: date.day }, this.fa())
  protected readonly parsePickerDate = (value: string): SpartanJalaliDate | null => {
    const parsed = parseJalaliDate(value)
    return parsed ? new SpartanJalaliDate(parsed.year, parsed.month, parsed.day) : null
  }
  protected readonly activeTrip = signal<ActiveTrip | null>(null)
  protected readonly violationTypes = signal<SupportViolationType[]>([])
  protected readonly selectedViolationIds = signal<ReadonlySet<number>>(new Set())
  protected readonly tickets = signal<SupportTicket[]>([])
  protected readonly selectedTicket = signal<SupportDetails | null>(null)
  protected readonly messages = signal<SupportMessage[]>([])
  protected readonly pageError = signal('')
  protected readonly formError = signal('')
  protected readonly ticketError = signal('')
  protected readonly conversationError = signal('')
  protected readonly ticketsLoading = signal(true)
  protected readonly violationTypesLoading = signal(false)
  protected readonly submitting = signal(false)
  protected readonly messagesLoading = signal(false)
  protected readonly replying = signal(false)
  protected readonly replyBody = signal('')
  protected readonly isViolationReport = computed(
    () => this.supportTypeId() === 3 || this.supportTypeId() === 4,
  )
  protected readonly canSubmit = computed(() => {
    if (!this.subject().trim() || this.subject().trim().length > 200 || !this.body().trim())
      return false
    if (!this.isViolationReport()) return true
    const reportedId =
      this.supportTypeId() === 4 && this.activeTrip()
        ? this.activeTrip()!.driverId
        : Number(this.reportedPersonId())
    const violations = [...this.selectedViolationIds()]
    return Boolean(
      this.activeTrip() &&
      reportedId &&
      reportedId > 2 &&
      isValidOccurrenceDate(this.occurredDate()) &&
      /^\d{2}:\d{2}$/.test(this.occurredTime()) &&
      Number(this.occurredTime().slice(0, 2)) <= 23 &&
      Number(this.occurredTime().slice(3, 5)) <= 59 &&
      violations.length > 0 &&
      violations.every(id => Number.isSafeInteger(id) && id > 0) &&
      violations.join(',').length <= 100 &&
      !this.violationTypesLoading() &&
      this.violationTypes().length > 0,
    )
  })

  constructor() {
    afterNextRender(() => {
      void this.loadTickets()
      void this.passengerApi
        .activeTrip()
        .then(
          trip => this.activeTrip.set(trip),
          () =>
            this.pageError.set(
              this.fa() ? 'دریافت سفر فعال ناموفق بود.' : 'Could not load the active trip.',
            ),
        )
        .finally(() => this.activeTripLoading.set(false))
    })
  }

  protected typeLabel(id: number): string {
    const item = supportTypes.find(type => type.id === id)
    return item ? (this.fa() ? item.fa : item.en) : String(id)
  }

  protected formatServerDate(value: string): string {
    return formatServerDateTime(value, this.fa())
  }

  protected selectJalaliDate(date: SpartanJalaliDate | null): void {
    this.occurredDate.set(
      date
        ? formatJalaliDate({ year: date.year, month: date.month, day: date.day }, this.fa())
        : '',
    )
    this.dateTouched.set(true)
  }

  protected dateError(): string {
    if (!this.occurredDate())
      return this.fa() ? 'انتخاب تاریخ شمسی الزامی است.' : 'A Jalali date is required.'
    const parsed = parseJalaliDate(this.occurredDate())
    if (parsed && isBeforeOccurrenceMinimum(parsed)) {
      return this.fa()
        ? 'تاریخ وقوع باید ۱۲ دی ۱۱۳۱ یا پس از آن باشد (۱ ژانویه ۱۷۵۳).'
        : 'Occurrence date must be 1131/10/12 Jalali or later (January 1, 1753 Gregorian).'
    }
    return this.fa() ? 'تاریخ شمسی معتبر وارد کنید.' : 'Enter a valid Jalali date.'
  }

  protected showDateError(): boolean {
    return this.dateTouched() && !isValidOccurrenceDate(this.occurredDate())
  }

  protected timeError(): string {
    return this.fa() ? 'انتخاب ساعت وقوع الزامی است.' : 'An occurrence time is required.'
  }

  protected showTimeError(): boolean {
    return this.timeTouched() && !/^([01]\d|2[0-3]):[0-5]\d$/.test(this.occurredTime())
  }

  protected setOccurredTime(value: string): void {
    this.occurredTime.set(value)
    this.timeTouched.set(true)
  }

  protected selectType(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value)
    if (!supportTypes.some(type => type.id === id)) return
    this.supportTypeId.set(id)
    this.formError.set('')
    this.reportedPersonId.set('')
    this.occurredDate.set('')
    this.occurredTime.set('')
    this.dateTouched.set(false)
    this.timeTouched.set(false)
    this.selectedViolationIds.set(new Set())
    this.violationTypes.set([])
    if (id === 3 || id === 4) void this.loadViolationTypes(id === 3 ? 1 : 2)
  }

  protected toggleViolation(id: number, event: Event): void {
    const selected = new Set(this.selectedViolationIds())
    if ((event.target as HTMLInputElement).checked) selected.add(id)
    else selected.delete(id)
    this.selectedViolationIds.set(selected)
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit() || this.submitting()) return
    this.submitting.set(true)
    this.formError.set('')
    const isReport = this.isViolationReport()
    const reportedPersonId =
      this.supportTypeId() === 4 && this.activeTrip()
        ? this.activeTrip()!.driverId
        : Number(this.reportedPersonId())
    const request: CreateSupportRequest = {
      Id: 0,
      SupportTypeId: this.supportTypeId(),
      Subject: this.subject().trim(),
      Body: this.body().trim(),
      ...(isReport
        ? {
            ...buildViolationReportFields({
              reportedPersonId,
              tripId: this.activeTrip()!.id,
              violationIds: [...this.selectedViolationIds()],
              occurredDate: this.occurredDate(),
              occurredTime: this.occurredTime(),
            }),
          }
        : {}),
    }
    try {
      const ticket = await this.api.create(request)
      this.tickets.update(items => [ticket, ...items.filter(item => item.id !== ticket.id)])
      this.subject.set('')
      this.body.set('')
      this.reportedPersonId.set('')
      this.occurredDate.set('')
      this.occurredTime.set('')
      this.selectedViolationIds.set(new Set())
      await this.openTicket(ticket)
    } catch (error) {
      this.formError.set(
        error instanceof Error
          ? error.message
          : this.fa()
            ? 'ارسال درخواست ناموفق بود.'
            : 'Could not submit the request.',
      )
    } finally {
      this.submitting.set(false)
    }
  }

  protected async loadTickets(): Promise<void> {
    this.ticketsLoading.set(true)
    this.ticketError.set('')
    const results = await Promise.allSettled(supportTypes.map(type => this.api.search(type.id)))
    const failed = results.some(result => result.status === 'rejected')
    this.tickets.set(
      results
        .flatMap(result => (result.status === 'fulfilled' ? result.value : []))
        .sort((left, right) => right.requestDate.localeCompare(left.requestDate)),
    )
    if (failed && !this.tickets().length) {
      this.ticketError.set(
        this.fa() ? 'دریافت درخواست‌ها ناموفق بود.' : 'Could not load your support requests.',
      )
    }
    this.ticketsLoading.set(false)
  }

  protected async openTicket(ticket: SupportTicket | SupportDetails): Promise<void> {
    this.selectedTicket.set(null)
    this.messages.set([])
    this.conversationError.set('')
    this.replyBody.set('')
    this.messagesLoading.set(true)
    try {
      const [details, messages] = await Promise.all([
        this.api.details(ticket.id),
        this.api.messages(ticket.id),
      ])
      this.selectedTicket.set(details)
      this.messages.set(messages)
    } catch (error) {
      this.conversationError.set(
        error instanceof Error
          ? error.message
          : this.fa()
            ? 'دریافت گفتگو ناموفق بود.'
            : 'Could not load this conversation.',
      )
    } finally {
      this.messagesLoading.set(false)
    }
  }

  protected async sendReply(): Promise<void> {
    const ticket = this.selectedTicket()
    const body = this.replyBody().trim()
    if (!ticket || !body || this.replying()) return
    this.replying.set(true)
    this.conversationError.set('')
    try {
      await this.api.reply(ticket.id, body)
      this.replyBody.set('')
      this.messages.set(await this.api.messages(ticket.id))
      await this.loadTickets()
    } catch (error) {
      this.conversationError.set(
        error instanceof Error
          ? error.message
          : this.fa()
            ? 'ارسال پیام ناموفق بود.'
            : 'Could not send the message.',
      )
    } finally {
      this.replying.set(false)
    }
  }

  private async loadViolationTypes(personTypeId: 1 | 2): Promise<void> {
    this.violationTypesLoading.set(true)
    try {
      this.violationTypes.set(await this.api.violationTypes(personTypeId))
    } catch (error) {
      this.formError.set(
        error instanceof Error
          ? error.message
          : this.fa()
            ? 'دریافت انواع تخلف ناموفق بود.'
            : 'Could not load violation types.',
      )
    } finally {
      this.violationTypesLoading.set(false)
    }
  }
}
