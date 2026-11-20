import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import {
  FormField,
  disabled,
  form,
  maxLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import {
  INSPECTION_CHECKS,
  InspectionCheck,
  InspectionId,
  inspectionId,
  inspectionDate,
  InspectionStore,
} from '@org/transport-inspection-data-access'
import { HlmButton } from '@spartan-ng/helm/button'
import { firstValueFrom } from 'rxjs'
import {
  INSPECTION_CAN_MANAGE,
  INSPECTION_LANGUAGE,
  INSPECTION_SCOPE,
  parseInspectionRouteId,
} from '../inspection.routes'
import { inspectionText, type InspectionTextKey } from '../inspection-text'

const checkLabels: Record<InspectionCheck, InspectionTextKey> = {
  tiresCondition: 'tiresCondition',
  lightsCondition: 'lightsCondition',
  seatsCondition: 'seatsCondition',
  hasSeatBelt: 'hasSeatBelt',
  heaterCondition: 'heaterCondition',
  airConditionerCondition: 'airConditionerCondition',
  hasFirstAidKit: 'hasFirstAidKit',
  hasFireExtinguisher: 'hasFireExtinguisher',
  hasTurnSignals: 'hasTurnSignals',
  wipersCondition: 'wipersCondition',
  windowsCondition: 'windowsCondition',
  hasSafetyVestAndWarningTriangle: 'hasSafetyVestAndWarningTriangle',
}

@Component({
  selector: 'lib-inspection-detail-page',
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
    } @else if (scope() === null) {
      <p role="status">{{ t('selectCompany') }}</p>
    } @else if (store.detailStatus() === 'loading') {
      <p role="status">{{ t('detailLoading') }}</p>
    } @else if (store.detailStatus() === 'denied') {
      <p role="alert">{{ t('denied') }}</p>
    } @else if (store.detailStatus() === 'not-found') {
      <p role="alert">{{ t('missing') }}</p>
    } @else if (store.detailStatus() === 'error') {
      <p role="alert">{{ t('detailFailed') }}</p>
    } @else if (store.detail(); as detail) {
      <header class="mb-6 rounded-xl border p-5">
        <h1 class="text-2xl font-semibold">{{ t('detail') }} #{{ detail.id }}</h1>
        <dl class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt class="text-muted-foreground text-sm">{{ t('date') }}</dt>
            <dd dir="ltr">{{ detail.inspectionDate }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">{{ t('inspector') }}</dt>
            <dd>{{ detail.inspectorName || '#' + detail.inspectorId }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">{{ t('driver') }}</dt>
            <dd>{{ detail.driverName || '#' + detail.driverId }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">{{ t('vehicle') }}</dt>
            <dd>{{ detail.carPlate || '#' + detail.vehicleId }}</dd>
          </div>
        </dl>
        @if (canManageActions()) {
          <section
            class="bg-muted/30 mt-5 rounded-lg p-4"
            aria-labelledby="inspection-status-heading"
          >
            <h2 id="inspection-status-heading" class="font-medium">{{ t('status') }}</h2>
            <p class="text-muted-foreground mt-1 text-sm">{{ t('statusContract') }}</p>
            <p class="mt-2">{{ detail.statusTypeId || t('statusUnavailable') }}</p>
            <form
              id="inspection-status-form"
              class="mt-4 grid max-w-lg gap-3"
              novalidate
              (submit)="saveStatus($event)"
            >
              <label class="grid gap-2 text-sm" for="inspection-status-select">{{
                t('setStatus')
              }}</label>
              <select
                id="inspection-status-select"
                class="bg-background min-h-11 rounded-md border px-3"
                [formField]="statusForm.statusTypeId"
              >
                <option value="">{{ t('setStatus') }}</option>
                <option value="1">{{ t('statusPendingAction') }}</option>
                <option value="2">{{ t('statusPendingApproval') }}</option>
                <option value="3">{{ t('statusApproved') }}</option>
              </select>
              <label class="inline-flex min-h-11 items-center gap-2">
                <input
                  id="inspection-status-confirmed"
                  type="checkbox"
                  [formField]="statusForm.confirmed"
                />{{ t('confirmStatus') }}
              </label>
              @if (statusForm().touched() && statusForm().invalid()) {
                <p role="alert">{{ t('confirmStatus') }}</p>
              }
              @if (statusError()) {
                <p role="alert">{{ statusError() }}</p>
              }
              @if (statusUpdated()) {
                <p role="status">{{ t('statusUpdateSent') }}</p>
              }
              <button
                hlmBtn
                class="min-h-11 justify-self-start"
                type="submit"
                [disabled]="savingStatus()"
              >
                {{ savingStatus() ? t('saving') : t('setStatus') }}
              </button>
            </form>
          </section>
        }
      </header>
      <section class="mb-6 rounded-xl border p-5" aria-labelledby="inspection-checks-heading">
        <h2 id="inspection-checks-heading" class="text-lg font-semibold">{{ t('checks') }}</h2>
        <dl class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (check of checks; track check) {
            <div class="bg-muted/30 rounded-lg p-3">
              <dt class="text-sm">{{ t(label(check)) }}</dt>
              <dd class="mt-1 font-medium">
                {{ detail[check] ? t('trueValue') : t('falseValue') }}
              </dd>
            </div>
          }
        </dl>
        <h3 class="mt-5 font-medium">{{ t('description') }}</h3>
        <p class="mt-2 whitespace-pre-wrap">{{ detail.description }}</p>
      </section>
      <section class="grid gap-6 xl:grid-cols-2">
        <div class="rounded-xl border p-5">
          <h2 class="text-lg font-semibold">{{ t('defects') }}</h2>
          @if (!detail.defects.length) {
            <p class="text-muted-foreground mt-3">{{ t('noDefects') }}</p>
          }
          <ul class="mt-3 grid gap-3">
            @for (defect of detail.defects; track defect.id) {
              <li class="bg-muted/30 rounded-lg p-4">
                <p dir="ltr">{{ t('dueDate') }}: {{ defect.dueDate }}</p>
                <p class="mt-2 whitespace-pre-wrap">{{ defect.description }}</p>
              </li>
            }
          </ul>
          @if (canManageActions()) {
            <form
              id="inspection-defect-form"
              class="mt-6 grid gap-3 border-t pt-5"
              novalidate
              (submit)="saveDefect($event)"
            >
              <h3 class="font-medium">{{ t('addDefect') }}</h3>
              <label class="grid gap-2 text-sm" for="inspection-due-date">{{ t('dueDate') }}</label
              ><input
                id="inspection-due-date"
                class="bg-background min-h-11 rounded-md border px-3"
                type="date"
                [formField]="defectForm.dueDate"
              />
              <label class="grid gap-2 text-sm" for="inspection-defect-description">{{
                t('text')
              }}</label
              ><textarea
                id="inspection-defect-description"
                class="bg-background min-h-24 rounded-md border p-3"
                [formField]="defectForm.description"
              ></textarea>
              @if (defectForm().touched() && defectForm().invalid()) {
                <p role="alert">{{ t('dateRequired') }} {{ t('descriptionRequired') }}</p>
              }
              @if (defectError()) {
                <p role="alert">{{ defectError() }}</p>
              }
              @if (defectSaved()) {
                <p role="status">{{ t('saved') }}</p>
              }
              <button
                hlmBtn
                class="min-h-11 justify-self-start"
                type="submit"
                [disabled]="savingDefect()"
              >
                {{ savingDefect() ? t('saving') : t('submit') }}
              </button>
            </form>
          }
        </div>
        <div class="rounded-xl border p-5">
          <h2 class="text-lg font-semibold">{{ t('correctiveActions') }}</h2>
          @if (!detail.correctiveActions.length) {
            <p class="text-muted-foreground mt-3">{{ t('noActions') }}</p>
          }
          <ul class="mt-3 grid gap-3">
            @for (action of detail.correctiveActions; track action.id) {
              <li class="bg-muted/30 rounded-lg p-4">
                <p dir="ltr">{{ t('completedAt') }}: {{ action.completedAt }}</p>
                <p class="mt-2 whitespace-pre-wrap">{{ action.description }}</p>
              </li>
            }
          </ul>
          @if (canManageActions()) {
            <form
              id="inspection-action-form"
              class="mt-6 grid gap-3 border-t pt-5"
              novalidate
              (submit)="saveAction($event)"
            >
              <h3 class="font-medium">{{ t('addAction') }}</h3>
              <label class="grid gap-2 text-sm" for="inspection-completed-at">{{
                t('completedAt')
              }}</label
              ><input
                id="inspection-completed-at"
                class="bg-background min-h-11 rounded-md border px-3"
                type="date"
                [formField]="actionForm.completedAt"
              />
              <label class="grid gap-2 text-sm" for="inspection-action-description">{{
                t('text')
              }}</label
              ><textarea
                id="inspection-action-description"
                class="bg-background min-h-24 rounded-md border p-3"
                [formField]="actionForm.description"
              ></textarea>
              @if (actionForm().touched() && actionForm().invalid()) {
                <p role="alert">{{ t('dateRequired') }} {{ t('descriptionRequired') }}</p>
              }
              @if (actionError()) {
                <p role="alert">{{ actionError() }}</p>
              }
              @if (actionSaved()) {
                <p role="status">{{ t('saved') }}</p>
              }
              <button
                hlmBtn
                class="min-h-11 justify-self-start"
                type="submit"
                [disabled]="savingAction()"
              >
                {{ savingAction() ? t('saving') : t('submit') }}
              </button>
            </form>
          }
        </div>
      </section>
    }
  `,
})
export class InspectionDetailPage {
  protected readonly language = inject(INSPECTION_LANGUAGE)
  protected readonly store = inject(InspectionStore)
  protected readonly scope = inject(INSPECTION_SCOPE)
  protected readonly canManageActions = inject(INSPECTION_CAN_MANAGE)
  protected readonly checks = INSPECTION_CHECKS
  protected readonly savingDefect = signal(false)
  protected readonly savingStatus = signal(false)
  protected readonly statusModel = signal({ statusTypeId: '', confirmed: false })
  protected readonly statusForm = form(this.statusModel, schema => {
    validate(schema.statusTypeId, ({ value }) =>
      ['1', '2', '3'].includes(value()) ? null : { kind: 'status', message: 'status' },
    )
    validate(schema.confirmed, ({ value }) =>
      value() ? null : { kind: 'confirm', message: 'confirm' },
    )
    disabled(schema.statusTypeId, () => this.savingStatus())
    disabled(schema.confirmed, () => this.savingStatus())
  })
  protected readonly statusError = signal<string | null>(null)
  protected readonly statusUpdated = signal(false)
  private readonly route = inject(ActivatedRoute)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly invalidId = signal(false)
  protected readonly defectModel = signal({ dueDate: '', description: '' })
  protected readonly defectForm = form(this.defectModel, schema => {
    required(schema.dueDate)
    validate(schema.dueDate, ({ value }) =>
      isCalendarDate(value()) ? null : { kind: 'date', message: 'date' },
    )
    required(schema.description)
    maxLength(schema.description, 300)
    validate(schema.description, ({ value }) =>
      value().trim() ? null : { kind: 'required', message: 'required' },
    )
    disabled(schema.dueDate, () => this.savingDefect())
    disabled(schema.description, () => this.savingDefect())
  })
  protected readonly defectError = signal<string | null>(null)
  protected readonly defectSaved = signal(false)
  protected readonly savingAction = signal(false)
  protected readonly actionModel = signal({ completedAt: '', description: '' })
  protected readonly actionForm = form(this.actionModel, schema => {
    required(schema.completedAt)
    validate(schema.completedAt, ({ value }) =>
      isCalendarDate(value()) ? null : { kind: 'date', message: 'date' },
    )
    required(schema.description)
    maxLength(schema.description, 300)
    validate(schema.description, ({ value }) =>
      value().trim() ? null : { kind: 'required', message: 'required' },
    )
    disabled(schema.completedAt, () => this.savingAction())
    disabled(schema.description, () => this.savingAction())
  })
  protected readonly actionError = signal<string | null>(null)
  protected readonly actionSaved = signal(false)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private currentId: InspectionId | null = null

  constructor() {
    effect(() => {
      const companyId = this.scope()
      const id = parseInspectionRouteId(this.params().get('id'))
      this.invalidId.set(id === null)
      if (id === null || companyId === null) {
        untracked(() => this.store.clear())
        this.currentId = null
        this.defectForm().reset()
        this.defectModel.set({ dueDate: '', description: '' })
        this.statusForm().reset()
        this.statusModel.set({ statusTypeId: '', confirmed: false })
        this.statusError.set(null)
        this.statusUpdated.set(false)
        this.actionForm().reset()
        this.actionModel.set({ completedAt: '', description: '' })
        return
      }
      let selectedId: InspectionId
      try {
        selectedId = inspectionId(id)
      } catch {
        this.invalidId.set(true)
        return
      }
      this.currentId = selectedId
      untracked(() => {
        this.defectForm().reset()
        this.defectModel.set({ dueDate: '', description: '' })
        this.statusForm().reset()
        this.statusModel.set({ statusTypeId: '', confirmed: false })
        this.statusError.set(null)
        this.statusUpdated.set(false)
        this.actionForm().reset()
        this.actionModel.set({ completedAt: '', description: '' })
        this.defectError.set(null)
        this.actionError.set(null)
        this.store.loadDetail(selectedId)
      })
    })
  }

  protected t(key: InspectionTextKey): string {
    return inspectionText(this.language(), key)
  }
  protected label(check: InspectionCheck): InspectionTextKey {
    return checkLabels[check]
  }

  protected saveStatus(event: Event) {
    event.preventDefault()
    if (!this.currentId || this.savingStatus()) return
    this.statusError.set(null)
    this.statusUpdated.set(false)
    submit(this.statusForm, async () => {
      const id = this.currentId
      const statusTypeId = Number(this.statusModel().statusTypeId)
      if (id === null || ![1, 2, 3].includes(statusTypeId) || !this.statusModel().confirmed) return
      this.savingStatus.set(true)
      this.changeDetector.detectChanges()
      try {
        await firstValueFrom(this.store.setStatus(id, statusTypeId))
        this.statusUpdated.set(true)
        this.store.loadDetail(id)
        if (this.store.visits() !== null) {
          this.store.load({
            pageNumber: this.store.pageNumber(),
            pageSize: this.store.pageSize(),
            orderBy: this.store.orderBy(),
          })
        }
      } catch {
        this.statusError.set(this.t('statusUpdateFailed'))
      } finally {
        this.savingStatus.set(false)
        this.changeDetector.detectChanges()
      }
    })
    if (this.statusForm().invalid()) this.statusError.set(this.t('confirmStatus'))
  }

  protected saveDefect(event: Event) {
    event.preventDefault()
    if (!this.currentId || this.savingDefect()) return
    this.defectError.set(null)
    this.defectSaved.set(false)
    submit(this.defectForm, async () => {
      const id = this.currentId
      if (id === null) return
      this.savingDefect.set(true)
      this.changeDetector.detectChanges()
      try {
        await firstValueFrom(
          this.store.addDefect({
            id: 0,
            inspectionVisitId: id,
            dueDate: this.defectModel().dueDate,
            description: this.defectModel().description.trim(),
          }),
        )
        this.defectForm().reset()
        this.defectModel.set({ dueDate: '', description: '' })
        this.defectSaved.set(true)
      } catch {
        this.defectError.set(this.t('saveFailed'))
      } finally {
        this.savingDefect.set(false)
        this.changeDetector.detectChanges()
      }
    })
    if (this.defectForm().invalid())
      this.defectError.set(this.t('dateRequired') + ' ' + this.t('descriptionRequired'))
  }

  protected saveAction(event: Event) {
    event.preventDefault()
    if (!this.currentId || this.savingAction()) return
    this.actionError.set(null)
    this.actionSaved.set(false)
    submit(this.actionForm, async () => {
      const id = this.currentId
      if (id === null) return
      this.savingAction.set(true)
      this.changeDetector.detectChanges()
      try {
        await firstValueFrom(
          this.store.addCorrectiveAction({
            id: 0,
            inspectionVisitId: id,
            completedAt: this.actionModel().completedAt,
            description: this.actionModel().description.trim(),
          }),
        )
        this.actionForm().reset()
        this.actionModel.set({ completedAt: '', description: '' })
        this.actionSaved.set(true)
      } catch {
        this.actionError.set(this.t('saveFailed'))
      } finally {
        this.savingAction.set(false)
        this.changeDetector.detectChanges()
      }
    })
    if (this.actionForm().invalid())
      this.actionError.set(this.t('dateRequired') + ' ' + this.t('descriptionRequired'))
  }
}

function isCalendarDate(value: string): boolean {
  try {
    inspectionDate(value)
    return true
  } catch {
    return false
  }
}
