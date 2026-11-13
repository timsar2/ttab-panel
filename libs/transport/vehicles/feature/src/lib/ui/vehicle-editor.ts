import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import {
  FormField,
  disabled,
  form,
  maxLength,
  minLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { DriversApi, DriverRow, driverId } from '@org/transport-drivers-data-access'
import {
  CarDocumentField,
  VehicleId,
  VehicleDraft,
  VehicleImagePayload,
  VehiclesApi,
  VehiclesStore,
  carId,
  carTypeId,
  vehicleTypeId,
} from '@org/transport-vehicles-data-access'
import { TRANSPORT_IMAGE_FILE_TYPES, transportImageUpload } from '@org/transport-http'
import {
  AutocompleteSearch,
  ConfirmDialog,
  FileUploadControl,
  LookupSelect,
  UploadSelection,
  type BilingualText,
} from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { Subscription } from 'rxjs'
import { VEHICLE_LANGUAGE, VEHICLE_MANAGE } from '../vehicle.routes'
import { VEHICLE_TEXT, vehicleText } from '../vehicle-text'

interface VehicleFormModel {
  driverId: number | null
  vehicleTypeId: string
  carPlate: string
  color: string
  produnctionYear: number | null
  capacity: number | null
}

interface TypeFormModel {
  carTypeId: number | null
  model: string
}

const blankVehicle: VehicleFormModel = {
  driverId: null,
  vehicleTypeId: '',
  carPlate: '',
  color: '',
  produnctionYear: null,
  capacity: null,
}
const blankType: TypeFormModel = { carTypeId: null, model: '' }

const photoPolicy: BilingualText = {
  en: 'JPEG, PNG, or WebP. Maximum 160 KiB per image. Existing images are preserved unless replaced.',
  fa: 'فرمت JPEG، PNG یا WebP. حداکثر ۱۶۰ کیلوبایت برای هر تصویر. تصاویر فعلی تا زمان جایگزینی حفظ می‌شوند.',
}

@Component({
  selector: 'lib-vehicle-editor',
  imports: [
    AutocompleteSearch,
    ConfirmDialog,
    FileUploadControl,
    FormField,
    HlmButton,
    HlmFieldImports,
    LookupSelect,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-muted-foreground mb-1 text-sm">{{ text('vehicles') }}</p>
          <h1 class="text-2xl font-semibold">
            {{ isEdit() ? text('editCar') : text('createCar') }}
          </h1>
        </div>
        <a
          hlmBtn
          variant="outline"
          class="min-h-11"
          [routerLink]="id() ? ['..', id()] : ['..']"
          queryParamsHandling="preserve"
          >{{ text('back') }}</a
        >
      </header>

      @if (invalidId()) {
        <p role="alert">{{ text('notFound') }}</p>
      } @else if (!canWrite()) {
        <p role="alert" class="border-destructive/40 bg-destructive/5 rounded-md border p-4">
          {{ text('denied') }}
        </p>
      } @else if (isEdit() && store.detailStatus() === 'loading') {
        <p role="status">{{ text('detailLoading') }}</p>
      } @else if (isEdit() && store.detailStatus() === 'denied') {
        <p role="alert">{{ text('denied') }}</p>
      } @else if (isEdit() && store.detailStatus() === 'missing') {
        <p role="alert">{{ text('notFound') }}</p>
      } @else if (isEdit() && store.detailStatus() === 'error') {
        <p role="alert">{{ text('loadFailed') }}</p>
        <button hlmBtn variant="outline" type="button" (click)="reload()">
          {{ text('retry') }}
        </button>
      } @else {
        @if (store.typesError()) {
          <p role="alert" class="text-destructive mb-4">{{ text('typeFailed') }}</p>
        }
        @if (store.mutationError()) {
          <p role="alert" class="text-destructive mb-4">{{ safeMutationError() }}</p>
        }
        @if (store.saveOutcome() === 'unconfirmed') {
          <p role="alert" class="border-destructive/40 bg-destructive/5 mb-4 rounded-md border p-4">
            {{ text('saveUnconfirmed') }}
          </p>
          <button
            hlmBtn
            variant="outline"
            type="button"
            class="mb-4 min-h-11"
            [routerLink]="['..']"
            queryParamsHandling="preserve"
          >
            {{ text('back') }}
          </button>
        }
        <lib-autocomplete-search
          class="mb-5 w-full"
          id="vehicle-driver"
          [(query)]="driverSearchText"
          [selectedOption]="selectedDriver()"
          [language]="language()"
          [label]="copy('driver')"
          [placeholder]="copy('driverPlaceholder')"
          [clearLabel]="copy('clearSearch')"
          [loadingLabel]="copy('searching')"
          [minimumQueryLabel]="copy('minSearch')"
          [emptyLabel]="copy('noDrivers')"
          [options]="driverOptions()"
          [loading]="driverLoading()"
          [optionId]="driverOptionId"
          [optionLabel]="driverOptionLabel"
          [optionDescription]="driverOptionDescription"
          [disabled]="store.mutating() || !canWrite()"
          (queryRequested)="searchDrivers($event)"
          (optionSelected)="selectDriver($event)"
        />
        @if (driverError()) {
          <p role="alert" class="text-destructive mb-4">{{ text('denied') }}</p>
        }
        @if (vehicleForm.driverId().touched() && vehicleForm.driverId().invalid()) {
          <p role="alert" class="text-destructive mb-4">
            {{
              language() === 'fa' ? 'یک راننده ثبت‌شده انتخاب کنید.' : 'Select an existing driver.'
            }}
          </p>
        }

        <form class="grid min-w-0 gap-4 sm:grid-cols-2" (submit)="save($event)">
          <lib-lookup-select
            [field]="vehicleForm.vehicleTypeId"
            id="vehicle-type"
            [label]="copy('vehicleType')"
            [placeholder]="copy('vehicleType')"
            [options]="typeOptions()"
            [language]="language()"
            [loading]="store.typesLoading()"
            [error]="store.typesError() ? text('typeFailed') : null"
            [disabled]="store.mutating() || !canWrite()"
            (retry)="store.loadTypes()"
          />
          <div class="flex items-end">
            <button
              hlmBtn
              variant="outline"
              class="min-h-11"
              type="button"
              [disabled]="store.mutating()"
              (click)="showTypeForm.set(!showTypeForm())"
            >
              {{ text(showTypeForm() ? 'keepEditing' : 'addType') }}
            </button>
          </div>

          @if (showTypeForm()) {
            <section
              class="border-border bg-card grid min-w-0 gap-4 rounded-lg border p-4 sm:col-span-2 sm:grid-cols-2"
              [attr.aria-label]="text('addType')"
            >
              <h2 class="text-lg font-semibold sm:col-span-2">{{ text('addType') }}</h2>
              <div hlmField>
                <label hlmFieldLabel for="vehicle-type-group">{{ text('typeGroupId') }}</label>
                <input
                  class="min-h-11 w-full"
                  id="vehicle-type-group"
                  type="number"
                  [formField]="typeForm.carTypeId"
                />
              </div>
              <div hlmField>
                <label hlmFieldLabel for="vehicle-type-model">{{ text('model') }}</label>
                <input
                  class="min-h-11 w-full"
                  id="vehicle-type-model"
                  type="text"
                  [formField]="typeForm.model"
                />
              </div>
              <div class="sm:col-span-2">
                <button
                  hlmBtn
                  variant="outline"
                  class="min-h-11"
                  type="button"
                  [disabled]="store.mutating() || typeForm().invalid()"
                  (click)="createType()"
                >
                  {{ text('saveType') }}
                </button>
                @if (typeCreated()) {
                  <span role="status" class="ms-3 text-sm">{{ text('typeCreated') }}</span>
                }
              </div>
            </section>
          }

          <div hlmField>
            <label hlmFieldLabel for="vehicle-plate">{{ text('carPlate') }}</label>
            <input
              class="min-h-11 w-full"
              id="vehicle-plate"
              type="text"
              [formField]="vehicleForm.carPlate"
            />
            @if (vehicleForm.carPlate().touched() && vehicleForm.carPlate().invalid()) {
              <p class="text-destructive text-sm">
                {{
                  language() === 'fa'
                    ? 'پلاک باید دقیقاً ۸ نویسه باشد.'
                    : 'The plate must contain exactly 8 characters.'
                }}
              </p>
            }
          </div>
          <div hlmField>
            <label hlmFieldLabel for="vehicle-color">{{ text('color') }}</label>
            <input
              class="min-h-11 w-full"
              id="vehicle-color"
              type="text"
              [formField]="vehicleForm.color"
            />
          </div>
          <div hlmField>
            <label hlmFieldLabel for="vehicle-year">{{ text('produnctionYear') }}</label>
            <input
              class="min-h-11 w-full"
              id="vehicle-year"
              type="number"
              [formField]="vehicleForm.produnctionYear"
            />
          </div>
          <div hlmField>
            <label hlmFieldLabel for="vehicle-capacity">{{ text('capacity') }}</label>
            <input
              class="min-h-11 w-full"
              id="vehicle-capacity"
              type="number"
              [formField]="vehicleForm.capacity"
            />
            <p class="text-muted-foreground text-xs">
              {{
                language() === 'fa'
                  ? 'ظرفیت فقط به‌عنوان اطلاعات ثبت می‌شود.'
                  : 'Capacity is recorded as informational metadata.'
              }}
            </p>
          </div>

          <section
            class="grid min-w-0 gap-4 sm:col-span-2 sm:grid-cols-2"
            [attr.aria-label]="language() === 'fa' ? 'تصاویر خودرو' : 'Vehicle images'"
          >
            <lib-file-upload
              class="min-w-0"
              id="vehicle-photo"
              [language]="language()"
              [label]="copy('carImage')"
              [allowedTypes]="imageTypes"
              [maxBytes]="imageMaxBytes"
              [policyDescription]="photoPolicy"
              [existingName]="existingName('carImage')"
              [existingPreview]="store.detail()?.carImage ?? null"
              [disabled]="store.mutating() || !canWrite()"
              [(value)]="carImage"
            />
            <lib-file-upload
              class="min-w-0"
              id="vehicle-smart-card"
              [language]="language()"
              [label]="copy('carSmartCardImage')"
              [allowedTypes]="imageTypes"
              [maxBytes]="imageMaxBytes"
              [policyDescription]="photoPolicy"
              [existingName]="existingName('carSmartCardImage')"
              [existingPreview]="store.detail()?.carSmartCardImage ?? null"
              [disabled]="store.mutating() || !canWrite()"
              [(value)]="carSmartCardImage"
            />
            <lib-file-upload
              class="min-w-0"
              id="vehicle-insurance"
              [language]="language()"
              [label]="copy('carInsuranceImage')"
              [allowedTypes]="imageTypes"
              [maxBytes]="imageMaxBytes"
              [policyDescription]="photoPolicy"
              [existingName]="existingName('carInsuranceImage')"
              [existingPreview]="store.detail()?.carInsuranceImage ?? null"
              [disabled]="store.mutating() || !canWrite()"
              [(value)]="carInsuranceImage"
            />
            <lib-file-upload
              class="min-w-0"
              id="vehicle-card"
              [language]="language()"
              [label]="copy('carCardImage')"
              [allowedTypes]="imageTypes"
              [maxBytes]="imageMaxBytes"
              [policyDescription]="photoPolicy"
              [existingName]="existingName('carCardImage')"
              [existingPreview]="store.detail()?.carCardImage ?? null"
              [disabled]="store.mutating() || !canWrite()"
              [(value)]="carCardImage"
            />
          </section>
          <div class="flex flex-wrap gap-2 sm:col-span-2">
            <button
              hlmBtn
              class="min-h-11"
              type="submit"
              [disabled]="
                store.mutating() || vehicleForm().invalid() || imagePending() || !canWrite()
              "
            >
              {{ store.mutating() ? text('loading') : text(isEdit() ? 'updateCar' : 'createCar') }}
            </button>
            <a
              hlmBtn
              variant="outline"
              class="min-h-11"
              [routerLink]="id() ? ['..', id()] : ['..']"
              queryParamsHandling="preserve"
              >{{ text('keepEditing') }}</a
            >
          </div>
        </form>
      }
      <lib-confirm-dialog
        [(open)]="leaveOpen"
        [title]="text('discardTitle')"
        [description]="text('discardDescription')"
        [confirmLabel]="text('discard')"
        [cancelLabel]="text('keepEditing')"
        [busy]="store.mutating()"
        (confirmed)="finishLeave(true)"
        (canceled)="finishLeave(false)"
      />
    </main>
  `,
})
export class VehicleEditor {
  protected readonly store = inject(VehiclesStore)
  protected readonly language = inject(VEHICLE_LANGUAGE)
  protected readonly canManage = inject(VEHICLE_MANAGE)
  private readonly vehicles = inject(VehiclesApi)
  private readonly drivers = inject(DriversApi)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly id = computed(() => this.readId(this.params().get('id')))
  protected readonly isEdit = computed(() => this.params().get('id') !== null)
  protected readonly invalidId = computed(() => this.isEdit() && this.id() === null)
  protected readonly draft = signal<VehicleFormModel>({ ...blankVehicle })
  protected readonly vehicleForm = form(this.draft, schema => {
    disabled(schema.driverId, () => this.store.mutating())
    disabled(schema.vehicleTypeId, () => this.store.mutating())
    disabled(schema.carPlate, () => this.store.mutating())
    disabled(schema.color, () => this.store.mutating())
    disabled(schema.produnctionYear, () => this.store.mutating())
    disabled(schema.capacity, () => this.store.mutating())
    required(schema.driverId, { message: 'Select an existing driver.' })
    validate(schema.driverId, ({ value }) => {
      const id = value()
      return id === null || !Number.isSafeInteger(id) || id < 1
        ? { kind: 'driverSelection', message: 'Select an existing driver.' }
        : null
    })
    required(schema.vehicleTypeId, { message: 'Select a vehicle type.' })
    validate(schema.vehicleTypeId, ({ value }) => {
      const id = Number(value())
      return !Number.isSafeInteger(id) || id < 1
        ? { kind: 'vehicleType', message: 'Select a vehicle type.' }
        : null
    })
    required(schema.carPlate, { message: 'The vehicle plate is required.' })
    minLength(schema.carPlate, 8, { message: 'The vehicle plate must contain 8 characters.' })
    maxLength(schema.carPlate, 8, { message: 'The vehicle plate must contain 8 characters.' })
  })
  protected readonly typeDraft = signal<TypeFormModel>({ ...blankType })
  protected readonly typeForm = form(this.typeDraft, schema => {
    disabled(schema.carTypeId, () => this.store.mutating())
    disabled(schema.model, () => this.store.mutating())
    required(schema.model, { message: 'Enter a car model.' })
    validate(schema.carTypeId, ({ value }) => {
      const id = value()
      return id === null || (Number.isSafeInteger(id) && id > 0)
        ? null
        : { kind: 'carTypeId', message: 'Enter a positive car-type group ID.' }
    })
  })
  protected readonly imageTypes = TRANSPORT_IMAGE_FILE_TYPES
  protected readonly imageMaxBytes = 163840
  protected readonly photoPolicy = photoPolicy
  protected readonly carImage = signal<UploadSelection>({ kind: 'keep' })
  protected readonly carSmartCardImage = signal<UploadSelection>({ kind: 'keep' })
  protected readonly carInsuranceImage = signal<UploadSelection>({ kind: 'keep' })
  protected readonly carCardImage = signal<UploadSelection>({ kind: 'keep' })
  protected readonly driverSearchText = signal('')
  protected readonly driverOptions = signal<readonly DriverRow[]>([])
  protected readonly selectedDriver = signal<DriverRow | null>(null)
  protected readonly driverLoading = signal(false)
  protected readonly driverError = signal(false)
  protected readonly showTypeForm = signal(false)
  protected readonly typeCreated = signal(false)
  protected readonly pendingTypeModel = signal<string | null>(null)
  private readonly pendingTypeRevision = signal<number | null>(null)
  protected readonly leaveOpen = signal(false)
  protected readonly typeOptions = computed(() =>
    (this.store.types() ?? []).map(type => ({ value: String(type.id), label: type.model })),
  )
  protected readonly canWrite = computed(
    () =>
      this.canManage() &&
      this.vehicles.companyId() !== null &&
      this.vehicles.companyId() === this.drivers.companyId(),
  )
  protected readonly imagePending = computed(() =>
    [this.carImage(), this.carSmartCardImage(), this.carInsuranceImage(), this.carCardImage()].some(
      selection => selection.kind === 'reading' || selection.kind === 'remove',
    ),
  )
  protected readonly dirty = computed(
    () =>
      this.vehicleForm().dirty() ||
      this.typeForm().dirty() ||
      (this.id() === null && this.selectedDriver() !== null) ||
      [
        this.carImage(),
        this.carSmartCardImage(),
        this.carInsuranceImage(),
        this.carCardImage(),
      ].some(selection => selection.kind === 'replace' || selection.kind === 'reading'),
  )
  protected readonly driverOptionId = (driver: DriverRow) => String(driver.id)
  protected readonly driverOptionLabel = (driver: DriverRow): BilingualText => ({
    en: driver.fullName ?? driver.nationalId ?? `${vehicleText('en', 'driver')} ${driver.id}`,
    fa: driver.fullName ?? driver.nationalId ?? `${vehicleText('fa', 'driver')} ${driver.id}`,
  })
  protected readonly driverOptionDescription = (driver: DriverRow): BilingualText | null =>
    driver.nationalId ? { en: driver.nationalId, fa: driver.nationalId } : null
  private driverRead?: Subscription
  private driverSearch?: Subscription
  private driverSearchEpoch = 0
  private loadedVehicleId: VehicleId | null = null
  private lastScopeKey = ''
  private lastRouteId: VehicleId | null | undefined
  private pendingLeave: Promise<boolean> | null = null
  private leaveDecision: ((discard: boolean) => void) | null = null
  private submitted = signal(false)
  private saved = false

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.driverRead?.unsubscribe()
      this.driverSearch?.unsubscribe()
    })
    effect(() => {
      this.vehicles.companyId()
      const version = this.session.version()
      const company = this.vehicles.companyId()
      const id = this.id()
      untracked(() => {
        const scopeKey = `${company ?? ''}:${version}`
        if (scopeKey !== this.lastScopeKey || id !== this.lastRouteId) {
          this.lastScopeKey = scopeKey
          this.lastRouteId = id
          this.loadedVehicleId = null
          this.driverRead?.unsubscribe()
          this.driverSearch?.unsubscribe()
          this.driverSearchEpoch++
          this.resetForm()
        }
        this.store.clearMutation()
        this.driverError.set(false)
        this.store.loadTypes()
        if (id) this.store.loadDetail(id)
        else {
          this.store.clearDetail()
          this.resetForm()
        }
      })
    })
    effect(() => {
      const detail = this.store.detail()
      if (
        !detail ||
        this.store.detailStatus() !== 'ready' ||
        detail.id !== this.id() ||
        this.loadedVehicleId === detail.id
      )
        return
      this.loadedVehicleId = detail.id
      untracked(() => {
        this.draft.set({
          driverId: detail.driverId,
          vehicleTypeId: String(detail.vehicleTypeId),
          carPlate: detail.carPlate,
          color: detail.color ?? '',
          produnctionYear: detail.produnctionYear,
          capacity: detail.capacity,
        })
        this.selectedDriver.set(null)
        this.loadVehicleDriver(detail.driverId)
      })
    })
    effect(() => {
      const selected = this.selectedDriver()
      const query = this.driverSearchText().trim()
      if (!selected || query === this.driverSearchLabel(selected)) return
      untracked(() => {
        this.selectedDriver.set(null)
        this.vehicleForm.driverId().value.set(null)
        this.vehicleForm.driverId().markAsDirty()
      })
    })
    effect(() => {
      const pending = this.pendingTypeModel()
      const types = this.store.types()
      const revision = this.pendingTypeRevision()
      if (
        !pending ||
        !types ||
        revision === null ||
        this.store.typesRevision() <= revision ||
        this.store.typesLoading()
      )
        return
      const matches = types.filter(type => type.model.trim() === pending)
      untracked(() => {
        if (matches.length === 1) {
          this.vehicleForm.vehicleTypeId().value.set(String(matches[0].id))
          this.vehicleForm.vehicleTypeId().markAsDirty()
          this.typeCreated.set(true)
        }
        this.pendingTypeModel.set(null)
        this.pendingTypeRevision.set(null)
        if (matches.length === 1) this.typeDraft.set({ ...blankType })
      })
    })
    effect(() => {
      const pending = this.pendingTypeModel()
      if (!pending || !this.store.mutationError()) return
      untracked(() => {
        this.pendingTypeModel.set(null)
        this.pendingTypeRevision.set(null)
      })
    })
    effect(() => {
      const submitted = this.submitted()
      const outcome = this.store.saveOutcome()
      const id = this.store.savedId()
      if (!submitted) return
      if (outcome === 'confirmed' && id !== null) {
        untracked(() => {
          this.saved = true
          this.submitted.set(false)
          void this.router.navigate([id], {
            relativeTo: this.route.parent,
            queryParamsHandling: 'preserve',
          })
        })
      } else if (
        outcome === 'unconfirmed' ||
        (this.store.mutationError() && !this.store.mutating())
      ) {
        untracked(() => this.submitted.set(false))
      }
    })
  }

  protected text(key: keyof typeof VEHICLE_TEXT) {
    return vehicleText(this.language(), key)
  }
  protected copy(key: keyof typeof VEHICLE_TEXT): BilingualText {
    return VEHICLE_TEXT[key]
  }
  protected existingName(field: CarDocumentField): BilingualText | null {
    return this.store.detail()?.[field] ? { en: 'Current image', fa: 'تصویر فعلی' } : null
  }
  protected safeMutationError() {
    const error = this.store.mutationError()
    return error?.code === 'vehicles-access-denied' ||
      error?.status === 401 ||
      error?.status === 403
      ? this.text('denied')
      : this.text('saveFailed')
  }

  protected searchDrivers(value: string) {
    const query = value.trim()
    const request = ++this.driverSearchEpoch
    this.driverSearch?.unsubscribe()
    if (query.length < 2) {
      this.driverOptions.set([])
      this.driverLoading.set(false)
      this.driverError.set(false)
      return
    }
    this.driverLoading.set(true)
    this.driverError.set(false)
    const nationalIdQuery = /^\d+$/.test(query)
    this.driverSearch = this.drivers
      .search({
        fullName: nationalIdQuery ? '' : query,
        nationalId: nationalIdQuery ? query : '',
        pageIndex: 0,
        pageSize: 10,
      })
      .subscribe({
        next: page => {
          if (request === this.driverSearchEpoch) this.driverOptions.set(page.items)
        },
        error: () => {
          if (request === this.driverSearchEpoch) {
            this.driverOptions.set([])
            this.driverError.set(true)
            this.driverLoading.set(false)
          }
        },
        complete: () => {
          if (request === this.driverSearchEpoch) this.driverLoading.set(false)
        },
      })
  }

  protected selectDriver(driver: DriverRow) {
    this.selectedDriver.set(driver)
    this.vehicleForm.driverId().value.set(driver.id)
    this.vehicleForm.driverId().markAsDirty()
    this.driverSearchText.set(this.driverSearchLabel(driver))
  }

  protected createType() {
    if (!this.canWrite() || this.typeForm().invalid() || this.store.mutating()) return
    const model = this.typeDraft().model.trim()
    let groupId: ReturnType<typeof carTypeId> | null = null
    try {
      const value = this.typeDraft().carTypeId
      groupId = value === null ? null : carTypeId(value)
    } catch {
      this.typeForm.carTypeId().markAsTouched()
      return
    }
    this.typeCreated.set(false)
    this.pendingTypeModel.set(model)
    this.pendingTypeRevision.set(this.store.typesRevision())
    if (!this.store.createType({ carTypeId: groupId, model })) this.pendingTypeModel.set(null)
  }

  protected save(event: Event) {
    event.preventDefault()
    if (!this.canWrite() || this.store.mutating() || this.imagePending()) return
    void submit(this.vehicleForm, async () => {
      const formValue = this.draft()
      const id = this.id()
      const selectedDriver = this.selectedDriver()
      if (
        formValue.driverId === null ||
        !selectedDriver ||
        selectedDriver.id !== formValue.driverId ||
        !this.store.types()?.some(type => String(type.id) === formValue.vehicleTypeId)
      )
        return
      const draft: VehicleDraft = {
        driverId: formValue.driverId,
        vehicleTypeId: vehicleTypeId(Number(formValue.vehicleTypeId)),
        carPlate: formValue.carPlate,
        color: formValue.color.trim() || null,
        produnctionYear: formValue.produnctionYear,
        capacity: formValue.capacity,
        ...this.imagePayloads(),
      }
      this.submitted.set(true)
      if (!this.store.save(id, draft)) this.submitted.set(false)
    })
  }

  protected reload() {
    const id = this.id()
    if (id) this.store.loadDetail(id)
  }

  confirmLeave() {
    if (this.saved) return true
    if (!this.canWrite() || (!this.store.mutating() && !this.dirty())) return true
    if (this.pendingLeave) return this.pendingLeave
    this.leaveOpen.set(true)
    this.pendingLeave = new Promise(resolve => {
      this.leaveDecision = resolve
    })
    return this.pendingLeave
  }

  protected finishLeave(discard: boolean) {
    this.leaveOpen.set(false)
    const settle = this.leaveDecision
    this.leaveDecision = null
    this.pendingLeave = null
    settle?.(discard)
  }

  private loadVehicleDriver(id: number) {
    this.driverRead?.unsubscribe()
    this.driverRead = this.drivers.detail(driverId(id)).subscribe({
      next: record => {
        if (!record || record.driver.id !== id) {
          this.driverError.set(true)
          return
        }
        const driver: DriverRow = {
          id: record.driver.id,
          fullName:
            [record.person.firstName, record.person.lastName].filter(Boolean).join(' ') || null,
          nationalId: record.person.nationalId,
          mobileNumber: record.person.mobileNumber,
          profileImage: record.person.profileImage,
          driverLicenceLevelName: String(record.driver.driverLicenceLevelId),
        }
        this.selectedDriver.set(driver)
        this.driverSearchText.set(this.driverSearchLabel(driver))
      },
      error: () => this.driverError.set(true),
    })
  }

  private imagePayload(selection: UploadSelection): VehicleImagePayload | undefined {
    if (selection.kind !== 'replace') return undefined
    return { name: selection.file.name, ...transportImageUpload(selection.file) }
  }

  private imagePayloads(): Partial<Record<CarDocumentField, VehicleImagePayload>> {
    const carImage = this.imagePayload(this.carImage())
    const smartCardImage = this.imagePayload(this.carSmartCardImage())
    const insuranceImage = this.imagePayload(this.carInsuranceImage())
    const cardImage = this.imagePayload(this.carCardImage())
    return {
      ...(carImage ? { carImage } : {}),
      ...(smartCardImage ? { carSmartCardImage: smartCardImage } : {}),
      ...(insuranceImage ? { carInsuranceImage: insuranceImage } : {}),
      ...(cardImage ? { carCardImage: cardImage } : {}),
    }
  }

  private resetForm() {
    this.draft.set({ ...blankVehicle })
    this.typeDraft.set({ ...blankType })
    this.selectedDriver.set(null)
    this.driverError.set(false)
    this.driverSearchText.set('')
    this.driverOptions.set([])
    this.carImage.set({ kind: 'keep' })
    this.carSmartCardImage.set({ kind: 'keep' })
    this.carInsuranceImage.set({ kind: 'keep' })
    this.carCardImage.set({ kind: 'keep' })
    this.pendingTypeModel.set(null)
    this.pendingTypeRevision.set(null)
    this.typeCreated.set(false)
    this.submitted.set(false)
    this.saved = false
  }

  private readId(value: string | null): VehicleId | null {
    if (!value || !/^[1-9]\d*$/.test(value)) return null
    try {
      return carId(Number(value))
    } catch {
      return null
    }
  }

  private driverSearchLabel(driver: DriverRow) {
    return driver.fullName ?? driver.nationalId ?? `Driver ${driver.id}`
  }
}
