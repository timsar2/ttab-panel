import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
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
import { HlmButton } from '@spartan-ng/helm/button'
import { JalaliDatePicker } from '@org/ui-forms'
import { firstValueFrom } from 'rxjs'
import {
  InspectionCheck,
  InspectionId,
  InspectionStore,
  INSPECTION_CHECKS,
  inspectionCheckAnswerLabel,
  inspectionDate,
  inspectionId,
  inspectionStatusLabel,
} from '@org/transport-inspection-data-access'
import { INSPECTOR_COMPANY_ID, INSPECTOR_LANGUAGE } from '../inspector.routes'
import { inspectorText, InspectorTextKey } from '../inspector-text'

const checkLabels: Record<InspectionCheck, InspectorTextKey> = {
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

function routeId(value: string | null): InspectionId | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null
  const number = Number(value)
  if (!Number.isSafeInteger(number)) return null
  try {
    return inspectionId(number)
  } catch {
    return null
  }
}

@Component({
  selector: 'lib-inspector-visit-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButton, FormField, JalaliDatePicker],
  host: { class: 'mx-auto block min-w-0 max-w-6xl p-4 md:p-8' },
  template: `
    <a hlmBtn variant="outline" class="mb-5 min-h-11" routerLink="/inspections/new">{{
      t('back')
    }}</a>
    @if (invalidId()) {
      <p role="alert">{{ t('notFound') }}</p>
    } @else if (companyId() === null) {
      <p role="status">{{ t('selectCompany') }}</p>
    } @else if (store.detailStatus() === 'loading') {
      <div class="bg-card flex min-h-40 items-center justify-center rounded-2xl border p-6">
        <p class="text-muted-foreground" role="status">{{ t('loading') }}</p>
      </div>
    } @else if (store.detailStatus() === 'denied' || store.detailStatus() === 'not-found') {
      <p role="alert">{{ t('notFound') }}</p>
    } @else if (store.detailStatus() === 'error') {
      <div
        class="border-destructive/30 bg-destructive/5 text-destructive rounded-2xl border p-5"
        role="alert"
      >
        <p>{{ t('detailError') }}</p>
        <button hlmBtn variant="outline" class="mt-3" type="button" (click)="retryDetail()">
          {{ t('retry') }}
        </button>
      </div>
    } @else if (store.detail(); as detail) {
      <div class="grid min-w-0 gap-5 md:gap-6">
        <header class="bg-card overflow-hidden rounded-2xl border shadow-sm">
          <div
            class="from-primary/10 via-primary/5 border-b bg-gradient-to-l to-transparent px-5 py-6 md:px-7 md:py-8"
          >
            <p class="text-primary text-sm font-semibold">{{ t('title') }}</p>
            <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
              <h1 class="text-2xl font-bold tracking-tight md:text-3xl">
                {{ t('detailTitle') }}
              </h1>
              <span
                class="bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold"
                dir="ltr"
              >
                #{{ detail.id }}
              </span>
            </div>
          </div>
          <dl class="grid gap-3 p-4 sm:grid-cols-2 md:p-6 xl:grid-cols-3">
            <div class="bg-muted/30 min-w-0 rounded-xl p-4">
              <dt class="text-muted-foreground text-sm font-medium">{{ t('inspectionDate') }}</dt>
              <dd class="mt-2 text-base font-semibold tabular-nums" dir="ltr">
                {{ detail.inspectionDate }}
              </dd>
            </div>
            <div class="bg-muted/30 min-w-0 rounded-xl p-4">
              <dt class="text-muted-foreground text-sm font-medium">{{ t('driver') }}</dt>
              <dd class="mt-2 truncate text-base font-semibold">
                {{ detail.driverName || '#' + detail.driverId }}
              </dd>
            </div>
            <div class="bg-muted/30 min-w-0 rounded-xl p-4">
              <dt class="text-muted-foreground text-sm font-medium">{{ t('vehicle') }}</dt>
              <dd class="mt-2 text-base font-semibold" dir="auto">
                {{ detail.carPlate || '#' + detail.vehicleId }}
              </dd>
            </div>
            <div
              class="border-primary/20 bg-primary/5 flex min-w-0 items-start gap-3 rounded-xl border p-4 sm:col-span-2 xl:col-span-3"
            >
              <span class="bg-primary mt-1 size-2 shrink-0 rounded-full" aria-hidden="true"></span>
              <div class="min-w-0">
                <dt class="text-muted-foreground text-sm font-medium">{{ t('status') }}</dt>
                <dd class="mt-2 leading-6">
                  <span
                    class="bg-primary/10 text-primary inline-flex rounded-full px-3 py-1 text-sm font-semibold"
                  >
                    {{ statusLabel(detail.statusTypeName ?? detail.statusTypeId) }}
                  </span>
                </dd>
              </div>
            </div>
          </dl>
        </header>

        <section
          class="bg-card rounded-2xl border p-4 shadow-sm md:p-6"
          aria-labelledby="inspector-checks-heading"
        >
          <div class="mb-5 flex flex-wrap items-end justify-between gap-2 border-b pb-4">
            <div>
              <h2
                id="inspector-checks-heading"
                class="text-xl font-bold tracking-tight md:text-2xl"
              >
                {{ t('checks') }}
              </h2>
              <p class="text-muted-foreground mt-1 text-sm">{{ t('checksIntro') }}</p>
            </div>
            <span
              class="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold"
            >
              {{ checks.length }}
            </span>
          </div>
          <dl class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            @for (check of checks; track check) {
              <div
                class="flex min-w-0 items-center justify-between gap-3 rounded-xl border p-4 transition-colors"
                [class.border-emerald-500/30]="detail[check]"
                [class.bg-emerald-500/5]="detail[check]"
                [class.border-amber-500/30]="!detail[check]"
                [class.bg-amber-500/5]="!detail[check]"
              >
                <dt class="min-w-0 text-sm leading-5 font-medium">{{ t(label(check)) }}</dt>
                <dd
                  class="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
                  [class.bg-emerald-500/10]="detail[check]"
                  [class.text-emerald-700]="detail[check]"
                  [class.dark:text-emerald-300]="detail[check]"
                  [class.bg-amber-500/10]="!detail[check]"
                  [class.text-amber-800]="!detail[check]"
                  [class.dark:text-amber-300]="!detail[check]"
                >
                  {{ t(inspectionCheckAnswerLabel(check, detail[check])) }}
                </dd>
              </div>
            }
          </dl>
          <div class="bg-muted/30 mt-5 rounded-xl p-4 md:p-5">
            <h3 class="text-muted-foreground text-sm font-semibold">{{ t('description') }}</h3>
            <p class="mt-2 leading-7 break-words whitespace-pre-wrap">
              {{ detail.description || t('noItems') }}
            </p>
          </div>
        </section>

        <div class="grid gap-5 xl:grid-cols-2">
          <section
            class="bg-card min-w-0 rounded-2xl border p-4 shadow-sm md:p-6"
            aria-labelledby="inspector-required-actions-heading"
          >
            <div class="border-b pb-4">
              <h2 id="inspector-required-actions-heading" class="text-lg font-bold md:text-xl">
                {{ t('defects') }}
              </h2>
            </div>
            @if (!detail.defects.length) {
              <p class="text-muted-foreground mt-4 rounded-xl border border-dashed p-5 text-sm">
                {{ t('noItems') }}
              </p>
            }
            <ul class="mt-4 grid gap-3">
              @for (defect of detail.defects; track defect.id) {
                <li class="bg-muted/30 min-w-0 rounded-xl p-4">
                  <p class="text-muted-foreground text-xs font-medium">{{ t('dueDate') }}</p>
                  <p class="mt-1 text-sm font-semibold tabular-nums" dir="ltr">
                    {{ defect.dueDate }}
                  </p>
                  <p class="mt-3 leading-6 break-words whitespace-pre-wrap">
                    {{ defect.description }}
                  </p>
                </li>
              }
            </ul>
            @if (
              store.detailStatus() === 'ready' &&
              !isApproved(detail.statusTypeName, detail.statusTypeId)
            ) {
              <form
                id="inspection-required-action-form"
                class="mt-5 grid gap-3 border-t pt-5"
                novalidate
                (submit)="saveRequiredAction($event, detail.id)"
              >
                <h3 class="font-semibold">{{ t('recordRequiredAction') }}</h3>
                <label class="grid gap-2 text-sm" for="inspection-due-date">{{
                  t('dueDate')
                }}</label>
                <lib-jalali-date-picker
                  inputId="inspection-due-date"
                  [language]="language()"
                  [value]="requiredActionModel().dueDate"
                  [disabled]="savingAction()"
                  (valueChange)="setRequiredActionDate($event)"
                />
                <label class="grid gap-2 text-sm" for="inspection-required-action-description">{{
                  t('requiredAction')
                }}</label>
                <textarea
                  id="inspection-required-action-description"
                  class="bg-background min-h-24 rounded-md border p-3"
                  [formField]="requiredActionForm.description"
                ></textarea>
                @if (requiredActionForm().touched() && requiredActionForm().invalid()) {
                  <p role="alert">{{ t('dateRequired') }} {{ t('descriptionRequired') }}</p>
                }
                @if (actionError()) {
                  <p role="alert">{{ t('actionError') }}</p>
                }
                @if (actionSaved()) {
                  <p role="status">{{ t('actionSaved') }}</p>
                }
                <button
                  hlmBtn
                  class="min-h-11 justify-self-start"
                  type="submit"
                  [disabled]="savingAction()"
                >
                  {{ savingAction() ? t('saving') : t('recordRequiredAction') }}
                </button>
              </form>
            }
          </section>
          <section
            class="bg-card min-w-0 rounded-2xl border p-4 shadow-sm md:p-6"
            aria-labelledby="inspector-corrective-actions-heading"
          >
            <div class="border-b pb-4">
              <h2 id="inspector-corrective-actions-heading" class="text-lg font-bold md:text-xl">
                {{ t('correctiveActions') }}
              </h2>
            </div>
            @if (!detail.correctiveActions.length) {
              <p class="text-muted-foreground mt-4 rounded-xl border border-dashed p-5 text-sm">
                {{ t('noCorrectiveActions') }}
              </p>
            }
            <ul class="mt-4 grid gap-3">
              @for (action of detail.correctiveActions; track action.id) {
                <li class="bg-muted/30 min-w-0 rounded-xl p-4">
                  <p class="text-muted-foreground text-xs font-medium">{{ t('completedAt') }}</p>
                  <p class="mt-1 text-sm font-semibold tabular-nums" dir="ltr">
                    {{ action.completedAt }}
                  </p>
                  <p class="mt-3 leading-6 break-words whitespace-pre-wrap">
                    {{ action.description }}
                  </p>
                </li>
              }
            </ul>
          </section>
        </div>
        @if (isPendingApproval(detail.statusTypeName, detail.statusTypeId)) {
          <section class="bg-card rounded-2xl border p-4 shadow-sm md:p-6">
            <button
              id="inspection-approve"
              hlmBtn
              class="min-h-11"
              type="button"
              [disabled]="approving()"
              (click)="approveVisit(detail.id)"
            >
              {{ approving() ? t('saving') : t('closeRequest') }}
            </button>
            @if (approvalSaved()) {
              <p class="mt-3" role="status">{{ t('approved') }}</p>
            }
            @if (approvalError()) {
              <p class="text-destructive mt-3" role="alert">{{ t('approvalError') }}</p>
            }
          </section>
        }
      </div>
    }
  `,
})
export class InspectorVisitDetailPage {
  protected readonly language = inject(INSPECTOR_LANGUAGE)
  protected readonly companyId = inject(INSPECTOR_COMPANY_ID)
  protected readonly store = inject(InspectionStore)
  protected readonly checks = INSPECTION_CHECKS
  protected readonly invalidId = signal(false)
  protected readonly savingAction = signal(false)
  protected readonly actionError = signal(false)
  protected readonly actionSaved = signal(false)
  protected readonly approving = signal(false)
  protected readonly approvalError = signal(false)
  protected readonly approvalSaved = signal(false)
  protected readonly requiredActionModel = signal({ dueDate: '', description: '' })
  protected readonly requiredActionForm = form(this.requiredActionModel, schema => {
    required(schema.dueDate)
    validate(schema.dueDate, ({ value }) =>
      isCalendarDate(value()) ? null : { kind: 'date', message: 'date' },
    )
    required(schema.description)
    maxLength(schema.description, 300)
    validate(schema.description, ({ value }) =>
      value().trim() ? null : { kind: 'required', message: 'required' },
    )
    disabled(schema.dueDate, () => this.savingAction())
    disabled(schema.description, () => this.savingAction())
  })
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly route = inject(ActivatedRoute)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })

  constructor() {
    effect(() => {
      const companyId = this.companyId()
      const id = routeId(this.params().get('id'))
      this.invalidId.set(id === null)
      if (id === null || companyId === null) {
        untracked(() => {
          this.store.clear()
          this.requiredActionForm().reset()
          this.requiredActionModel.set({ dueDate: '', description: '' })
        })
        return
      }
      untracked(() => {
        this.store.loadDetail(id)
        this.requiredActionForm().reset()
        this.requiredActionModel.set({ dueDate: '', description: '' })
      })
    })
  }

  protected t(key: InspectorTextKey): string {
    return inspectorText(this.language(), key)
  }
  protected label(check: InspectionCheck): InspectorTextKey {
    return checkLabels[check]
  }
  protected inspectionCheckAnswerLabel = inspectionCheckAnswerLabel
  protected isApproved(value: string | null, id: number | null): boolean {
    return value?.trim().toLowerCase() === 'approved' || (value === null && id === 3)
  }
  protected isPendingApproval(value: string | null, id: number | null): boolean {
    return value?.trim().toLowerCase() === 'pending approval' || (value === null && id === 2)
  }
  protected setRequiredActionDate(dueDate: string | null) {
    this.requiredActionModel.update(model => ({ ...model, dueDate: dueDate ?? '' }))
  }
  protected statusLabel(value: string | number | null): string {
    return inspectionStatusLabel(value, this.language())
  }
  protected retryDetail() {
    const id = routeId(this.params().get('id'))
    if (id !== null && this.companyId() !== null) this.store.loadDetail(id)
  }

  protected saveRequiredAction(event: Event, id: InspectionId) {
    event.preventDefault()
    if (this.savingAction()) return
    this.actionError.set(false)
    this.actionSaved.set(false)
    submit(this.requiredActionForm, async () => {
      this.savingAction.set(true)
      this.changeDetector.detectChanges()
      try {
        const model = this.requiredActionModel()
        await firstValueFrom(
          this.store.addDefect({
            id: 0,
            inspectionVisitId: id,
            dueDate: model.dueDate,
            description: model.description.trim(),
          }),
        )
        this.refreshList()
        this.store.loadDetail(id)
        this.requiredActionForm().reset()
        this.requiredActionModel.set({ dueDate: '', description: '' })
        this.actionSaved.set(true)
      } catch {
        this.actionError.set(true)
      } finally {
        this.savingAction.set(false)
        this.changeDetector.detectChanges()
      }
    })
    if (this.requiredActionForm().invalid()) this.actionError.set(true)
  }

  protected async approveVisit(id: InspectionId) {
    if (this.approving() || !globalThis.confirm(this.t('closeRequest'))) return
    this.approving.set(true)
    this.approvalError.set(false)
    this.approvalSaved.set(false)
    this.changeDetector.detectChanges()
    try {
      await firstValueFrom(this.store.approveVisit(id))
      this.refreshList()
      this.store.loadDetail(id)
      this.approvalSaved.set(true)
    } catch {
      this.approvalError.set(true)
    } finally {
      this.approving.set(false)
      this.changeDetector.detectChanges()
    }
  }

  private refreshList() {
    this.store.load({
      pageNumber: this.store.pageNumber(),
      pageSize: this.store.pageSize(),
      orderBy: this.store.orderBy(),
    })
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
