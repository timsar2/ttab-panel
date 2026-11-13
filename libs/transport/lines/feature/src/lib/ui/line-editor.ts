import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormField, disabled, form, required, submit } from '@angular/forms/signals'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import {
  DepartureTimeId,
  DepartureTimesStore,
  departureClock,
  departureTimeId,
} from '@org/transport-departure-times-data-access'
import { LineDraft, LineId, LinesApi, LinesStore, lineId } from '@org/transport-lines-data-access'
import { RoutesStore } from '@org/transport-routes-data-access'
import { ConfirmDialog, LookupSelect } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { LINE_FEATURE, LINE_LANGUAGE, LINE_MANAGE } from '../line.routes'
import { LINE_TEXT, lineText } from '../line-text'

interface LineFormModel {
  name: string
  entranceShiftTimeId: string
  returnShiftTimeId: string
}

const emptyLine: LineFormModel = { name: '', entranceShiftTimeId: '', returnShiftTimeId: '' }

@Component({
  selector: 'lib-line-editor',
  imports: [ConfirmDialog, FormField, HlmButton, HlmFieldImports, LookupSelect, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-muted-foreground mb-1 text-sm">{{ lineText(language(), 'lines') }}</p>
          <h1 class="text-2xl font-semibold">
            {{ isNew() ? lineText(language(), 'add') : lineText(language(), 'edit') }}
          </h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <a hlmBtn variant="outline" class="min-h-11" [routerLink]="backToDirection()">{{
            lineText(language(), 'back')
          }}</a>
          @if (!isNew() && directionId()) {
            <a
              hlmBtn
              variant="outline"
              class="min-h-11"
              [routerLink]="[
                '/client',
                companyId(),
                'direction',
                'detail',
                directionId(),
                'stations',
              ]"
              >{{ language() === 'fa' ? 'ایستگاه‌ها' : 'Stations' }}</a
            >
          }
        </div>
      </header>

      @if (invalidId()) {
        <p role="alert">{{ lineText(language(), 'notFound') }}</p>
      } @else if (!hasScope()) {
        <p role="alert" class="rounded-md border p-4">{{ deniedMessage() }}</p>
      } @else if (!isNew() && store.detailStatus() === 'loading') {
        <p role="status">{{ lineText(language(), 'detailLoading') }}</p>
      } @else if (!isNew() && store.detailStatus() === 'denied') {
        <p role="alert">{{ deniedMessage() }}</p>
      } @else if (!isNew() && store.detailStatus() === 'missing') {
        <p role="alert">{{ lineText(language(), 'notFound') }}</p>
      } @else if (!isNew() && store.detailStatus() === 'error') {
        <p role="alert">{{ lineText(language(), 'failed') }}</p>
        <button hlmBtn variant="outline" type="button" (click)="reload()">
          {{ lineText(language(), 'retry') }}
        </button>
      } @else {
        @if (choicesError()) {
          <p role="alert" class="text-destructive mb-4">
            {{ lineText(language(), 'choicesFailed') }}
          </p>
        }
        @if (store.saveError()) {
          <p role="alert" class="text-destructive mb-4">{{ saveErrorMessage() }}</p>
        }
        @if (store.saveOutcome() === 'unconfirmed') {
          <p role="alert" class="border-destructive/40 bg-destructive/5 mb-4 rounded-md border p-4">
            {{ lineText(language(), 'saveUnconfirmed') }}
          </p>
        }
        @if (!isNew() && !editing()) {
          <dl class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-lg border p-4">
              <dt class="text-muted-foreground text-sm">{{ lineText(language(), 'route') }}</dt>
              <dd class="mt-1 font-medium">{{ routeStore.route()?.name ?? directionId() }}</dd>
            </div>
            <div class="rounded-lg border p-4">
              <dt class="text-muted-foreground text-sm">{{ lineText(language(), 'name') }}</dt>
              <dd class="mt-1 font-medium">{{ store.line()?.name }}</dd>
            </div>
            <div class="rounded-lg border p-4">
              <dt class="text-muted-foreground text-sm">{{ lineText(language(), 'outbound') }}</dt>
              <dd class="mt-1 font-medium">{{ store.line()?.entranceShiftTimeName ?? '-' }}</dd>
            </div>
            <div class="rounded-lg border p-4">
              <dt class="text-muted-foreground text-sm">{{ lineText(language(), 'return') }}</dt>
              <dd class="mt-1 font-medium">{{ store.line()?.returnShiftTimeName ?? '-' }}</dd>
            </div>
          </dl>
        } @else {
          <form class="grid max-w-3xl gap-5 sm:grid-cols-2" (submit)="save($event)">
            <div class="bg-muted/30 rounded-lg border p-4 sm:col-span-2">
              <p class="text-muted-foreground text-sm">{{ lineText(language(), 'route') }}</p>
              <p class="mt-1 font-medium">{{ routeStore.route()?.name ?? directionId() }}</p>
            </div>
            <div hlmField class="sm:col-span-2">
              <label hlmFieldLabel for="line-name">{{ lineText(language(), 'name') }}</label>
              <input
                class="min-h-11 w-full"
                id="line-name"
                type="text"
                [formField]="lineForm.name"
              />
              @if (lineForm.name().touched() && lineForm.name().invalid()) {
                <p class="text-destructive text-sm">
                  {{ language() === 'fa' ? 'نام خط الزامی است.' : 'Line name is required.' }}
                </p>
              }
            </div>
            <lib-lookup-select
              [field]="lineForm.entranceShiftTimeId"
              id="line-outbound-time"
              [label]="{ en: 'Outbound service time', fa: 'نوبت رفت با سرویس' }"
              [placeholder]="{ en: 'Optional service time', fa: 'زمان سرویس اختیاری' }"
              [options]="timeOptions()"
              [language]="language()"
              [loading]="departureStore.loading()"
              [error]="choicesError() ? lineText(language(), 'choicesFailed') : null"
              [disabled]="store.saving() || !canManage()"
              (retry)="loadDepartureTimes()"
            />
            <lib-lookup-select
              [field]="lineForm.returnShiftTimeId"
              id="line-return-time"
              [label]="{ en: 'Return service time', fa: 'نوبت برگشت با سرویس' }"
              [placeholder]="{ en: 'Optional service time', fa: 'زمان سرویس اختیاری' }"
              [options]="timeOptions()"
              [language]="language()"
              [loading]="departureStore.loading()"
              [error]="choicesError() ? lineText(language(), 'choicesFailed') : null"
              [disabled]="store.saving() || !canManage()"
              (retry)="loadDepartureTimes()"
            />
            @if (departureStore.list()?.atLimit) {
              <p role="status" class="text-muted-foreground text-sm sm:col-span-2">
                {{
                  language() === 'fa'
                    ? 'فهرست زمان سرویس به سقف ۱۰۰۰ مورد رسیده است.'
                    : 'Service-time choices reached the 1,000-record API ceiling.'
                }}
              </p>
            }
            @if (canManage()) {
              <div class="flex flex-wrap gap-2 sm:col-span-2">
                <button
                  hlmBtn
                  class="min-h-11"
                  type="submit"
                  [disabled]="
                    store.saving() ||
                    lineForm().invalid() ||
                    departureStore.loading() ||
                    !!departureStore.error()
                  "
                >
                  {{
                    store.saving()
                      ? lineText(language(), 'detailLoading')
                      : lineText(language(), 'save')
                  }}
                </button>
                <button hlmBtn variant="outline" class="min-h-11" type="button" (click)="cancel()">
                  {{ language() === 'fa' ? 'انصراف' : 'Cancel' }}
                </button>
              </div>
            }
          </form>
        }
        @if (!isNew() && !editing() && canManage()) {
          <button hlmBtn class="mt-5 min-h-11" type="button" (click)="startEditing()">
            {{ lineText(language(), 'edit') }}
          </button>
        }
      }
      <lib-confirm-dialog
        [(open)]="leaveOpen"
        [title]="language() === 'fa' ? 'تغییرات خط کنار گذاشته شود؟' : 'Discard Line changes?'"
        [description]="
          language() === 'fa'
            ? 'تغییرات ذخیره‌نشده خط از بین می‌روند.'
            : 'Unsaved Line edits will be lost.'
        "
        [confirmLabel]="language() === 'fa' ? 'صرف‌نظر' : 'Discard changes'"
        [cancelLabel]="language() === 'fa' ? 'ادامه ویرایش' : 'Keep editing'"
        [busy]="store.saving()"
        (confirmed)="finishLeave(true)"
        (canceled)="finishLeave(false)"
      />
    </main>
  `,
})
export class LineEditor {
  protected readonly feature = inject(LINE_FEATURE)
  protected readonly language = inject(LINE_LANGUAGE)
  protected readonly canManage = inject(LINE_MANAGE)
  protected readonly store = inject(LinesStore)
  protected readonly departureStore = inject(DepartureTimesStore)
  protected readonly routeStore = inject(RoutesStore)
  private readonly lineApi = inject(LinesApi)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly lineId = computed(() => this.readLineId(this.params().get('lineId')))
  protected readonly isNew = computed(() => this.params().get('lineId') === null)
  protected readonly invalidId = computed(() => !this.isNew() && this.lineId() === null)
  protected readonly directionId = this.store.directionId
  protected readonly draft = signal<LineFormModel>({ ...emptyLine })
  protected readonly lineForm = form(this.draft, schema => {
    disabled(schema.name, () => this.store.saving() || !this.canManage())
    required(schema.name, { message: 'Line name is required.' })
  })
  protected readonly editing = signal(false)
  protected readonly leaveOpen = signal(false)
  protected readonly timeOptions = computed(() => {
    const options = this.departureStore.lookupOptions().map(option => ({
      value: String(option.value),
      label: `${option.label} · ${departureClock(option.shiftTime) ?? option.shiftTime}`,
    }))
    const line = this.store.line()
    for (const [id, name] of [
      [line?.entranceShiftTimeId, line?.entranceShiftTimeName],
      [line?.returnShiftTimeId, line?.returnShiftTimeName],
    ] as const) {
      if (id === null || id === undefined || options.some(option => option.value === String(id)))
        continue
      options.push({
        value: String(id),
        label: `${this.language() === 'fa' ? 'زمان فعلی' : 'Current unlisted time'}: ${name ?? id}`,
      })
    }
    return options
  })
  protected readonly companyId = this.lineApi.companyId
  protected readonly backToDirection = computed(() => {
    const companyId = this.companyId()
    const directionId = this.directionId()
    return companyId !== null && directionId !== null
      ? ['/client', companyId, 'direction', 'detail', directionId]
      : ['..']
  })
  protected readonly hasScope = computed(
    () =>
      this.session.user() !== null &&
      this.lineApi.companyId() !== null &&
      this.directionId() !== null,
  )
  protected readonly deniedMessage = computed(
    () => this.feature.deniedMessage?.[this.language()] ?? lineText(this.language(), 'denied'),
  )
  protected readonly choicesError = computed(() => !!this.departureStore.error())
  private readonly loadedLineId = signal<LineId | null | undefined>(undefined)
  private loadedScope = ''
  private submitted = signal(false)
  private saved = false
  private pendingLeave: Promise<boolean> | null = null
  private resolveLeave: ((discard: boolean) => void) | null = null

  constructor() {
    effect(() => {
      const directionId = this.directionId()
      const companyId = this.lineApi.companyId()
      const version = this.session.version()
      const lineId = this.lineId()
      const isNew = this.isNew()
      const scope = `${companyId ?? ''}:${directionId ?? ''}:${version}`
      if (
        this.loadedLineId() === lineId &&
        this.loadedLineId() !== undefined &&
        this.loadedScope === scope
      )
        return
      this.loadedLineId.set(lineId)
      this.loadedScope = scope
      untracked(() => {
        this.saved = false
        this.submitted.set(false)
        this.editing.set(isNew)
        this.store.clearSaveStatus()
        this.departureStore.load({ name: '' })
        const parentRoute = this.routeStore.route()
        if (
          directionId &&
          (parentRoute?.id !== directionId || this.routeStore.detailStatus() !== 'ready')
        )
          this.routeStore.loadDetail(directionId)
        if (lineId) this.store.loadDetail(lineId)
        else {
          this.store.clearDetail()
          this.draft.set({ ...emptyLine })
        }
      })
    })
    effect(() => {
      const line = this.store.line()
      if (!line || this.store.detailStatus() !== 'ready' || line.id !== this.lineId()) return
      untracked(() => {
        this.draft.set({
          name: line.name,
          entranceShiftTimeId:
            line.entranceShiftTimeId === null ? '' : String(line.entranceShiftTimeId),
          returnShiftTimeId: line.returnShiftTimeId === null ? '' : String(line.returnShiftTimeId),
        })
        this.editing.set(false)
      })
    })
    effect(() => {
      const submitted = this.submitted()
      const outcome = this.store.saveOutcome()
      const savedId = this.store.savedId()
      if (!submitted) return
      if (outcome === 'confirmed' && savedId !== null) {
        untracked(() => {
          this.saved = true
          this.submitted.set(false)
          void this.router.navigate(['detail', savedId], {
            relativeTo: this.route.parent,
            queryParamsHandling: 'preserve',
          })
        })
      } else if (outcome === 'unconfirmed' || (this.store.saveError() && !this.store.saving())) {
        untracked(() => this.submitted.set(false))
      }
    })
  }

  protected text(key: keyof typeof LINE_TEXT) {
    return lineText(this.language(), key)
  }
  protected saveErrorMessage() {
    const error = this.store.saveError()
    return error?.code === 'lines-access-denied' || error?.status === 401 || error?.status === 403
      ? this.deniedMessage()
      : this.text('saveFailed')
  }
  protected startEditing() {
    const line = this.store.line()
    if (!line) return
    this.draft.set({
      name: line.name,
      entranceShiftTimeId:
        line.entranceShiftTimeId === null ? '' : String(line.entranceShiftTimeId),
      returnShiftTimeId: line.returnShiftTimeId === null ? '' : String(line.returnShiftTimeId),
    })
    this.editing.set(true)
  }
  protected loadDepartureTimes() {
    this.departureStore.load({ name: '' })
  }
  protected save(event: Event) {
    event.preventDefault()
    if (
      !this.canManage() ||
      this.store.saving() ||
      this.departureStore.loading() ||
      this.departureStore.error()
    )
      return
    void submit(this.lineForm, async () => {
      const directionId = this.directionId()
      if (!directionId) return
      const draft: LineDraft = {
        directionId,
        name: this.draft().name,
        entranceShiftTimeId: this.selectedTime(this.draft().entranceShiftTimeId),
        returnShiftTimeId: this.selectedTime(this.draft().returnShiftTimeId),
      }
      this.submitted.set(true)
      if (!this.store.save(this.lineId(), draft)) this.submitted.set(false)
    })
  }
  protected cancel() {
    const line = this.store.line()
    if (line) {
      this.draft.set({
        name: line.name,
        entranceShiftTimeId:
          line.entranceShiftTimeId === null ? '' : String(line.entranceShiftTimeId),
        returnShiftTimeId: line.returnShiftTimeId === null ? '' : String(line.returnShiftTimeId),
      })
      this.lineForm().reset()
      this.editing.set(false)
    } else {
      void this.router.navigate(['..'], { relativeTo: this.route, queryParamsHandling: 'preserve' })
    }
  }
  protected reload() {
    const id = this.lineId()
    if (id) this.store.loadDetail(id)
  }
  confirmLeave() {
    if (this.saved || !this.lineForm().dirty() || this.store.saving()) return true
    if (this.pendingLeave) return this.pendingLeave
    this.leaveOpen.set(true)
    this.pendingLeave = new Promise(resolve => {
      this.resolveLeave = resolve
    })
    return this.pendingLeave
  }
  protected finishLeave(discard: boolean) {
    this.leaveOpen.set(false)
    const resolve = this.resolveLeave
    this.resolveLeave = null
    this.pendingLeave = null
    resolve?.(discard)
  }

  private selectedTime(value: string): DepartureTimeId | null {
    if (!value) return null
    try {
      return departureTimeId(Number(value))
    } catch {
      return null
    }
  }
  private readLineId(value: string | null): LineId | null {
    if (!value || !/^[1-9]\d*$/.test(value)) return null
    try {
      return lineId(Number(value))
    } catch {
      return null
    }
  }
}
