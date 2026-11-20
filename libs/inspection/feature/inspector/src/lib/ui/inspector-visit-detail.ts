import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { HlmButton } from '@spartan-ng/helm/button'
import {
  InspectionCheck,
  InspectionId,
  InspectionStore,
  INSPECTION_CHECKS,
  inspectionId,
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
  imports: [RouterLink, HlmButton],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <a hlmBtn variant="outline" class="mb-6 min-h-11" routerLink="/inspections/new">{{
      t('back')
    }}</a>
    @if (invalidId()) {
      <p role="alert">{{ t('notFound') }}</p>
    } @else if (companyId() === null) {
      <p role="status">{{ t('selectCompany') }}</p>
    } @else if (store.detailStatus() === 'loading') {
      <p role="status">{{ t('loading') }}</p>
    } @else if (store.detailStatus() === 'denied' || store.detailStatus() === 'not-found') {
      <p role="alert">{{ t('notFound') }}</p>
    } @else if (store.detailStatus() === 'error') {
      <p role="alert">{{ t('detailError') }}</p>
    } @else if (store.detail(); as detail) {
      <header class="mb-6 rounded-xl border p-5">
        <h1 class="text-2xl font-semibold">{{ t('detailTitle') }} #{{ detail.id }}</h1>
        <dl class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt class="text-muted-foreground text-sm">{{ t('inspectionDate') }}</dt>
            <dd dir="ltr">{{ detail.inspectionDate }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">{{ t('driver') }}</dt>
            <dd>{{ detail.driverName || '#' + detail.driverId }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">{{ t('vehicle') }}</dt>
            <dd>{{ detail.carPlate || '#' + detail.vehicleId }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">{{ t('status') }}</dt>
            <dd>{{ detail.statusTypeId || t('statusUnavailable') }}</dd>
          </div>
        </dl>
      </header>
      <section class="mb-6 rounded-xl border p-5" aria-labelledby="inspector-checks-heading">
        <h2 id="inspector-checks-heading" class="text-lg font-semibold">{{ t('checks') }}</h2>
        <dl class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
        <section class="rounded-xl border p-5" aria-labelledby="inspector-defects-heading">
          <h2 id="inspector-defects-heading" class="text-lg font-semibold">{{ t('defects') }}</h2>
          @if (!detail.defects.length) {
            <p class="text-muted-foreground mt-3">{{ t('noItems') }}</p>
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
        <section class="rounded-xl border p-5" aria-labelledby="inspector-actions-heading">
          <h2 id="inspector-actions-heading" class="text-lg font-semibold">
            {{ t('correctiveActions') }}
          </h2>
          @if (!detail.correctiveActions.length) {
            <p class="text-muted-foreground mt-3">{{ t('noItems') }}</p>
          }
          <ul class="mt-3 grid gap-3">
            @for (action of detail.correctiveActions; track action.id) {
              <li class="bg-muted/30 rounded-lg p-4">
                <p dir="ltr">{{ t('completedAt') }}: {{ action.completedAt }}</p>
                <p class="mt-2 whitespace-pre-wrap">{{ action.description }}</p>
              </li>
            }
          </ul>
        </section>
      </section>
    }
  `,
})
export class InspectorVisitDetailPage {
  protected readonly language = inject(INSPECTOR_LANGUAGE)
  protected readonly companyId = inject(INSPECTOR_COMPANY_ID)
  protected readonly store = inject(InspectionStore)
  protected readonly checks = INSPECTION_CHECKS
  protected readonly invalidId = signal(false)
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
        untracked(() => this.store.clear())
        return
      }
      untracked(() => this.store.loadDetail(id))
    })
  }

  protected t(key: InspectorTextKey): string {
    return inspectorText(this.language(), key)
  }
  protected label(check: InspectionCheck): InspectorTextKey {
    return checkLabels[check]
  }
}
