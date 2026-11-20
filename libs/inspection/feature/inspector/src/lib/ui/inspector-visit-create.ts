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
import { AutocompleteSearch, type BilingualText } from '@org/ui-forms'
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
const driverSearchCopy: Readonly<{
  label: BilingualText
  placeholder: BilingualText
  clear: BilingualText
  loading: BilingualText
  minimumQuery: BilingualText
  empty: BilingualText
}> = {
  label: { en: 'Find a driver', fa: 'یافتن راننده' },
  placeholder: { en: 'Search by driver name', fa: 'جستجو بر اساس نام راننده' },
  clear: { en: 'Clear driver search', fa: 'پاک کردن جستجوی راننده' },
  loading: { en: 'Searching drivers…', fa: 'در حال جستجوی رانندگان…' },
  minimumQuery: { en: 'Type at least 2 characters', fa: 'حداقل ۲ نویسه وارد کنید' },
  empty: { en: 'No drivers found.', fa: 'راننده‌ای پیدا نشد.' },
}

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
  imports: [RouterLink, HlmButton, FormField, AutocompleteSearch],
  host: { class: 'mx-auto block min-w-0 max-w-6xl p-4 md:p-8' },
  template: `
    @if (companyId() === null) {
      <p class="border-destructive/40 bg-destructive/5 rounded-lg border p-4 text-sm" role="alert">
        {{ t('selectCompany') }}
      </p>
    } @else {
      <header class="bg-card mb-6 rounded-2xl border p-5 shadow-sm md:mb-8 md:p-7">
        <a hlmBtn variant="outline" class="mb-5 min-h-11" [routerLink]="['/workspace']">{{
          t('back')
        }}</a>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="max-w-2xl">
            <p class="text-primary mb-2 text-sm font-semibold">{{ t('checks') }}</p>
            <h1 class="text-2xl font-bold tracking-tight md:text-3xl">{{ t('title') }}</h1>
            <p class="text-muted-foreground mt-2 text-sm leading-6 md:text-base">
              {{ t('createIntro') }}
            </p>
          </div>
          <div class="bg-muted/50 flex shrink-0 items-center gap-3 rounded-xl px-4 py-3">
            <span class="bg-primary h-2.5 w-2.5 rounded-full" aria-hidden="true"></span>
            <span class="text-sm font-medium">{{ checks.length }} {{ t('checks') }}</span>
          </div>
        </div>
      </header>
      <form
        id="inspection-create-form"
        class="grid gap-5 md:gap-6"
        novalidate
        (submit)="save($event)"
      >
        <section
          class="bg-card overflow-hidden rounded-2xl border shadow-sm"
          aria-labelledby="inspector-details-heading"
        >
          <div class="bg-muted/20 border-b px-4 py-4 md:px-6">
            <div class="flex items-start gap-3">
              <span
                class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                aria-hidden="true"
                >1</span
              >
              <div>
                <h2 id="inspector-details-heading" class="text-lg font-semibold">
                  {{ t('visitDetails') }}
                </h2>
                <p class="text-muted-foreground mt-1 text-sm leading-5">
                  {{ t('visitDetailsIntro') }}
                </p>
              </div>
            </div>
          </div>
          <div class="grid items-start gap-x-6 gap-y-6 p-4 md:grid-cols-2 md:p-6">
            <lib-autocomplete-search
              class="block w-full !max-w-none"
              id="inspector-driver"
              [(query)]="driverQuery"
              [selectedOption]="selectedDriver()"
              [language]="language()"
              [label]="driverSearchCopy.label"
              [placeholder]="driverSearchCopy.placeholder"
              [clearLabel]="driverSearchCopy.clear"
              [loadingLabel]="driverSearchCopy.loading"
              [minimumQueryLabel]="driverSearchCopy.minimumQuery"
              [emptyLabel]="driverSearchCopy.empty"
              [options]="drivers()"
              [loading]="searchingDrivers()"
              [optionId]="driverOptionId"
              [optionLabel]="driverOptionLabel"
              (queryRequested)="searchDrivers($event)"
              (optionSelected)="selectDriver($event)"
            />
            <div class="grid min-w-0 content-start gap-2">
              <label for="inspector-vehicle" class="text-sm font-semibold">{{
                t('vehicle')
              }}</label>
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
              <p class="text-muted-foreground min-h-5 text-sm" role="status">
                @if (loadingVehicles()) {
                  {{ t('loading') }}
                } @else if (!vehicles().length) {
                  {{ t('noVehicles') }}
                }
              </p>
            </div>
            <div class="grid min-w-0 content-start gap-2">
              <label class="text-sm font-semibold" for="inspector-date">{{
                t('inspectionDate')
              }}</label>
              <input
                id="inspector-date"
                class="bg-background focus-visible:ring-ring min-h-11 w-full rounded-md border px-3 text-sm font-normal transition outline-none focus-visible:ring-2"
                type="date"
                [formField]="visitForm.inspectionDate"
              />
            </div>
            <div class="grid min-w-0 content-start gap-2">
              <label class="text-sm font-semibold" for="inspector-description">{{
                t('description')
              }}</label>
              <textarea
                id="inspector-description"
                class="bg-background focus-visible:ring-ring min-h-28 w-full rounded-md border p-3 text-sm font-normal transition outline-none focus-visible:ring-2"
                [formField]="visitForm.description"
              ></textarea>
              <span class="text-muted-foreground text-xs" aria-hidden="true"
                >{{ model().description.length }}/1000</span
              >
            </div>
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
          class="bg-card overflow-hidden rounded-2xl border shadow-sm"
          aria-labelledby="inspector-checks-heading"
        >
          <div class="bg-muted/20 border-b px-4 py-4 md:px-6">
            <div class="flex items-start gap-3">
              <span
                class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                aria-hidden="true"
                >2</span
              >
              <div>
                <h2 id="inspector-checks-heading" class="text-lg font-semibold">
                  {{ t('checks') }}
                </h2>
                <p class="text-muted-foreground mt-1 text-sm leading-5">{{ t('checksIntro') }}</p>
              </div>
            </div>
          </div>
          <div class="grid gap-3 p-4 sm:grid-cols-2 md:p-6 xl:grid-cols-3">
            @for (check of checks; track check) {
              <fieldset
                class="bg-muted/20 hover:bg-muted/40 focus-within:border-primary/50 focus-within:ring-primary/20 grid min-w-0 gap-2 rounded-xl border p-3.5 transition-colors focus-within:ring-2"
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
        <div
          class="bg-background/95 sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:-mx-8 md:px-8"
        >
          <p class="text-muted-foreground text-xs">{{ t('required') }}</p>
          <button
            id="inspector-visit-submit"
            hlmBtn
            class="min-h-12 w-full px-8 sm:w-auto"
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
  protected readonly driverSearchCopy = driverSearchCopy
  protected readonly drivers = signal<readonly InspectorLookupOption[]>([])
  protected readonly vehicles = signal<readonly InspectorLookupOption[]>([])
  protected readonly driverQuery = signal('')
  protected readonly model = signal(emptyVisit())
  protected readonly saving = signal(false)
  protected readonly searchingDrivers = signal(false)
  protected readonly loadingVehicles = signal(false)
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

  protected readonly driverOptionId = (option: InspectorLookupOption) => String(option.id)
  protected readonly driverOptionLabel = (option: InspectorLookupOption): BilingualText => ({
    en: option.label,
    fa: option.label,
  })

  protected selectedDriver(): InspectorLookupOption | null {
    const id = positiveInteger(this.model().driverId)
    return id === null ? null : (this.drivers().find(driver => driver.id === id) ?? null)
  }

  protected selectDriver(driver: InspectorLookupOption) {
    this.model.update(value => ({ ...value, driverId: String(driver.id) }))
  }

  protected searchDrivers(query: string) {
    const epoch = ++this.driverEpoch
    this.driverRequest?.unsubscribe()
    this.model.update(value => ({ ...value, driverId: '' }))
    this.drivers.set([])
    if (!query.trim()) {
      this.searchingDrivers.set(false)
      return
    }
    this.searchingDrivers.set(true)
    this.lookupError.set(false)
    this.driverRequest = this.searchDriverRequest(query.trim()).subscribe({
      next: drivers => {
        if (epoch !== this.driverEpoch) return
        this.drivers.set(drivers)
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
    this.driverQuery.set('')
    this.searchingDrivers.set(false)
    this.loadingVehicles.set(false)
    this.lookupError.set(false)
  }
}
