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
      <p
        class="border-destructive/30 bg-destructive/5 text-destructive rounded-2xl border p-5"
        role="alert"
      >
        {{ t('detailError') }}
      </p>
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
                <dd class="mt-1 leading-6">{{ detail.statusTypeId || t('statusUnavailable') }}</dd>
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
                  {{ detail[check] ? t('trueValue') : t('falseValue') }}
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
            aria-labelledby="inspector-defects-heading"
          >
            <div class="border-b pb-4">
              <h2 id="inspector-defects-heading" class="text-lg font-bold md:text-xl">
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
          </section>
          <section
            class="bg-card min-w-0 rounded-2xl border p-4 shadow-sm md:p-6"
            aria-labelledby="inspector-actions-heading"
          >
            <div class="border-b pb-4">
              <h2 id="inspector-actions-heading" class="text-lg font-bold md:text-xl">
                {{ t('correctiveActions') }}
              </h2>
            </div>
            @if (!detail.correctiveActions.length) {
              <p class="text-muted-foreground mt-4 rounded-xl border border-dashed p-5 text-sm">
                {{ t('noItems') }}
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
