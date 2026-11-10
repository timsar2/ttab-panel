import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormField, disabled, form, required, submit, validate } from '@angular/forms/signals'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import {
  DepartureTimeDraft,
  DepartureTimeId,
  DepartureTimesApi,
  DepartureTimesStore,
  departureTimeId,
  departureTimeInput,
} from '@org/transport-departure-times-data-access'
import { ConfirmDialog, SignalInput } from '@org/ui-forms'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { DEPARTURE_TIME_MANAGE } from '../departure-time.routes'

@Component({
  selector: 'lib-departure-time-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    RouterLink,
    ConfirmDialog,
    SignalInput,
    HlmAlertImports,
    HlmButton,
    HlmFieldImports,
  ],
  providers: [DepartureTimesStore],
  host: { class: 'block min-w-0 p-4 md:p-8', '(window:beforeunload)': 'beforeUnload($event)' },
  template: `
    <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">
        {{ id() === null ? 'Create departure time' : 'Edit departure time' }}
      </h1>
      <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['.']" [relativeTo]="route.parent"
        >Back to departure times</a
      >
    </header>
    <lib-confirm-dialog
      [(open)]="leaveOpen"
      [title]="store.saving() ? 'Save in progress' : 'Discard unsaved changes?'"
      [description]="
        store.saving()
          ? 'Stay here until the save completes.'
          : 'Your unsaved changes will be lost.'
      "
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      [busy]="store.saving()"
      (confirmed)="finishLeave(true)"
      (canceled)="finishLeave(false)"
    />
    @if (id() === undefined) {
      <p role="alert">Invalid departure-time URL.</p>
    } @else if (!canWrite()) {
      <p role="alert">You do not have access to edit departure times in this company.</p>
    } @else if (id() !== null && store.detailStatus() === 'loading') {
      <p role="status">Loading departure time...</p>
    } @else if (id() !== null && store.detailStatus() === 'missing') {
      <p role="alert">Departure time not found.</p>
    } @else if (id() !== null && store.detailStatus() === 'denied') {
      <p role="alert">You do not have access to this departure time.</p>
    } @else if (id() !== null && store.detailStatus() === 'error') {
      <div hlmAlert variant="destructive" role="alert">
        <h2 hlmAlertTitle>Unable to load departure time</h2>
        <p hlmAlertDescription>{{ store.detailError()?.message }}</p>
        <button hlmBtn variant="outline" class="min-h-11" type="button" (click)="reload()">
          Retry
        </button>
      </div>
    } @else if (ready()) {
      @if (store.saveError(); as error) {
        <div hlmAlert variant="destructive" role="alert" class="mb-4">
          <h2 hlmAlertTitle>Unable to save departure time</h2>
          <p hlmAlertDescription>{{ error.message }}</p>
          @for (field of serverErrors(); track field.key) {
            <p>{{ field.messages.join(' ') }}</p>
          }
        </div>
      }
      @if (store.saveOutcome() === 'confirmed') {
        <p role="status" class="mb-4">Departure time saved.</p>
      }
      @if (store.saveOutcome() === 'unconfirmed') {
        <div hlmAlert role="alert" class="mb-4">
          <h2 hlmAlertTitle>Save returned no record</h2>
          <p hlmAlertDescription>
            The server accepted the request but did not confirm the saved record. Verify the list
            before submitting again.
          </p>
        </div>
      }
      <form
        novalidate
        class="grid max-w-2xl gap-5"
        (submit)="save($event)"
        [attr.aria-busy]="store.saving()"
      >
        <div hlmField>
          <label hlmFieldLabel for="departure-name">Name</label>
          <input
            libSignalInput
            id="departure-name"
            class="min-h-11"
            [formField]="editorForm.name"
          />
          @if (editorForm.name().touched() && editorForm.name().invalid()) {
            <hlm-field-error [forceShow]="true">
              @for (error of editorForm.name().errors(); track $index) {
                <div>{{ error.message }}</div>
              }
            </hlm-field-error>
          }
        </div>
        <div hlmField>
          <label hlmFieldLabel for="departure-time">Time value</label>
          <input
            libSignalInput
            id="departure-time"
            class="min-h-11"
            [formField]="editorForm.shiftTime"
            aria-describedby="departure-time-help"
          />
          <p hlmFieldDescription id="departure-time-help">
            Enter HH:mm, or preserve the exact stored .NET TimeSpan. This does not select a date or
            timezone.
          </p>
          @if (editorForm.shiftTime().touched() && editorForm.shiftTime().invalid()) {
            <hlm-field-error [forceShow]="true">
              @for (error of editorForm.shiftTime().errors(); track $index) {
                <div>{{ error.message }}</div>
              }
            </hlm-field-error>
          }
        </div>
        <button
          hlmBtn
          class="min-h-11 justify-self-start"
          type="submit"
          [disabled]="store.saving() || store.saveOutcome() === 'unconfirmed'"
        >
          Save departure time
        </button>
      </form>
    }
  `,
})
export class DepartureTimeEditor {
  protected readonly route = inject(ActivatedRoute)
  protected readonly store = inject(DepartureTimesStore)
  private readonly api = inject(DepartureTimesApi)
  private readonly session = inject(SessionStore)
  private readonly manage = inject(DEPARTURE_TIME_MANAGE)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly id = computed<DepartureTimeId | null | undefined>(() => {
    const value = this.params().get('id')
    if (value === null) return null
    if (!/^[1-9]\d*$/.test(value)) return undefined
    try {
      return departureTimeId(Number(value))
    } catch {
      return undefined
    }
  })
  protected readonly canWrite = computed(
    () => this.manage() && !!this.session.user() && this.api.companyId() !== null,
  )
  protected readonly ready = computed(
    () =>
      this.id() === null ||
      (this.store.detailStatus() === 'ready' && this.store.detail()?.id === this.id()),
  )
  private readonly draft = signal<DepartureTimeDraft>({ name: '', shiftTime: '' })
  private readonly submitted = signal<DepartureTimeDraft | null>(null)
  protected readonly leaveOpen = signal(false)
  private leaveDecision: ((discard: boolean) => void) | null = null
  private pendingLeave: Promise<boolean> | null = null
  protected readonly serverErrors = computed(() =>
    Object.entries(this.store.saveError()?.fieldErrors ?? {}).flatMap(([key, messages]) => {
      const field = key === 'name' || key === 'shiftTime' ? key : null
      return field && this.submitted()?.[field] !== this.draft()[field] ? [] : [{ key, messages }]
    }),
  )
  protected readonly editorForm = form(this.draft, path => {
    disabled(
      path,
      () => this.store.saving() || this.store.saveOutcome() === 'unconfirmed' || !this.canWrite(),
    )
    required(path.name, { message: 'Enter a name.' })
    validate(path.name, ({ value }) =>
      value().trim() ? null : { kind: 'required', message: 'Enter a name.' },
    )
    required(path.shiftTime, { message: 'Enter a time value.' })
    validate(path.shiftTime, ({ value }) => {
      if (!value()) return null
      try {
        departureTimeInput(value())
        return null
      } catch {
        return { kind: 'time', message: 'Enter HH:mm or an exact .NET TimeSpan.' }
      }
    })
    for (const field of ['name', 'shiftTime'] as const) {
      validate(path[field], ({ value }) => {
        if (this.submitted()?.[field] !== value()) return null
        const messages = this.store.saveError()?.fieldErrors[field]
        return messages?.length ? { kind: 'server', message: messages.join(' ') } : null
      })
    }
  })

  constructor() {
    let hydrated: DepartureTimeId | null = null
    effect(() => {
      const id = this.id()
      const allowed = this.canWrite()
      this.api.companyId()
      this.session.version()
      untracked(() => {
        hydrated = null
        this.draft.set({ name: '', shiftTime: '' })
        this.submitted.set(null)
        this.editorForm().reset()
        this.store.clear()
        this.finishLeave(false)
        if (allowed && id !== null && id !== undefined) this.store.loadDetail(id)
      })
    })
    effect(() => {
      const detail = this.store.detail()
      if (!detail || detail.id !== this.id() || detail.id === hydrated) return
      hydrated = detail.id
      untracked(() => {
        this.draft.set({ name: detail.name, shiftTime: detail.shiftTime })
        this.editorForm().reset()
      })
    })
    effect(() => {
      if (this.store.saveOutcome() !== 'confirmed' || this.store.saving()) return
      const saved = this.store.saved()
      if (!saved) return
      untracked(() => {
        this.submitted.set(null)
        this.editorForm().reset()
        if (this.leaveDecision) this.finishLeave(true)
        else if (this.id() === null)
          void this.router.navigate([saved.id, 'edit'], { relativeTo: this.route.parent })
      })
    })
    inject(DestroyRef).onDestroy(() => {
      this.finishLeave(false)
      this.draft.set({ name: '', shiftTime: '' })
      this.submitted.set(null)
    })
  }

  protected reload() {
    const id = this.id()
    if (id) this.store.loadDetail(id)
  }
  protected save(event: Event) {
    event.preventDefault()
    const id = this.id()
    if (
      !this.canWrite() ||
      !this.ready() ||
      id === undefined ||
      this.store.saving() ||
      this.store.saveOutcome() === 'unconfirmed'
    )
      return
    void submit(this.editorForm, async () => {
      const draft = { ...this.draft() }
      this.submitted.set(draft)
      this.store.save(draft, id ?? undefined)
    })
  }
  confirmLeave() {
    if (!this.canWrite() || (!this.store.saving() && !this.editorForm().dirty())) return true
    if (this.pendingLeave) return this.pendingLeave
    this.leaveOpen.set(true)
    this.pendingLeave = new Promise(resolve => {
      this.leaveDecision = resolve
    })
    return this.pendingLeave
  }
  protected finishLeave(discard: boolean) {
    this.leaveOpen.set(false)
    const resolve = this.leaveDecision
    this.leaveDecision = null
    this.pendingLeave = null
    resolve?.(discard)
  }
  protected beforeUnload(event: BeforeUnloadEvent) {
    if (this.canWrite() && (this.store.saving() || this.editorForm().dirty())) {
      event.preventDefault()
      event.returnValue = ''
    }
  }
}
