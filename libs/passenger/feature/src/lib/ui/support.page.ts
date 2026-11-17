import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core'
import { RouterLink } from '@angular/router'
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

const supportTypes = [
  { id: 1, en: 'Suggestion', fa: 'پیشنهاد' },
  { id: 2, en: 'User support ticket', fa: 'تیکت کاربران' },
  { id: 3, en: 'Passenger violation report', fa: 'گزارش تخلف مسافر' },
  { id: 4, en: 'Driver violation report', fa: 'گزارش تخلف راننده' },
] as const

@Component({
  selector: 'lib-passenger-support-page',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <h1>{{ fa() ? 'راهنمایی و پشتیبانی' : 'Help and support' }}</h1>
      <p>
        {{
          fa()
            ? 'ثبت و پیگیری درخواست‌های پشتیبانی'
            : 'Create and follow up on your support requests'
        }}
      </p>
    </div>

    @if (pageError()) {
      <p class="panel error" role="alert">{{ pageError() }}</p>
    }

    <section class="panel stack" aria-labelledby="support-form-heading">
      <h2 id="support-form-heading">{{ fa() ? 'درخواست جدید' : 'New request' }}</h2>
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
        @if (activeTrip()) {
          <p class="notice">
            {{
              fa()
                ? 'گزارش باید به سفر فعال شما مربوط باشد.'
                : 'Reports must refer to your active trip.'
            }}
            {{ fa() ? 'شناسه سفر' : 'Trip ID' }}: {{ activeTrip()!.id }}
          </p>
          @if (supportTypeId() === 4) {
            <label>
              {{ fa() ? 'راننده گزارش‌شده' : 'Reported driver' }}
              <input [value]="activeTrip()!.driverId" readonly />
            </label>
          } @else {
            <label>
              {{ fa() ? 'شناسه مسافر گزارش‌شده' : 'Reported passenger ID' }}
              <input
                type="number"
                min="3"
                [value]="reportedPersonId()"
                (input)="reportedPersonId.set($any($event.target).value)"
              />
            </label>
          }
          <label>
            {{ fa() ? 'زمان وقوع' : 'Occurrence date and time' }}
            <input
              type="datetime-local"
              [value]="occurredAt()"
              (input)="occurredAt.set($any($event.target).value)"
            />
          </label>
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
                  <span
                    >{{ violation.title }}
                    @if (violation.code) {
                      · {{ violation.code }}
                    }
                  </span>
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
        } @else {
          <p class="notice">
            {{
              fa()
                ? 'برای ثبت گزارش تخلف، ابتدا باید سفر فعال داشته باشید.'
                : 'An active trip is required to submit a violation report.'
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
      <h2 id="support-history-heading">{{ fa() ? 'درخواست‌های من' : 'My requests' }}</h2>
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
      .choice {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-weight: 400;
      }
      .choice input {
        width: auto;
        min-height: auto;
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
  protected readonly supportTypeId = signal(2)
  protected readonly subject = signal('')
  protected readonly body = signal('')
  protected readonly reportedPersonId = signal('')
  protected readonly occurredAt = signal('')
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
      this.supportTypeId() === 4 ? this.activeTrip()?.driverId : Number(this.reportedPersonId())
    const violations = [...this.selectedViolationIds()]
    return Boolean(
      this.activeTrip() &&
      reportedId &&
      reportedId > 2 &&
      this.occurredAt() &&
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
      void this.passengerApi.activeTrip().then(
        trip => this.activeTrip.set(trip),
        () =>
          this.pageError.set(
            this.fa() ? 'دریافت سفر فعال ناموفق بود.' : 'Could not load the active trip.',
          ),
      )
    })
  }

  protected typeLabel(id: number): string {
    const item = supportTypes.find(type => type.id === id)
    return item ? (this.fa() ? item.fa : item.en) : String(id)
  }

  protected selectType(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value)
    if (!supportTypes.some(type => type.id === id)) return
    this.supportTypeId.set(id)
    this.formError.set('')
    this.reportedPersonId.set('')
    this.occurredAt.set('')
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
      this.supportTypeId() === 4 ? this.activeTrip()?.driverId : Number(this.reportedPersonId())
    const request: CreateSupportRequest = {
      Id: 0,
      SupportTypeId: this.supportTypeId(),
      Subject: this.subject().trim(),
      Body: this.body().trim(),
      ...(isReport
        ? {
            ReportedPersonId: reportedPersonId,
            TripId: this.activeTrip()!.id,
            ViolationTypeIds: [...this.selectedViolationIds()].join(','),
            OccureAt: this.occurredAt(),
          }
        : {}),
    }
    try {
      const ticket = await this.api.create(request)
      this.tickets.update(items => [ticket, ...items.filter(item => item.id !== ticket.id)])
      this.subject.set('')
      this.body.set('')
      this.reportedPersonId.set('')
      this.occurredAt.set('')
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
