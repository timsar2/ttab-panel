import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'
import { FormField, form, required, submit, validate } from '@angular/forms/signals'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { forkJoin, of } from 'rxjs'
import {
  SchedulingApi,
  ShiftDraft,
  ShiftGroupDraft,
  ShiftType,
  ShiftTime,
  schedulingId,
} from '@org/transport-scheduling-data-access'
import { SignalInput } from '@org/ui-forms'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmDialogImports } from '@spartan-ng/helm/dialog'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { SHIFT_FEATURE, SHIFT_LANGUAGE, SHIFT_MANAGE } from '../shift.routes'

const emptyShift = (): ShiftDraft => ({
  shiftGroupId: 0,
  name: '',
  rateCycle: 0,
  offShift: false,
  orderNo: 0,
  entranceShiftTimeId: null,
  returnShiftTimeId: null,
})
const emptyGroup = (): ShiftGroupDraft => ({
  shiftTypeId: 0,
  name: '',
  startDate: '',
  rateCycle: 1,
  saturdayHoliday: false,
  thursdayHoliday: false,
  fridayHoliday: false,
  publicHoliday: false,
})

@Component({
  selector: 'lib-shift-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    RouterLink,
    SignalInput,
    HlmAlertImports,
    HlmButton,
    HlmDialogImports,
    HlmFieldImports,
  ],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">
        {{
          language() === 'fa'
            ? id()
              ? 'ویرایش شیفت'
              : 'ایجاد شیفت'
            : id()
              ? 'Edit shift'
              : 'Create shift'
        }}
      </h1>
      <a hlmBtn variant="outline" class="min-h-11" routerLink="..">{{
        language() === 'fa' ? 'بازگشت به فهرست' : 'Back to shifts'
      }}</a>
    </header>
    @if (!canManage()) {
      <p role="alert">
        {{ config.deniedMessage ?? 'You do not have permission to manage shifts in this company.' }}
      </p>
    } @else if (id() === undefined) {
      <p role="alert">
        {{ language() === 'fa' ? 'شناسه شیفت معتبر نیست.' : 'Invalid shift URL.' }}
      </p>
    } @else if (loading() || !hydrated()) {
      <p role="status">
        {{ language() === 'fa' ? 'در حال بارگذاری...' : 'Loading shift data...' }}
      </p>
    } @else if (error()) {
      <div hlmAlert variant="destructive" role="alert">
        <h2 hlmAlertTitle>
          {{ language() === 'fa' ? 'بارگذاری ناموفق بود' : 'Unable to load shift data' }}
        </h2>
        <p hlmAlertDescription>{{ error() }}</p>
      </div>
    } @else if (missing()) {
      <p role="alert">
        {{
          language() === 'fa'
            ? 'شیفت پیدا نشد یا به این شرکت تعلق ندارد.'
            : 'Shift not found in this company.'
        }}
      </p>
    } @else {
      @if (saveError()) {
        <p role="alert" class="text-destructive mb-4">{{ saveError() }}</p>
      }
      @if (saved()) {
        <p role="status" class="mb-4">
          {{ language() === 'fa' ? 'شیفت ذخیره شد.' : 'Shift saved.' }}
        </p>
      }
      <form class="grid max-w-2xl gap-5" novalidate (submit)="saveShift($event)">
        <div hlmField>
          <label hlmFieldLabel for="shift-group">{{
            language() === 'fa' ? 'گروه شیفت' : 'Shift group'
          }}</label>
          <div class="flex gap-2">
            <select
              id="shift-group"
              class="bg-background min-h-11 min-w-0 flex-1 rounded-md border px-3"
              [value]="draft().shiftGroupId || ''"
              (change)="setGroup($event)"
              [disabled]="!canManage()"
            >
              <option value="">{{ language() === 'fa' ? 'انتخاب گروه' : 'Select a group' }}</option>
              @for (group of groups(); track group.id) {
                <option [value]="group.id">{{ group.name }}</option>
              }
            </select>
            <button
              hlmBtn
              type="button"
              variant="outline"
              class="min-h-11 min-w-11"
              [attr.aria-label]="language() === 'fa' ? 'ایجاد گروه شیفت' : 'Create shift group'"
              (click)="groupDialog.set(true)"
            >
              +
            </button>
          </div>
          @if (shiftForm.shiftGroupId().touched() && shiftForm.shiftGroupId().invalid()) {
            <hlm-field-error [forceShow]="true">{{
              shiftForm.shiftGroupId().errors()[0]?.message
            }}</hlm-field-error>
          }
        </div>
        <div hlmField>
          <label hlmFieldLabel for="shift-name">{{
            language() === 'fa' ? 'نام شیفت' : 'Shift name'
          }}</label>
          <input libSignalInput id="shift-name" class="min-h-11" [formField]="shiftForm.name" />
          @if (shiftForm.name().touched() && shiftForm.name().invalid()) {
            <hlm-field-error [forceShow]="true">{{
              shiftForm.name().errors()[0]?.message
            }}</hlm-field-error>
          }
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div hlmField>
            <label hlmFieldLabel for="shift-order">{{
              language() === 'fa' ? 'ترتیب' : 'Order'
            }}</label
            ><input
              libSignalInput
              id="shift-order"
              type="number"
              class="min-h-11"
              [formField]="shiftForm.orderNo"
            />
            @if (shiftForm.orderNo().touched() && shiftForm.orderNo().invalid()) {
              <hlm-field-error [forceShow]="true">{{
                shiftForm.orderNo().errors()[0]?.message
              }}</hlm-field-error>
            }
          </div>
          <div hlmField>
            <label hlmFieldLabel for="shift-cycle">{{
              language() === 'fa' ? 'چرخه' : 'Cycle'
            }}</label
            ><input
              libSignalInput
              id="shift-cycle"
              type="number"
              class="min-h-11"
              [formField]="shiftForm.rateCycle"
            />
            @if (shiftForm.rateCycle().touched() && shiftForm.rateCycle().invalid()) {
              <hlm-field-error [forceShow]="true">{{
                shiftForm.rateCycle().errors()[0]?.message
              }}</hlm-field-error>
            }
          </div>
        </div>
        <label class="flex min-h-11 items-center gap-3"
          ><input type="checkbox" [checked]="draft().offShift" (change)="setOffShift($event)" />{{
            language() === 'fa' ? 'شیفت بدون سرویس' : 'Off shift'
          }}</label
        >
        <div class="grid gap-4 sm:grid-cols-2">
          <div hlmField>
            <label hlmFieldLabel for="shift-outbound">{{
              language() === 'fa' ? 'سرویس رفت' : 'Outbound time'
            }}</label
            ><select
              id="shift-outbound"
              class="bg-background min-h-11 rounded-md border px-3"
              [value]="draft().entranceShiftTimeId ?? ''"
              [disabled]="draft().offShift"
              (change)="setTime($event, 'entranceShiftTimeId')"
            >
              <option value="">-</option>
              @for (time of times(); track time.id) {
                <option [value]="time.id">{{ time.name }} · {{ time.shiftTime }}</option>
              }
            </select>
          </div>
          <div hlmField>
            <label hlmFieldLabel for="shift-return">{{
              language() === 'fa' ? 'سرویس برگشت' : 'Return time'
            }}</label
            ><select
              id="shift-return"
              class="bg-background min-h-11 rounded-md border px-3"
              [value]="draft().returnShiftTimeId ?? ''"
              [disabled]="draft().offShift"
              (change)="setTime($event, 'returnShiftTimeId')"
            >
              <option value="">-</option>
              @for (time of times(); track time.id) {
                <option [value]="time.id">{{ time.name }} · {{ time.shiftTime }}</option>
              }
            </select>
          </div>
        </div>
        @if (id() !== null && offShiftUnknown()) {
          <div role="alert" class="flex flex-wrap items-center gap-3">
            <p>
              {{
                language() === 'fa'
                  ? 'وضعیت شیفت تعطیل در پاسخ سرور مشخص نبود. مقدار را صریحاً تأیید کنید.'
                  : 'The server omitted the existing off-shift value. Confirm it explicitly before saving.'
              }}
            </p>
            <button
              hlmBtn
              variant="outline"
              type="button"
              class="min-h-11"
              (click)="confirmOffShift(false)"
            >
              {{ language() === 'fa' ? 'شیفت تعطیل نیست' : 'Confirm regular shift' }}
            </button>
          </div>
        }
        <button
          hlmBtn
          type="submit"
          class="min-h-11 justify-self-start"
          [disabled]="saving() || (id() !== null && offShiftUnknown())"
        >
          {{ language() === 'fa' ? 'ثبت' : 'Save shift' }}
        </button>
      </form>
    }

    <hlm-dialog [state]="groupDialog() ? 'open' : 'closed'" (stateChanged)="dialogChanged($event)">
      <hlm-dialog-content
        *hlmDialogPortal="let ctx"
        class="max-h-[90dvh] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto"
      >
        <hlm-dialog-header
          ><h2 hlmDialogTitle>
            {{ language() === 'fa' ? 'ایجاد گروه شیفت' : 'Create shift group' }}
          </h2>
          <p hlmDialogDescription>
            {{
              language() === 'fa'
                ? 'اطلاعات گروه را وارد کنید.'
                : 'Configure a company shift group.'
            }}
          </p></hlm-dialog-header
        >
        @if (typesError()) {
          <p role="alert" class="text-destructive">{{ typesError() }}</p>
        }
        <form class="mt-5 grid gap-4" novalidate (submit)="saveGroup($event)">
          <div hlmField>
            <label hlmFieldLabel for="group-type">{{
              language() === 'fa' ? 'نوع شیفت' : 'Shift type'
            }}</label
            ><select
              id="group-type"
              class="bg-background min-h-11 rounded-md border px-3"
              [value]="groupDraft().shiftTypeId || ''"
              (change)="setType($event)"
            >
              <option value="">-</option>
              @for (type of types(); track type.id) {
                <option [value]="type.id">{{ type.name }}</option>
              }
            </select>
            @if (groupForm.shiftTypeId().touched() && groupForm.shiftTypeId().invalid()) {
              <hlm-field-error [forceShow]="true">{{
                groupForm.shiftTypeId().errors()[0]?.message
              }}</hlm-field-error>
            }
          </div>
          <div hlmField>
            <label hlmFieldLabel for="group-name">{{
              language() === 'fa' ? 'نام گروه' : 'Group name'
            }}</label
            ><input libSignalInput id="group-name" class="min-h-11" [formField]="groupForm.name" />
            @if (groupForm.name().touched() && groupForm.name().invalid()) {
              <hlm-field-error [forceShow]="true">{{
                groupForm.name().errors()[0]?.message
              }}</hlm-field-error>
            }
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div hlmField>
              <label hlmFieldLabel for="group-date">{{
                language() === 'fa' ? 'تاریخ شروع' : 'Start date'
              }}</label
              ><input
                libSignalInput
                id="group-date"
                type="date"
                class="min-h-11"
                [formField]="groupForm.startDate"
              />
              @if (groupForm.startDate().touched() && groupForm.startDate().invalid()) {
                <hlm-field-error [forceShow]="true">{{
                  groupForm.startDate().errors()[0]?.message
                }}</hlm-field-error>
              }
            </div>
            <div hlmField>
              <label hlmFieldLabel for="group-cycle">{{
                language() === 'fa' ? 'چرخه' : 'Cycle'
              }}</label
              ><input
                libSignalInput
                id="group-cycle"
                type="number"
                class="min-h-11"
                [formField]="groupForm.rateCycle"
              />
              @if (groupForm.rateCycle().touched() && groupForm.rateCycle().invalid()) {
                <hlm-field-error [forceShow]="true">{{
                  groupForm.rateCycle().errors()[0]?.message
                }}</hlm-field-error>
              }
            </div>
          </div>
          <fieldset class="grid gap-2 sm:grid-cols-2">
            <legend class="mb-2 font-medium">
              {{ language() === 'fa' ? 'روزهای تعطیل' : 'Holiday flags' }}
            </legend>
            <label class="flex gap-2"
              ><input
                type="checkbox"
                [checked]="groupDraft().saturdayHoliday"
                (change)="setHoliday($event, 'saturdayHoliday')"
              />{{ language() === 'fa' ? 'شنبه' : 'Saturday' }}</label
            >
            <label class="flex gap-2"
              ><input
                type="checkbox"
                [checked]="groupDraft().thursdayHoliday"
                (change)="setHoliday($event, 'thursdayHoliday')"
              />{{ language() === 'fa' ? 'پنجشنبه' : 'Thursday' }}</label
            >
            <label class="flex gap-2"
              ><input
                type="checkbox"
                [checked]="groupDraft().fridayHoliday"
                (change)="setHoliday($event, 'fridayHoliday')"
              />{{ language() === 'fa' ? 'جمعه' : 'Friday' }}</label
            >
            <label class="flex gap-2"
              ><input
                type="checkbox"
                [checked]="groupDraft().publicHoliday"
                (change)="setHoliday($event, 'publicHoliday')"
              />{{ language() === 'fa' ? 'تعطیلات رسمی' : 'Public holidays' }}</label
            >
          </fieldset>
          <div class="flex justify-end gap-2">
            <button hlmBtn type="button" variant="outline" class="min-h-11" hlmDialogClose>
              {{ language() === 'fa' ? 'انصراف' : 'Cancel' }}</button
            ><button
              hlmBtn
              type="submit"
              class="min-h-11"
              [disabled]="groupSaving() || types().length === 0"
            >
              {{ language() === 'fa' ? 'ثبت گروه' : 'Save group' }}
            </button>
          </div>
        </form>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
export class ShiftEditor {
  protected readonly config = inject(SHIFT_FEATURE)
  protected readonly language = inject(SHIFT_LANGUAGE)
  protected readonly canManage = inject(SHIFT_MANAGE)
  protected readonly api = inject(SchedulingApi)
  protected readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly id = computed<number | null | undefined>(() => {
    const value = this.params().get('id')
    if (value === null) return null
    if (!/^[1-9]\d*$/.test(value)) return undefined
    try {
      return schedulingId(Number(value))
    } catch {
      return undefined
    }
  })
  protected readonly loading = signal(true)
  protected readonly hydrated = signal(false)
  protected readonly saving = signal(false)
  protected readonly groupSaving = signal(false)
  protected readonly saved = signal(false)
  protected readonly missing = signal(false)
  protected readonly offShiftUnknown = signal(false)
  protected readonly error = signal<string | null>(null)
  protected readonly saveError = signal<string | null>(null)
  protected readonly typesError = signal<string | null>(null)
  protected readonly groups = signal<readonly { id: number; name: string }[]>([])
  protected readonly types = signal<readonly ShiftType[]>([])
  protected readonly times = signal<readonly ShiftTime[]>([])
  protected readonly groupDialog = signal(false)
  protected readonly draft = signal<ShiftDraft>(emptyShift())
  protected readonly groupDraft = signal<ShiftGroupDraft>(emptyGroup())
  protected readonly shiftForm = form(this.draft, path => {
    required(path.name, { message: 'Enter a shift name.' })
    validate(path.name, ({ value }) =>
      value().trim() ? null : { kind: 'required', message: 'Enter a shift name.' },
    )
    validate(path.shiftGroupId, ({ value }) =>
      value() > 0 ? null : { kind: 'required', message: 'Select a shift group.' },
    )
    validate(path.orderNo, ({ value }) =>
      value() > 0 ? null : { kind: 'required', message: 'Enter an order number.' },
    )
    validate(path.rateCycle, ({ value }) =>
      value() > 0 ? null : { kind: 'required', message: 'Enter a cycle value.' },
    )
  })
  protected readonly groupForm = form(this.groupDraft, path => {
    required(path.name, { message: 'Enter a group name.' })
    validate(path.name, ({ value }) =>
      value().trim() ? null : { kind: 'required', message: 'Enter a group name.' },
    )
    required(path.startDate, { message: 'Choose a start date.' })
    validate(path.shiftTypeId, ({ value }) =>
      value() > 0 ? null : { kind: 'required', message: 'Select a shift type.' },
    )
    validate(path.rateCycle, ({ value }) =>
      value() > 0 ? null : { kind: 'required', message: 'Enter a cycle value.' },
    )
  })

  constructor() {
    afterNextRender(() => this.hydrated.set(true))
    effect(onCleanup => {
      const companyId = this.api.companyId()
      const id = this.id()
      this.loading.set(true)
      this.error.set(null)
      this.draft.set(emptyShift())
      this.missing.set(false)
      this.offShiftUnknown.set(false)
      this.shiftForm().reset()
      if (!companyId || !this.canManage() || id === undefined) {
        this.loading.set(false)
        return
      }
      const subscription = untracked(() =>
        forkJoin({
          groups: this.api.listGroups(),
          types: this.api.listTypes(),
          times: this.api.listShiftTimes(),
          detail: id === null ? of(null) : this.api.detail(id),
        }).subscribe({
          next: data => {
            this.groups.set(data.groups)
            this.types.set(data.types)
            this.times.set(data.times)
            this.missing.set(id !== null && data.detail === null)
            if (data.detail) {
              this.offShiftUnknown.set(data.detail.offShift === null)
              this.draft.set({
                shiftGroupId: data.detail.shiftGroupId,
                name: data.detail.name,
                rateCycle: data.detail.rateCycle ?? 0,
                offShift: data.detail.offShift ?? false,
                orderNo: data.detail.orderNo ?? 0,
                entranceShiftTimeId: data.detail.entranceShiftTimeId,
                returnShiftTimeId: data.detail.returnShiftTimeId,
              })
              this.shiftForm().reset()
            }
            this.loading.set(false)
          },
          error: error => {
            this.error.set(this.message(error))
            this.loading.set(false)
          },
        }),
      )
      onCleanup(() => subscription.unsubscribe())
    })
  }

  protected setGroup(event: Event) {
    this.draft.update(value => ({
      ...value,
      shiftGroupId: Number((event.target as HTMLSelectElement).value) || 0,
    }))
  }
  protected setType(event: Event) {
    this.groupDraft.update(value => ({
      ...value,
      shiftTypeId: Number((event.target as HTMLSelectElement).value) || 0,
    }))
  }
  protected setOffShift(event: Event) {
    const checked = (event.target as HTMLInputElement).checked
    this.offShiftUnknown.set(false)
    this.draft.update(value => ({
      ...value,
      offShift: checked,
      ...(checked ? { entranceShiftTimeId: null, returnShiftTimeId: null } : {}),
    }))
  }
  protected confirmOffShift(value: boolean) {
    this.draft.update(current => ({ ...current, offShift: value }))
    this.offShiftUnknown.set(false)
  }
  protected setTime(event: Event, field: 'entranceShiftTimeId' | 'returnShiftTimeId') {
    const value = Number((event.target as HTMLSelectElement).value) || null
    this.draft.update(current => ({ ...current, [field]: value }))
  }
  protected setHoliday(
    event: Event,
    field: 'saturdayHoliday' | 'thursdayHoliday' | 'fridayHoliday' | 'publicHoliday',
  ) {
    this.groupDraft.update(value => ({
      ...value,
      [field]: (event.target as HTMLInputElement).checked,
    }))
  }
  protected dialogChanged(state: 'open' | 'closed') {
    this.groupDialog.set(state === 'open')
  }

  protected saveShift(event: Event) {
    event.preventDefault()
    if (!this.canManage() || this.saving()) return
    void submit(this.shiftForm, async () => {
      this.saving.set(true)
      this.saveError.set(null)
      const id = this.id() ?? undefined
      this.api
        .saveShift({ ...this.draft(), name: this.draft().name.trim() }, id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: result => {
            this.saving.set(false)
            if (!result) {
              this.saveError.set('The server did not confirm the saved shift.')
              return
            }
            this.saved.set(true)
            if (id === undefined)
              void this.router.navigate(['../detail', result.id], { relativeTo: this.route })
          },
          error: error => {
            this.saveError.set(this.message(error))
            this.saving.set(false)
          },
        })
    })
  }

  protected saveGroup(event: Event) {
    event.preventDefault()
    if (!this.canManage() || this.groupSaving()) return
    void submit(this.groupForm, async () => {
      this.groupSaving.set(true)
      this.typesError.set(null)
      this.api
        .saveGroup({ ...this.groupDraft(), name: this.groupDraft().name.trim() })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: group => {
            this.groupSaving.set(false)
            if (!group) {
              this.typesError.set('The server did not confirm the saved group.')
              return
            }
            this.groups.update(groups => [...groups, group])
            this.draft.update(value => ({ ...value, shiftGroupId: group.id }))
            this.groupDialog.set(false)
            this.groupDraft.set(emptyGroup())
            this.groupForm().reset()
          },
          error: error => {
            this.typesError.set(this.message(error))
            this.groupSaving.set(false)
          },
        })
    })
  }

  private message(error: unknown) {
    return (
      (error as { message?: string })?.message ??
      this.config.deniedMessage ??
      'Unable to complete the scheduling request.'
    )
  }
}
