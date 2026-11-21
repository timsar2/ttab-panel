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
  inspectionCheckAnswerLabel,
  inspectionStatusLabel,
  InspectionStore,
} from '@org/transport-inspection-data-access'
import { HlmButton } from '@spartan-ng/helm/button'
import { JalaliDatePicker } from '@org/ui-forms'
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
  imports: [RouterLink, HlmButton, FormField, JalaliDatePicker],
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
      <div role="alert" class="grid justify-items-start gap-3">
        <p>{{ t('detailFailed') }}</p>
        <button hlmBtn variant="outline" type="button" (click)="retryDetail()">
          {{ t('retry') }}
        </button>
      </div>
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
        <section
          class="bg-muted/30 mt-5 rounded-lg p-4"
          aria-labelledby="inspection-status-heading"
        >
          <h2 id="inspection-status-heading" class="font-medium">{{ t('status') }}</h2>
          <p class="mt-2">
            <span
              class="bg-primary/10 text-primary inline-flex rounded-full px-3 py-1 text-sm font-semibold"
            >
              {{ statusLabel(detail.statusTypeName ?? detail.statusTypeId) }}
            </span>
          </p>
        </section>
      </header>
      <section class="mb-6 rounded-xl border p-5" aria-labelledby="inspection-checks-heading">
        <h2 id="inspection-checks-heading" class="text-lg font-semibold">{{ t('checks') }}</h2>
        <dl class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (check of checks; track check) {
            <div class="bg-muted/30 rounded-lg p-3">
              <dt class="text-sm">{{ t(label(check)) }}</dt>
              <dd class="mt-1 font-medium">
                {{ t(inspectionCheckAnswerLabel(check, detail[check])) }}
              </dd>
            </div>
          }
        </dl>
        <h3 class="mt-5 font-medium">{{ t('description') }}</h3>
        <p class="mt-2 whitespace-pre-wrap">{{ detail.description }}</p>
      </section>
      <section class="mb-6 rounded-xl border p-5" aria-labelledby="inspection-defects-heading">
        <h2 id="inspection-defects-heading" class="text-lg font-semibold">{{ t('defects') }}</h2>
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
      </section>
      <section class="rounded-xl border p-5">
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
            ><lib-jalali-date-picker
              inputId="inspection-completed-at"
              [language]="language()"
              [value]="actionModel().completedAt"
              [disabled]="savingAction()"
              (valueChange)="setCompletedAt($event)"
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
  private readonly route = inject(ActivatedRoute)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly invalidId = signal(false)
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
        this.actionForm().reset()
        this.actionModel.set({ completedAt: '', description: '' })
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
  protected inspectionCheckAnswerLabel = inspectionCheckAnswerLabel
  protected statusLabel(value: string | number | null): string {
    return inspectionStatusLabel(value, this.language())
  }
  protected setCompletedAt(completedAt: string | null) {
    this.actionModel.update(model => ({ ...model, completedAt: completedAt ?? '' }))
  }
  protected retryDetail() {
    if (this.currentId !== null) this.store.loadDetail(this.currentId)
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
        this.store.loadDetail(id)
        this.store.load({
          pageNumber: this.store.pageNumber(),
          pageSize: this.store.pageSize(),
          orderBy: this.store.orderBy(),
        })
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
