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
import {
  InspectionCheck,
  InspectionStore,
  InspectionVisitDraft,
  INSPECTION_CHECKS,
  inspectionCheckAnswerLabel,
  inspectionId,
  inspectionDate,
} from '@org/transport-inspection-data-access'
import { HlmButton } from '@spartan-ng/helm/button'
import { Subscription, firstValueFrom } from 'rxjs'
import {
  INSPECTION_LANGUAGE,
  INSPECTION_LOOKUPS,
  INSPECTION_SCOPE,
  InspectionLookupOption,
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

type CheckSelection = '' | 'true' | 'false'
type InspectionVisitFormModel = {
  readonly driverId: string
  readonly vehicleId: string
  readonly inspectionDate: string
  readonly description: string
} & Readonly<Record<InspectionCheck, CheckSelection>>

function emptyVisitModel(): InspectionVisitFormModel {
  return {
    driverId: '',
    vehicleId: '',
    inspectionDate: '',
    description: '',
    ...Object.fromEntries(INSPECTION_CHECKS.map(check => [check, ''])),
  } as InspectionVisitFormModel
}

function validDate(value: string): boolean {
  try {
    inspectionDate(value)
    return true
  } catch {
    return false
  }
}

@Component({
  selector: 'lib-inspection-create-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButton, FormField],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <a
      class="mb-6 inline-flex min-h-11 items-center underline underline-offset-4"
      [routerLink]="['../']"
      >{{ t('back') }}</a
    >
    @if (scope() === null) {
      <p role="status">{{ t('selectCompany') }}</p>
    } @else {
      <header class="mb-6">
        <h1 class="text-2xl font-semibold">{{ t('create') }}</h1>
      </header>
      <form class="grid gap-6" (submit)="save($event)">
        <section
          class="grid gap-4 rounded-xl border p-5 md:grid-cols-2"
          aria-label="{{ t('create') }}"
        >
          <div class="grid gap-2">
            <label for="inspection-driver-search" class="text-sm">{{ t('searchDrivers') }}</label>
            <div class="flex gap-2">
              <input
                id="inspection-driver-search"
                class="bg-background min-h-11 min-w-0 flex-1 rounded-md border px-3"
                [value]="driverQuery()"
                (input)="driverQuery.set($any($event.target).value)"
                (keydown.enter)="$event.preventDefault(); searchDrivers()"
              /><button
                hlmBtn
                variant="outline"
                type="button"
                class="min-h-11"
                [disabled]="searchingDrivers()"
                (click)="searchDrivers()"
              >
                {{ t('find') }}
              </button>
            </div>
            @if (searchingDrivers()) {
              <p role="status">{{ t('loading') }}</p>
            }
            @if (driverError()) {
              <p role="alert">{{ driverError() }}</p>
            }
            <label for="inspection-driver" class="mt-2 text-sm">{{ t('selectDriver') }}</label>
            <select
              id="inspection-driver"
              class="bg-background min-h-11 rounded-md border px-3"
              [formField]="visitForm.driverId"
            >
              <option value="">{{ t('selectDriver') }}</option>
              @for (driver of drivers(); track driver.id) {
                <option [value]="driver.id">{{ driver.label }}</option>
              }
            </select>
            @if (!searchingDrivers() && !drivers().length) {
              <p class="text-muted-foreground text-sm">{{ t('noDrivers') }}</p>
            }
          </div>
          <div class="grid gap-2">
            <label for="inspection-vehicle" class="text-sm">{{ t('selectVehicle') }}</label>
            <select
              id="inspection-vehicle"
              class="bg-background min-h-11 rounded-md border px-3"
              [formField]="visitForm.vehicleId"
            >
              <option value="">{{ t('selectVehicle') }}</option>
              @for (vehicle of vehicles(); track vehicle.id) {
                <option [value]="vehicle.id">{{ vehicle.label }}</option>
              }
            </select>
            @if (loadingVehicles()) {
              <p role="status">{{ t('loading') }}</p>
            }
            @if (vehicleError()) {
              <p role="alert">{{ vehicleError() }}</p>
            }
            @if (!loadingVehicles() && !vehicles().length) {
              <p class="text-muted-foreground text-sm">{{ t('noVehicles') }}</p>
            }
            <button
              hlmBtn
              variant="outline"
              type="button"
              class="min-h-11 justify-self-start"
              [disabled]="loadingVehicles() || vehiclePage() <= 1"
              (click)="loadVehiclePage(vehiclePage() - 1)"
            >
              {{ t('previous') }}
            </button>
            <button
              hlmBtn
              variant="outline"
              type="button"
              class="min-h-11 justify-self-start"
              [disabled]="loadingVehicles() || !vehicleHasNext()"
              (click)="loadVehiclePage(vehiclePage() + 1)"
            >
              {{ t('next') }}
            </button>
          </div>
          <label class="grid gap-2 text-sm" for="inspection-date"
            >{{ t('date')
            }}<input
              id="inspection-date"
              class="bg-background min-h-11 rounded-md border px-3"
              type="date"
              [formField]="visitForm.inspectionDate"
          /></label>
          <label class="grid gap-2 text-sm" for="inspection-description"
            >{{ t('description')
            }}<textarea
              id="inspection-description"
              class="bg-background min-h-24 rounded-md border p-3"
              [formField]="visitForm.description"
            ></textarea
            ><span class="text-muted-foreground" aria-hidden="true"
              >{{ visitModel().description.length }}/1000</span
            ></label
          >
        </section>
        <section class="rounded-xl border p-5" aria-labelledby="inspection-new-checks">
          <h2 id="inspection-new-checks" class="text-lg font-semibold">{{ t('checks') }}</h2>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            @for (check of checks; track check) {
              <fieldset class="bg-muted/30 grid gap-2 rounded-lg p-3">
                <legend class="text-sm font-medium">{{ t(label(check)) }}</legend>
                <div class="flex flex-wrap gap-x-5 gap-y-2">
                  <label class="inline-flex min-h-11 items-center gap-2"
                    ><input type="radio" value="true" [formField]="visitForm[check]" />{{
                      t(inspectionCheckAnswerLabel(check, true))
                    }}</label
                  >
                  <label class="inline-flex min-h-11 items-center gap-2"
                    ><input type="radio" value="false" [formField]="visitForm[check]" />{{
                      t(inspectionCheckAnswerLabel(check, false))
                    }}</label
                  >
                </div>
              </fieldset>
            }
          </div>
        </section>
        @if (error()) {
          <p role="alert">{{ error() }}</p>
        }
        <button hlmBtn class="min-h-11 justify-self-start" type="submit" [disabled]="saving()">
          {{ saving() ? t('saving') : t('submit') }}
        </button>
      </form>
    }
  `,
})
export class InspectionCreatePage {
  protected readonly language = inject(INSPECTION_LANGUAGE)
  protected readonly scope = inject(INSPECTION_SCOPE)
  protected readonly store = inject(InspectionStore)
  protected readonly checks = INSPECTION_CHECKS
  protected readonly drivers = signal<readonly InspectionLookupOption[]>([])
  protected readonly vehicles = signal<readonly InspectionLookupOption[]>([])
  protected readonly driverQuery = signal('')
  protected readonly saving = signal(false)
  protected readonly visitModel = signal(emptyVisitModel())
  protected readonly visitForm = form(this.visitModel, schema => {
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
  protected readonly searchingDrivers = signal(false)
  protected readonly loadingVehicles = signal(false)
  protected readonly vehiclePage = signal(1)
  protected readonly vehicleHasNext = signal(false)
  protected readonly driverError = signal<string | null>(null)
  protected readonly vehicleError = signal<string | null>(null)
  protected readonly error = signal<string | null>(null)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly lookupConfig = inject(INSPECTION_LOOKUPS)
  private readonly searchDriversRequest = this.lookupConfig.drivers()
  private readonly searchVehiclesRequest = this.lookupConfig.vehicles()
  private driverSubscription?: Subscription
  private vehicleSubscription?: Subscription
  private driverEpoch = 0
  private vehicleEpoch = 0

  constructor() {
    effect(() => {
      const companyId = this.scope()
      if (companyId === null) {
        this.clearLookups()
        this.visitForm().reset()
        this.visitModel.set(emptyVisitModel())
        return
      }
      untracked(() => {
        this.visitForm().reset()
        this.visitModel.set(emptyVisitModel())
        this.searchDrivers()
        this.loadVehiclePage(1)
      })
    })
    this.destroyRef.onDestroy(() => this.clearLookups())
  }

  protected t(key: InspectionTextKey): string {
    return inspectionText(this.language(), key)
  }
  protected label(check: InspectionCheck): InspectionTextKey {
    return checkLabels[check]
  }
  protected inspectionCheckAnswerLabel = inspectionCheckAnswerLabel
  protected searchDrivers() {
    const epoch = ++this.driverEpoch
    this.driverSubscription?.unsubscribe()
    this.searchingDrivers.set(true)
    this.driverError.set(null)
    this.driverSubscription = this.searchDriversRequest(this.driverQuery().trim()).subscribe({
      next: options => {
        if (epoch !== this.driverEpoch) return
        this.drivers.set(options)
        const selectedId = positiveNumber(this.visitModel().driverId)
        if (selectedId !== null && !options.some(option => option.id === selectedId))
          this.visitModel.update(model => ({ ...model, driverId: '' }))
        this.searchingDrivers.set(false)
      },
      error: () => {
        if (epoch !== this.driverEpoch) return
        this.drivers.set([])
        this.searchingDrivers.set(false)
        this.driverError.set(this.t('findFailed'))
      },
    })
  }

  protected loadVehiclePage(pageNumber: number) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 32767) return
    const epoch = ++this.vehicleEpoch
    this.vehicleSubscription?.unsubscribe()
    this.loadingVehicles.set(true)
    this.vehicleError.set(null)
    this.vehicleSubscription = this.searchVehiclesRequest(pageNumber).subscribe({
      next: page => {
        if (epoch !== this.vehicleEpoch) return
        this.vehicles.set(page.items)
        this.vehiclePage.set(page.pageNumber)
        this.vehicleHasNext.set(page.hasNext)
        const selectedId = positiveNumber(this.visitModel().vehicleId)
        if (selectedId !== null && !page.items.some(option => option.id === selectedId))
          this.visitModel.update(model => ({ ...model, vehicleId: '' }))
        this.loadingVehicles.set(false)
      },
      error: () => {
        if (epoch !== this.vehicleEpoch) return
        this.vehicles.set([])
        this.loadingVehicles.set(false)
        this.vehicleError.set(this.t('lookupFailed'))
      },
    })
  }

  protected save(event: Event) {
    event.preventDefault()
    if (this.saving()) return
    this.error.set(null)
    const companyId = this.scope()
    submit(this.visitForm, async () => {
      const model = this.visitModel()
      const driverId = positiveNumber(model.driverId)
      const vehicleId = positiveNumber(model.vehicleId)
      if (
        companyId === null ||
        this.scope() !== companyId ||
        driverId === null ||
        vehicleId === null ||
        !this.drivers().some(driver => driver.id === driverId) ||
        !this.vehicles().some(vehicle => vehicle.id === vehicleId)
      ) {
        this.error.set(this.t('required'))
        return
      }
      const checks = Object.fromEntries(
        INSPECTION_CHECKS.map(check => [check, model[check] === 'true']),
      )
      const draft = {
        id: 0,
        inspectionDate: model.inspectionDate,
        driverId,
        vehicleId,
        description: model.description.trim(),
        ...checks,
      } as InspectionVisitDraft
      this.saving.set(true)
      this.changeDetector.detectChanges()
      try {
        const id = await firstValueFrom(this.store.createVisit(draft))
        await this.router.navigate(['../', inspectionId(id)], { relativeTo: this.route })
      } catch {
        this.error.set(this.t('createFailed'))
      } finally {
        this.saving.set(false)
        this.changeDetector.detectChanges()
      }
    })
    if (this.visitForm().invalid()) this.error.set(this.t('required'))
  }

  private clearLookups() {
    this.driverEpoch++
    this.vehicleEpoch++
    this.driverSubscription?.unsubscribe()
    this.vehicleSubscription?.unsubscribe()
    this.drivers.set([])
    this.vehicles.set([])
    this.searchingDrivers.set(false)
    this.loadingVehicles.set(false)
    this.vehiclePage.set(1)
    this.vehicleHasNext.set(false)
    this.driverError.set(null)
    this.vehicleError.set(null)
  }
}

function positiveNumber(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : null
}
