import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { FormField, disabled, form, required, submit, validate } from '@angular/forms/signals'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { SupportApi, SupportId, SupportStore } from '@org/transport-support-data-access'
import { HlmButton } from '@spartan-ng/helm/button'
import { firstValueFrom } from 'rxjs'
import { parseSupportRouteId, SUPPORT_CAN_REPLY, SUPPORT_LANGUAGE } from '../support.routes'
import { supportText, type SupportTextKey } from '../support-text'

@Component({
  selector: 'lib-support-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButton, FormField],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <a
      class="mb-6 inline-flex min-h-11 items-center underline underline-offset-4"
      [routerLink]="['../']"
      >{{ t('back') }}</a
    >
    @if (invalidId()) {
      <p role="alert">{{ t('invalidId') }}</p>
    } @else if (store.detailStatus() === 'loading') {
      <p role="status">{{ t('detailLoading') }}</p>
    } @else if (store.detailStatus() === 'denied') {
      <p role="alert">{{ t('detailDenied') }}</p>
    } @else if (store.detailStatus() === 'not-found') {
      <p role="alert">{{ t('detailMissing') }}</p>
    } @else if (store.detailStatus() === 'error') {
      <p role="alert">{{ t('detailFailed') }}</p>
    } @else if (store.detail(); as detail) {
      <header class="mb-6 rounded-xl border p-5">
        <p class="text-muted-foreground text-sm">{{ detail.supportTypeName }}</p>
        <h1 class="mt-1 text-2xl font-semibold">{{ detail.subject }}</h1>
        <dl class="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt class="text-muted-foreground text-sm">{{ t('requesterId') }}</dt>
            <dd>{{ detail.personId }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">{{ t('mobile') }}</dt>
            <dd>{{ detail.mobileNumber || '—' }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">{{ t('requestDate') }}</dt>
            <dd dir="ltr">{{ detail.requestDate }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">{{ t('status') }}</dt>
            <dd>{{ detail.isAnswered ? t('answeredOnly') : t('unansweredOnly') }}</dd>
          </div>
        </dl>
      </header>
      @if (detail.caseFile.length) {
        <section class="mb-6 rounded-xl border p-5" aria-labelledby="support-case-heading">
          <h2 id="support-case-heading" class="mb-4 text-lg font-semibold">{{ t('caseFiles') }}</h2>
          <div class="grid gap-4 md:grid-cols-2">
            @for (file of detail.caseFile; track $index) {
              <article class="bg-muted/30 rounded-lg p-4">
                <p>{{ file.fullName || '#' + file.personId }}</p>
                <p class="text-muted-foreground mt-1 text-sm">{{ t('trip') }}: {{ file.tripId }}</p>
                <ul class="mt-2 list-inside list-disc">
                  @for (violation of file.caseViolations; track violation.supportViolationTypeId) {
                    <li>
                      {{
                        violation.title || violation.code || '#' + violation.supportViolationTypeId
                      }}
                    </li>
                  }
                </ul>
              </article>
            }
          </div>
        </section>
      }
      <section class="rounded-xl border p-5" aria-labelledby="support-messages-heading">
        <h2 id="support-messages-heading" class="text-lg font-semibold">{{ t('messages') }}</h2>
        <p class="text-muted-foreground mt-1 text-sm">{{ t('messageOrder') }}</p>
        @if (store.messagesStatus() === 'loading') {
          <p class="mt-4" role="status">{{ t('detailLoading') }}</p>
        } @else if (store.messagesStatus() === 'denied') {
          <p class="mt-4" role="alert">{{ t('detailDenied') }}</p>
        } @else if (store.messagesStatus() === 'error') {
          <p class="mt-4" role="alert">{{ t('messagesFailed') }}</p>
        } @else if (store.messages(); as messages) {
          @if (!messages.length) {
            <p class="mt-4" role="status">{{ t('noMessages') }}</p>
          } @else {
            <ul class="mt-4 grid gap-3">
              @for (message of messages; track $index) {
                <li class="rounded-lg border p-4">
                  <p class="text-muted-foreground mb-2 text-xs">
                    {{ message.isAnswer ? t('response') : t('question') }}
                  </p>
                  <p class="whitespace-pre-wrap">{{ message.body }}</p>
                </li>
              }
            </ul>
          }
        }
        @if (canReply()) {
          <form class="mt-6 grid gap-3" novalidate (submit)="send($event)">
            <label class="grid gap-2 text-sm" for="support-reply">{{ t('message') }}</label>
            <textarea
              id="support-reply"
              class="bg-background min-h-32 rounded-md border p-3"
              [formField]="replyForm.body"
            ></textarea>
            @if (replyForm.body().touched() && replyForm.body().invalid()) {
              <p role="alert">{{ t('required') }}</p>
            }
            @if (sendError()) {
              <p role="alert">{{ sendError() }}</p>
            }
            @if (sent()) {
              <p role="status">{{ t('response') }}</p>
            }
            <button hlmBtn class="min-h-11 justify-self-start" type="submit" [disabled]="sending()">
              {{ sending() ? t('sending') : t('send') }}
            </button>
          </form>
        }
      </section>
    }
  `,
})
export class SupportDetailPage {
  protected readonly language = inject(SUPPORT_LANGUAGE)
  protected readonly canReply = inject(SUPPORT_CAN_REPLY)
  protected readonly store = inject(SupportStore)
  private readonly api = inject(SupportApi)
  private readonly route = inject(ActivatedRoute)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly replyModel = signal({ body: '' })
  protected readonly sending = signal(false)
  protected readonly replyForm = form(this.replyModel, schema => {
    required(schema.body)
    validate(schema.body, ({ value }) =>
      value().trim() ? null : { kind: 'required', message: 'required' },
    )
    disabled(schema.body, () => this.sending())
  })
  protected readonly sendError = signal<string | null>(null)
  protected readonly sent = signal(false)
  protected readonly invalidId = signal(false)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private currentId: SupportId | null = null

  constructor() {
    effect(() => {
      this.api.companyId()
      const id = parseSupportRouteId(this.params().get('id'))
      this.invalidId.set(id === null)
      if (id === null) {
        untracked(() => this.store.clear())
        return
      }
      this.currentId = id
      untracked(() => {
        this.replyModel.set({ body: '' })
        this.sent.set(false)
        this.store.loadDetail(id)
        this.store.loadMessages(id)
      })
    })
  }

  protected t(key: SupportTextKey): string {
    return supportText(this.language(), key)
  }
  protected async send(event: Event) {
    event.preventDefault()
    if (!this.canReply() || this.currentId === null || this.sending()) return
    submit(this.replyForm, async () => {
      const text = this.replyModel().body
      if (!text.trim()) return
      const id = this.currentId
      if (id === null) return
      this.sending.set(true)
      this.changeDetector.detectChanges()
      this.sendError.set(null)
      this.sent.set(false)
      try {
        await firstValueFrom(this.store.sendMessage(id, text))
        this.replyForm().reset()
        this.replyModel.set({ body: '' })
        this.sent.set(true)
        this.store.loadDetail(id)
        this.store.loadMessages(id)
      } catch {
        this.sendError.set(this.t('sendFailed'))
      } finally {
        this.sending.set(false)
        this.changeDetector.detectChanges()
      }
    })
  }
}
