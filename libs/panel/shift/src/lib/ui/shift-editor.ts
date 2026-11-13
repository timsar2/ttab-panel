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
import { FormField, form, submit, validate } from '@angular/forms/signals'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { forkJoin, of } from 'rxjs'
import {
  SchedulingApi,
  ShiftDraft,
  ShiftGroup,
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
import { SHIFT_LANGUAGE, SHIFT_MANAGE } from '../shift.routes'
import { ShiftTextKey, shiftText } from '../shift-i18n'

const emptyShift = (): ShiftDraft => ({
  shiftGroupId: 0,
  name: '',
  rateCycle: 1,
  offShift: false,
  orderNo: null,
  entranceShiftTimeId: null,
  returnShiftTimeId: null,
})
const emptyGroup = (): ShiftGroupDraft => ({
  shiftTypeId: 0,
  name: '',
  startDate: '',
  rateCycle: 1,
  saturdayHoliday: true,
  thursdayHoliday: true,
  fridayHoliday: true,
  publicHoliday: true,
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
  host: {
    class: 'block min-w-0 p-4 md:p-8',
    '[attr.dir]': "language() === 'fa' ? 'rtl' : 'ltr'",
  },
  template: `
    <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">
        {{ t(id() ? 'editShift' : 'createShift') }}
      </h1>
      <a hlmBtn variant="outline" class="min-h-11" routerLink="..">{{ t('back') }}</a>
    </header>
    @if (!canManage()) {
      <p role="alert">
        {{ t('accessDenied') }}
      </p>
    } @else if (id() === undefined) {
      <p role="alert">
        {{ t('invalidUrl') }}
      </p>
    } @else if (loading() || !hydrated()) {
      <p role="status">
        {{ t('loading') }}
      </p>
    } @else if (error()) {
      <div hlmAlert variant="destructive" role="alert">
        <h2 hlmAlertTitle>
          {{ t('loadFailed') }}
        </h2>
        <p hlmAlertDescription>{{ t('requestFailed') }}</p>
      </div>
    } @else if (missing()) {
      <p role="alert">
        {{ t('notFound') }}
      </p>
    } @else {
      @if (saveError()) {
        <p role="alert" class="text-destructive mb-4">{{ t('saveFailed') }}: {{ saveError() }}</p>
      }
      @if (saved()) {
        <p role="status" class="mb-4">
          {{ t('saved') }}
        </p>
      }
      <form class="grid max-w-2xl gap-5" novalidate (submit)="saveShift($event)">
        <div hlmField>
          <label hlmFieldLabel for="shift-group">{{ t('group') }}</label>
          <div class="flex gap-2">
            <select
              id="shift-group"
              class="bg-background min-h-11 min-w-0 flex-1 rounded-md border px-3"
              [value]="draft().shiftGroupId || ''"
              (change)="setGroup($event)"
              [disabled]="!canManage() || id() !== null"
            >
              <option value="">{{ t('selectGroup') }}</option>
              @for (group of groups(); track group.id) {
                <option [value]="group.id">{{ group.name }}</option>
              }
            </select>
            <button
              hlmBtn
              type="button"
              variant="outline"
              class="min-h-11 min-w-11"
              [attr.aria-label]="t('createGroup')"
              (click)="groupDialog.set(true)"
            >
              +
            </button>
          </div>
          @if (shiftForm.shiftGroupId().touched() && shiftForm.shiftGroupId().invalid()) {
            <hlm-field-error [forceShow]="true">{{ t('groupRequired') }}</hlm-field-error>
          }
        </div>
        <div hlmField>
          <label hlmFieldLabel for="shift-name">{{ t('shiftName') }}</label>
          <input libSignalInput id="shift-name" class="min-h-11" [formField]="shiftForm.name" />
          @if (shiftForm.name().touched() && shiftForm.name().invalid()) {
            <hlm-field-error [forceShow]="true">{{ t('shiftNameRequired') }}</hlm-field-error>
          }
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div hlmField>
            <label hlmFieldLabel for="shift-order">{{ t('order') }}</label
            ><input
              libSignalInput
              id="shift-order"
              type="number"
              class="min-h-11"
              [formField]="shiftForm.orderNo"
            />
            @if (shiftForm.orderNo().touched() && shiftForm.orderNo().invalid()) {
              <hlm-field-error [forceShow]="true">{{ t('orderRequired') }}</hlm-field-error>
            }
          </div>
          <div hlmField>
            <label hlmFieldLabel for="shift-cycle">{{ t('cycle') }}</label
            ><input
              libSignalInput
              id="shift-cycle"
              type="number"
              class="min-h-11"
              [formField]="shiftForm.rateCycle"
            />
            @if (shiftForm.rateCycle().touched() && shiftForm.rateCycle().invalid()) {
              <hlm-field-error [forceShow]="true">{{ t('cycleRequired') }}</hlm-field-error>
            }
          </div>
        </div>
        <label class="flex min-h-11 items-center gap-3"
          ><input type="checkbox" [checked]="draft().offShift" (change)="setOffShift($event)" />{{
            t('offShift')
          }}</label
        >
        <div class="grid gap-4 sm:grid-cols-2">
          <div hlmField>
            <label hlmFieldLabel for="shift-outbound">{{ t('outbound') }}</label
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
            <label hlmFieldLabel for="shift-return">{{ t('return') }}</label
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
        <button hlmBtn type="submit" class="min-h-11 justify-self-start" [disabled]="saving()">
          {{ t('saveShift') }}
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
            {{ t('createGroup') }}
          </h2>
          <p hlmDialogDescription>
            {{ t('groupDescription') }}
          </p></hlm-dialog-header
        >
        @if (typesError()) {
          <p role="alert" class="text-destructive">{{ typesError() }}</p>
        }
        <form class="mt-5 grid gap-4" novalidate (submit)="saveGroup($event)">
          <div hlmField>
            <label hlmFieldLabel for="group-type">{{ t('selectType') }}</label
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
              <hlm-field-error [forceShow]="true">{{ t('typeRequired') }}</hlm-field-error>
            }
          </div>
          <div hlmField>
            <label hlmFieldLabel for="group-name">{{ t('groupName') }}</label
            ><input libSignalInput id="group-name" class="min-h-11" [formField]="groupForm.name" />
            @if (groupForm.name().touched() && groupForm.name().invalid()) {
              <hlm-field-error [forceShow]="true">{{ t('groupNameRequired') }}</hlm-field-error>
            }
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div hlmField>
              <label hlmFieldLabel for="group-date">{{ t('startDate') }}</label
              ><input
                libSignalInput
                id="group-date"
                type="date"
                class="min-h-11"
                [formField]="groupForm.startDate"
              />
              @if (groupForm.startDate().touched() && groupForm.startDate().invalid()) {
                <hlm-field-error [forceShow]="true">{{ t('dateRequired') }}</hlm-field-error>
              }
            </div>
            <div hlmField>
              <label hlmFieldLabel for="group-cycle">{{ t('cycle') }}</label
              ><input
                libSignalInput
                id="group-cycle"
                type="number"
                class="min-h-11"
                [formField]="groupForm.rateCycle"
              />
              @if (groupForm.rateCycle().touched() && groupForm.rateCycle().invalid()) {
                <hlm-field-error [forceShow]="true">{{ t('cycleRequired') }}</hlm-field-error>
              }
            </div>
          </div>
          <fieldset class="grid gap-2 sm:grid-cols-2">
            <legend class="mb-2 font-medium">
              {{ t('holidayDays') }}
            </legend>
            <label class="flex gap-2"
              ><input
                type="checkbox"
                [checked]="groupDraft().saturdayHoliday"
                (change)="setHoliday($event, 'saturdayHoliday')"
              />{{ t('saturday') }}</label
            >
            <label class="flex gap-2"
              ><input
                type="checkbox"
                [checked]="groupDraft().thursdayHoliday"
                (change)="setHoliday($event, 'thursdayHoliday')"
              />{{ t('thursday') }}</label
            >
            <label class="flex gap-2"
              ><input
                type="checkbox"
                [checked]="groupDraft().fridayHoliday"
                (change)="setHoliday($event, 'fridayHoliday')"
              />{{ t('friday') }}</label
            >
            <label class="flex gap-2"
              ><input
                type="checkbox"
                [checked]="groupDraft().publicHoliday"
                (change)="setHoliday($event, 'publicHoliday')"
              />{{ t('publicHoliday') }}</label
            >
          </fieldset>
          <div class="flex justify-end gap-2">
            <button hlmBtn type="button" variant="outline" class="min-h-11" hlmDialogClose>
              {{ t('cancel') }}</button
            ><button
              hlmBtn
              type="submit"
              class="min-h-11"
              [disabled]="groupSaving() || types().length === 0"
            >
              {{ t('saveGroup') }}
            </button>
          </div>
        </form>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
export class ShiftEditor {
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
    validate(path.name, ({ value }) =>
      value().trim() ? null : { kind: 'required', message: 'required' },
    )
    validate(path.shiftGroupId, ({ value }) =>
      value() > 0 ? null : { kind: 'required', message: 'required' },
    )
    validate(path.orderNo, ({ value }) => {
      const current = value()
      return current !== null && current > 0 ? null : { kind: 'required', message: 'required' }
    })
    validate(path.rateCycle, ({ value }) => {
      const current = value()
      return current !== null && current > 0 ? null : { kind: 'required', message: 'required' }
    })
  })
  protected readonly groupForm = form(this.groupDraft, path => {
    validate(path.name, ({ value }) =>
      value().trim() ? null : { kind: 'required', message: 'required' },
    )
    validate(path.startDate, ({ value }) =>
      value().trim() ? null : { kind: 'required', message: 'required' },
    )
    validate(path.shiftTypeId, ({ value }) =>
      value() > 0 ? null : { kind: 'required', message: 'required' },
    )
    validate(path.rateCycle, ({ value }) => {
      const current = value()
      return current !== null && current > 0 ? null : { kind: 'required', message: 'required' }
    })
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
            const detailInCompany = Boolean(
              data.detail?.shiftGroupId &&
              data.groups.some((group: ShiftGroup) => group.id === data.detail?.shiftGroupId),
            )
            this.missing.set(id !== null && (!data.detail || !detailInCompany))
            if (data.detail && (id === null || detailInCompany)) {
              this.draft.set({
                shiftGroupId: data.detail.shiftGroupId ?? 0,
                name: data.detail.name,
                rateCycle: 1,
                offShift: false,
                orderNo: data.detail.orderNo,
                entranceShiftTimeId: data.detail.entranceShiftTimeId,
                returnShiftTimeId: data.detail.returnShiftTimeId,
              })
              this.shiftForm().reset()
            }
            this.loading.set(false)
          },
          error: () => {
            this.error.set(this.message())
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
    this.draft.update(value => ({
      ...value,
      offShift: checked,
      ...(checked ? { entranceShiftTimeId: null, returnShiftTimeId: null } : {}),
    }))
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

  protected t(key: ShiftTextKey) {
    return shiftText(this.language(), key)
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
              this.saveError.set(this.t('saveNotConfirmed'))
              return
            }
            this.saved.set(true)
            if (id === undefined && result.id !== undefined)
              void this.router.navigate(['../detail', result.id], { relativeTo: this.route })
          },
          error: () => {
            this.saveError.set(this.message())
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
              this.typesError.set(this.t('saveNotConfirmed'))
              return
            }
            this.groups.update(groups => [...groups, group])
            this.draft.update(value => ({ ...value, shiftGroupId: group.id }))
            this.groupDialog.set(false)
            this.groupDraft.set(emptyGroup())
            this.groupForm().reset()
          },
          error: () => {
            this.typesError.set(this.message())
            this.groupSaving.set(false)
          },
        })
    })
  }

  private message() {
    return this.t('requestFailed')
  }
}
