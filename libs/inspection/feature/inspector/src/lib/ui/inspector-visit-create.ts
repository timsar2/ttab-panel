import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { HlmButton } from '@spartan-ng/helm/button'
import {
  InspectionCheck,
  InspectionStore,
  InspectionVisitDraft,
  INSPECTION_CHECKS,
  inspectionDate,
  inspectionId,
} from '@org/transport-inspection-data-access'
import { firstValueFrom, Subscription } from 'rxjs'
import {
  INSPECTOR_COMPANY_ID,
  INSPECTOR_LANGUAGE,
  INSPECTOR_LOOKUPS,
  InspectorLookupOption,
} from '../inspector.routes'
import { inspectorText, InspectorTextKey } from '../inspector-text'

type CheckAnswer = '' | 'true' | 'false'
type VisitFormModel = {
  readonly driverId: string
  readonly vehicleId: string
  readonly inspectionDate: string
  readonly description: string
} & Readonly<Record<InspectionCheck, CheckAnswer>>

function emptyVisit(): VisitFormModel {
  return {
    driverId: '',
    vehicleId: '',
    inspectionDate: '',
    description: '',
    ...Object.fromEntries(INSPECTION_CHECKS.map(check => [check, ''])),
  } as VisitFormModel
}

function validDate(value: string): boolean {
  try {
    inspectionDate(value)
    return true
  } catch {
    return false
  }
}

function positiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : null
}

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

@Component({
  selector: 'lib-inspector-visit-create-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButton, FormField],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <a hlmBtn variant="outline" class="mb-6 min-h-11" [routerLink]="['/workspace']">{{
      t('back')
    }}</a>
    @if (companyId() === null) {
      <p class="border-destructive/40 bg-destructive/5 rounded-lg border p-4 text-sm" role="alert">
        {{ t('selectCompany') }}
      </p>
    } @else {
      <header class="mb-6 max-w-3xl">
        <p class="text-primary mb-2 text-sm font-medium">{{ t('checks') }}</p>
        <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">{{ t('title') }}</h1>
        <p class="text-muted-foreground mt-2 text-sm leading-6">{{ t('createIntro') }}</p>
      </header>
      <form id="inspection-create-form" class="grid gap-5" novalidate (submit)="save($event)">
        <section
          class="bg-card rounded-xl border p-4 shadow-sm md:p-6"
          aria-labelledby="inspector-details-heading"
        >
          <div class="mb-5 border-b pb-4">
            <h2 id="inspector-details-heading" class="text-lg font-semibold">
              {{ t('visitDetails') }}
            </h2>
            <p class="text-muted-foreground mt-1 text-sm">{{ t('visitDetailsIntro') }}</p>
          </div>
          <div class="grid gap-x-5 gap-y-4 md:grid-cols-2">
            <div class="grid min-w-0 content-start gap-2">
              <label for="inspector-driver-search" class="text-sm font-medium">{{
                t('searchDrivers')
              }}</label>
              <div class="flex min-w-0 gap-2">
                <input
                  id="inspector-driver-search"
                  class="bg-background focus-visible:ring-ring min-h-11 min-w-0 flex-1 rounded-md border px-3 text-sm transition outline-none focus-visible:ring-2"
                  [value]="driverQuery()"
                  (input)="driverQuery.set($any($event.target).value)"
                  (keydown.enter)="$event.preventDefault(); searchDrivers()"
                />
                <button
                  hlmBtn
                  variant="outline"
                  class="min-h-11 shrink-0"
                  type="button"
                  [disabled]="searchingDrivers()"
                  (click)="searchDrivers()"
                >
                  {{ t('find') }}
                </button>
              </div>
              @if (searchingDrivers()) {
                <p class="text-muted-foreground text-sm" role="status">{{ t('loading') }}</p>
              }
              <label for="inspector-driver" class="mt-2 text-sm font-medium">{{
                t('driver')
              }}</label>
              <select
                id="inspector-driver"
                class="bg-background focus-visible:ring-ring min-h-11 w-full rounded-md border px-3 text-sm transition outline-none focus-visible:ring-2"
                [formField]="visitForm.driverId"
              >
                <option value="">{{ t('driverPlaceholder') }}</option>
                @for (driver of drivers(); track driver.id) {
                  <option [value]="driver.id">{{ driver.label }}</option>
                }
              </select>
              @if (!searchingDrivers() && !drivers().length) {
                <p class="text-muted-foreground text-sm">{{ t('noDrivers') }}</p>
              }
            </div>
            <div class="grid min-w-0 content-start gap-2">
              <label for="inspector-vehicle" class="text-sm font-medium">{{ t('vehicle') }}</label>
              <select
                id="inspector-vehicle"
                class="bg-background focus-visible:ring-ring min-h-11 w-full rounded-md border px-3 text-sm transition outline-none focus-visible:ring-2"
                [formField]="visitForm.vehicleId"
              >
                <option value="">{{ t('vehiclePlaceholder') }}</option>
                @for (vehicle of vehicles(); track vehicle.id) {
                  <option [value]="vehicle.id">{{ vehicle.label }}</option>
                }
              </select>
              @if (loadingVehicles()) {
                <p class="text-muted-foreground text-sm" role="status">{{ t('loading') }}</p>
              }
              @if (!loadingVehicles() && !vehicles().length) {
                <p class="text-muted-foreground text-sm">{{ t('noVehicles') }}</p>
              }
              <nav class="mt-1 flex gap-2" [attr.aria-label]="t('vehiclePages')">
                <button
                  hlmBtn
                  variant="outline"
                  type="button"
                  class="min-h-11"
                  [disabled]="loadingVehicles() || vehiclePage() <= 1"
                  (click)="loadVehiclePage(vehiclePage() - 1)"
                >
                  {{ t('previousPage') }}
                </button>
                <button
                  hlmBtn
                  variant="outline"
                  type="button"
                  class="min-h-11"
                  [disabled]="loadingVehicles() || !vehicleHasNext()"
                  (click)="loadVehiclePage(vehiclePage() + 1)"
                >
                  {{ t('nextPage') }}
                </button>
              </nav>
            </div>
            <label class="grid content-start gap-2 text-sm font-medium" for="inspector-date"
              >{{ t('inspectionDate')
              }}<input
                id="inspector-date"
                class="bg-background focus-visible:ring-ring min-h-11 rounded-md border px-3 text-sm font-normal transition outline-none focus-visible:ring-2"
                type="date"
                [formField]="visitForm.inspectionDate"
            /></label>
            <label class="grid content-start gap-2 text-sm font-medium" for="inspector-description"
              >{{ t('description')
              }}<textarea
                id="inspector-description"
                class="bg-background focus-visible:ring-ring min-h-28 rounded-md border p-3 text-sm font-normal transition outline-none focus-visible:ring-2"
                [formField]="visitForm.description"
                [attr.maxlength]="1000"
              ></textarea
              ><span class="text-muted-foreground text-xs font-normal" aria-hidden="true"
                >{{ model().description.length }}/1000</span
              ></label
            >
          </div>
          @if (lookupError()) {
            <p
              class="border-destructive/40 bg-destructive/5 text-destructive mt-4 rounded-md border p-3 text-sm"
              role="alert"
            >
              {{ t('lookupError') }}
            </p>
          }
        </section>
        <section
          class="bg-card rounded-xl border p-4 shadow-sm md:p-6"
          aria-labelledby="inspector-checks-heading"
        >
          <div class="mb-5 border-b pb-4">
            <h2 id="inspector-checks-heading" class="text-lg font-semibold">{{ t('checks') }}</h2>
            <p class="text-muted-foreground mt-1 text-sm">{{ t('checksIntro') }}</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            @for (check of checks; track check) {
              <fieldset
                class="bg-muted/20 focus-within:border-primary/50 focus-within:bg-muted/40 grid min-w-0 gap-2 rounded-lg border p-3 transition-colors"
              >
                <legend class="text-sm font-medium">{{ t(label(check)) }}</legend>
                <div class="flex flex-wrap gap-x-3 gap-y-1">
                  <label
                    class="hover:bg-background focus-within:ring-ring inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm focus-within:ring-2"
                    ><input
                      class="accent-primary size-4"
                      type="radio"
                      value="true"
                      [formField]="visitForm[check]"
                    />{{ t(positiveAnswer(check)) }}</label
                  >
                  <label
                    class="hover:bg-background focus-within:ring-ring inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm focus-within:ring-2"
                    ><input
                      class="accent-primary size-4"
                      type="radio"
                      value="false"
                      [formField]="visitForm[check]"
                    />{{ t(negativeAnswer(check)) }}</label
                  >
                </div>
              </fieldset>
            }
          </div>
        </section>
        @if (formError(); as errorKey) {
          <p
            class="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
            role="alert"
          >
            {{ t(errorKey) }}
          </p>
        }
        <div class="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
          <button
            id="inspector-visit-submit"
            hlmBtn
            class="min-h-11 w-full px-6 sm:w-auto"
            type="submit"
            [disabled]="saving()"
          >
            {{ saving() ? t('saving') : t('submit') }}
          </button>
        </div>
      </form>
    }
  `,
})
export class InspectorVisitCreatePage {
  protected readonly language = inject(INSPECTOR_LANGUAGE)
  protected readonly companyId = inject(INSPECTOR_COMPANY_ID)
  protected readonly store = inject(InspectionStore)
  protected readonly checks = INSPECTION_CHECKS
  protected readonly drivers = signal<readonly InspectorLookupOption[]>([])
  protected readonly vehicles = signal<readonly InspectorLookupOption[]>([])
  protected readonly driverQuery = signal('')
  protected readonly model = signal(emptyVisit())
  protected readonly saving = signal(false)
  protected readonly searchingDrivers = signal(false)
  protected readonly loadingVehicles = signal(false)
  protected readonly vehiclePage = signal(1)
  protected readonly vehicleHasNext = signal(false)
  protected readonly lookupError = signal(false)
  protected readonly formError = signal<InspectorTextKey | null>(null)
  private readonly changeDetector = inject(ChangeDetectorRef)
  protected readonly visitForm = form(this.model, schema => {
    required(schema.driverId)
    required(schema.vehicleId)
    required(schema.inspectionDate)
    validate(schema.inspectionDate, ({ value }) =>
      validDate(value()) ? null : { kind: 'date', message: 'date' },
    )
    required(schema.description)
    maxLength(schema.description, 1000)
    validate(schema.description, ({ value }) =>
      value().trim() ? null : { kind: 'required', message: 'required' },
    )
    disabled(schema.driverId, () => this.saving())
    disabled(schema.vehicleId, () => this.saving())
    disabled(schema.inspectionDate, () => this.saving())
    disabled(schema.description, () => this.saving())
    for (const check of INSPECTION_CHECKS) {
      validate(schema[check], ({ value }) =>
        value() === 'true' || value() === 'false' ? null : { kind: 'check', message: 'check' },
      )
      disabled(schema[check], () => this.saving())
    }
  })
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly lookups = inject(INSPECTOR_LOOKUPS)
  private readonly searchDriverRequest = this.lookups.drivers()
  private readonly searchVehicleRequest = this.lookups.vehicles()
  private driverRequest?: Subscription
  private vehicleRequest?: Subscription
  private driverEpoch = 0
  private vehicleEpoch = 0

  constructor() {
    effect(() => {
      if (this.companyId() === null) {
        this.clearLookups()
        this.visitForm().reset()
        this.model.set(emptyVisit())
        return
      }
      untracked(() => {
        this.visitForm().reset()
        this.model.set(emptyVisit())
        this.searchDrivers()
        this.loadVehiclePage(1)
      })
    })
    this.destroyRef.onDestroy(() => this.clearLookups())
  }

  protected t(key: InspectorTextKey): string {
    return inspectorText(this.language(), key)
  }
  protected label(check: InspectionCheck): InspectorTextKey {
    return checkLabels[check]
  }
  protected positiveAnswer(check: InspectionCheck): InspectorTextKey {
    return [
      'tiresCondition',
      'lightsCondition',
      'seatsCondition',
      'heaterCondition',
      'airConditionerCondition',
      'hasTurnSignals',
      'wipersCondition',
      'windowsCondition',
    ].includes(check)
      ? 'satisfactoryValue'
      : 'yesValue'
  }
  protected negativeAnswer(check: InspectionCheck): InspectorTextKey {
    return this.positiveAnswer(check) === 'satisfactoryValue' ? 'needsAttentionValue' : 'noValue'
  }

  protected searchDrivers() {
    const epoch = ++this.driverEpoch
    this.driverRequest?.unsubscribe()
    this.searchingDrivers.set(true)
    this.lookupError.set(false)
    this.driverRequest = this.searchDriverRequest(this.driverQuery().trim()).subscribe({
      next: drivers => {
        if (epoch !== this.driverEpoch) return
        this.drivers.set(drivers)
        const selectedId = positiveInteger(this.model().driverId)
        if (selectedId !== null && !drivers.some(option => option.id === selectedId))
          this.model.update(value => ({ ...value, driverId: '' }))
        this.searchingDrivers.set(false)
      },
      error: () => {
        if (epoch !== this.driverEpoch) return
        this.drivers.set([])
        this.searchingDrivers.set(false)
        this.lookupError.set(true)
      },
    })
  }

  protected loadVehiclePage(pageNumber: number) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 32767) return
    const epoch = ++this.vehicleEpoch
    this.vehicleRequest?.unsubscribe()
    this.loadingVehicles.set(true)
    this.lookupError.set(false)
    this.vehicleRequest = this.searchVehicleRequest(pageNumber).subscribe({
      next: page => {
        if (epoch !== this.vehicleEpoch) return
        this.vehicles.set(page.items)
        this.vehiclePage.set(page.pageNumber)
        this.vehicleHasNext.set(page.hasNext)
        const selectedId = positiveInteger(this.model().vehicleId)
        if (selectedId !== null && !page.items.some(option => option.id === selectedId))
          this.model.update(value => ({ ...value, vehicleId: '' }))
        this.loadingVehicles.set(false)
      },
      error: () => {
        if (epoch !== this.vehicleEpoch) return
        this.vehicles.set([])
        this.loadingVehicles.set(false)
        this.lookupError.set(true)
      },
    })
  }

  protected save(event: Event) {
    event.preventDefault()
    if (this.saving()) return
    const companyId = this.companyId()
    const value = this.model()
    const driverId = positiveInteger(value.driverId)
    const vehicleId = positiveInteger(value.vehicleId)
    const hasAllChecks = INSPECTION_CHECKS.every(
      check => value[check] === 'true' || value[check] === 'false',
    )
    this.formError.set(null)
    if (
      companyId === null ||
      !validDate(value.inspectionDate) ||
      !value.description.trim() ||
      value.description.length > 1000 ||
      driverId === null ||
      vehicleId === null ||
      !hasAllChecks ||
      !this.drivers().some(driver => driver.id === driverId) ||
      !this.vehicles().some(vehicle => vehicle.id === vehicleId)
    ) {
      this.formError.set('required')
      submit(this.visitForm, async () => undefined)
      this.changeDetector.detectChanges()
      return
    }
    submit(this.visitForm, async () => {
      const current = this.model()
      if (this.companyId() !== companyId) {
        this.formError.set('required')
        this.changeDetector.detectChanges()
        return
      }
      const checks = Object.fromEntries(
        INSPECTION_CHECKS.map(check => [check, current[check] === 'true']),
      )
      const draft = {
        id: 0,
        inspectionDate: current.inspectionDate,
        driverId,
        vehicleId,
        description: current.description.trim(),
        ...checks,
      } as InspectionVisitDraft
      this.saving.set(true)
      this.changeDetector.detectChanges()
      try {
        const id = await firstValueFrom(this.store.createVisit(draft))
        await this.router.navigate(['../', inspectionId(id)], { relativeTo: this.route })
      } catch {
        this.formError.set('uncertainSave')
        this.changeDetector.detectChanges()
      } finally {
        this.saving.set(false)
        this.changeDetector.detectChanges()
      }
    })
  }

  private clearLookups() {
    this.driverEpoch++
    this.vehicleEpoch++
    this.driverRequest?.unsubscribe()
    this.vehicleRequest?.unsubscribe()
    this.drivers.set([])
    this.vehicles.set([])
    this.searchingDrivers.set(false)
    this.loadingVehicles.set(false)
    this.vehiclePage.set(1)
    this.vehicleHasNext.set(false)
    this.lookupError.set(false)
  }
}
