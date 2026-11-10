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
import { FormField, disabled, form, required, submit, validate } from '@angular/forms/signals'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import {
  CompanyApi,
  CompanyDraft,
  CompanyEditorStore,
  COMPANY_LOGO_FILE_TYPES,
  companyCoordinate,
  companyDraft,
  companyReference,
} from '@org/transport-company-data-access'
import {
  ConfirmDialog,
  CoordinateFields,
  FileUploadControl,
  LookupSelect,
  SignalInput,
  UploadSelection,
} from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { COMPANY_FEATURE } from './company.routes'

@Component({
  selector: 'lib-company-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    RouterLink,
    ConfirmDialog,
    CoordinateFields,
    FileUploadControl,
    LookupSelect,
    SignalInput,
    HlmButton,
    HlmFieldImports,
    HlmAlertImports,
  ],
  providers: [CompanyApi, CompanyEditorStore],
  host: { class: 'block min-w-0 p-4 md:p-8', '(window:beforeunload)': 'beforeUnload($event)' },
  template: `
    <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">
        {{ companyId() === null ? 'Create company' : 'Edit company' }}
      </h1>
      <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['/' + config.path]"
        >Back to companies</a
      >
    </header>
    <lib-confirm-dialog
      [(open)]="leaveOpen"
      [title]="store.saving() ? 'Save in progress' : 'Discard unsaved changes?'"
      [description]="
        store.saving()
          ? 'A save is still in progress. Stay here until it completes.'
          : 'Your unsaved changes will be lost.'
      "
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      [busy]="store.saving()"
      (confirmed)="finishLeave(true)"
      (canceled)="finishLeave(false)"
    />
    @if (companyId() === undefined) {
      <p role="alert">Invalid company URL.</p>
    } @else if (!canWrite()) {
      <p role="alert">You do not have access to edit this company.</p>
    } @else if (store.status() === 'loading') {
      <p role="status">Loading company form...</p>
    } @else if (store.status() === 'missing') {
      <p role="alert">Company not found.</p>
    } @else {
      @if (store.error(); as error) {
        <div hlmAlert variant="destructive" role="alert">
          <h2 hlmAlertTitle>Unable to complete the request</h2>
          <p hlmAlertDescription>{{ error.message }}</p>
          @if (serverErrors().length) {
            <ul class="mt-2 list-inside list-disc">
              @for (field of serverErrors(); track field.key) {
                <li>
                  @if (field.id) {
                    <a class="underline" [href]="'#' + field.id">{{ field.name }}</a>
                  } @else {
                    {{ field.name }}
                  }
                  : {{ field.messages.join(' ') }}
                </li>
              }
            </ul>
          }
          @if (store.status() === 'error') {
            <button hlmBtn variant="outline" type="button" (click)="reload()">Retry</button>
          }
        </div>
      }
      @if (store.saved()) {
        <p role="status">Company saved. The selected workspace has not changed.</p>
      }
      @if (store.status() === 'ready') {
        <form
          novalidate
          class="mt-4 grid gap-5 md:grid-cols-2"
          (submit)="save($event)"
          [attr.aria-busy]="store.saving()"
        >
          <div hlmField>
            <label hlmFieldLabel for="company-name">Company name</label>
            <input
              libSignalInput
              id="company-name"
              class="min-h-11"
              [formField]="editorForm.name"
            />
            @if (editorForm.name().touched() && editorForm.name().invalid()) {
              <hlm-field-error [forceShow]="true">
                @for (error of editorForm.name().errors(); track $index) {
                  <div>{{ error.message }}</div>
                }
              </hlm-field-error>
            }
          </div>
          <lib-lookup-select
            id="company-type"
            label="Company type"
            [field]="editorForm.companyTypeId"
            [options]="typeOptions()"
          />
          <lib-lookup-select
            id="company-province"
            label="Province"
            [field]="editorForm.provinceId"
            [options]="provinceOptions()"
          />
          <lib-lookup-select
            id="company-city"
            label="City"
            [field]="editorForm.cityId"
            [options]="cityOptions()"
            [disabled]="!draft().provinceId"
            [loading]="store.citiesLoading()"
            [error]="store.citiesError()?.message ?? null"
            (retry)="store.loadCities(draft().provinceId)"
          />
          <div hlmField>
            <label hlmFieldLabel for="company-address">Address</label
            ><input
              libSignalInput
              id="company-address"
              class="min-h-11"
              [formField]="editorForm.address"
            />
          </div>
          <div hlmField>
            <label hlmFieldLabel for="company-postal">Postal code</label
            ><input
              libSignalInput
              id="company-postal"
              class="min-h-11"
              [formField]="editorForm.postalCode"
            />
          </div>
          <div hlmField>
            <label hlmFieldLabel for="company-mobile">Mobile number</label
            ><input
              libSignalInput
              id="company-mobile"
              type="tel"
              class="min-h-11"
              [formField]="editorForm.mobileNumber"
            />
          </div>
          <div hlmField>
            <label hlmFieldLabel for="company-phone">Phone number</label
            ><input
              libSignalInput
              id="company-phone"
              type="tel"
              class="min-h-11"
              [formField]="editorForm.phoneNumber"
            />
          </div>
          <div hlmField>
            <label hlmFieldLabel for="company-fax">Fax number</label
            ><input
              libSignalInput
              id="company-fax"
              type="tel"
              class="min-h-11"
              [formField]="editorForm.faxNumber"
            />
          </div>
          <div hlmField>
            <label hlmFieldLabel for="company-description">Description</label
            ><input
              libSignalInput
              id="company-description"
              class="min-h-11"
              [formField]="editorForm.description"
            />
          </div>
          <lib-coordinate-fields
            class="md:col-span-2"
            idPrefix="company-location"
            [latitude]="editorForm.latitude"
            [longitude]="editorForm.longitude"
          />
          @if (config.editor?.maxLogoBytes; as maximum) {
            <lib-file-upload
              class="md:col-span-2"
              id="company-logo"
              label="Company logo"
              [(value)]="logo"
              [allowedTypes]="logoTypes"
              [maxBytes]="maximum"
              [existingName]="store.original()?.companyLogo ? 'Current company logo' : null"
              [disabled]="store.saving()"
              [allowRemove]="false"
              [resetKey]="store.revision()"
            />
          }
          <p class="text-muted-foreground text-sm md:col-span-2">
            Existing logo is kept unless a replacement is selected. Logo removal and location
            clearing remain unavailable until backend semantics are confirmed.
          </p>
          <div class="flex flex-wrap gap-3 md:col-span-2">
            <button
              hlmBtn
              class="min-h-11"
              type="submit"
              [disabled]="store.saving() || store.citiesLoading() || logoBlocked()"
            >
              {{ store.saving() ? 'Saving...' : 'Save company' }}
            </button>
          </div>
        </form>
      }
    }
  `,
})
export class CompanyEditor {
  protected readonly leaveOpen = signal(false)
  private leaveDecision: ((value: boolean) => void) | null = null
  private pendingLeave: Promise<boolean> | null = null
  protected readonly config = inject(COMPANY_FEATURE)
  protected readonly store = inject(CompanyEditorStore)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly companyId = computed(() => {
    const value = this.params().get('companyId')
    if (value === null) return null
    try {
      return companyReference(value)
    } catch {
      return undefined
    }
  })
  protected readonly canWrite = computed(() => {
    const id = this.companyId()
    const roles = this.session.user()?.roles ?? []
    return id === null
      ? (this.config.editor?.canCreate(roles) ?? false)
      : id === undefined
        ? false
        : (this.config.editor?.canEdit(roles, id) ?? false)
  })
  protected readonly draft = signal<CompanyDraft>(companyDraft(null))
  protected readonly logo = signal<UploadSelection>({ kind: 'keep' })
  private readonly submittedLogo = signal<UploadSelection | null>(null)
  protected readonly logoTypes = COMPANY_LOGO_FILE_TYPES
  protected readonly logoBlocked = computed(() =>
    ['reading', 'invalid', 'remove'].includes(this.logo().kind),
  )
  private readonly submitted = signal<CompanyDraft | null>(null)
  protected readonly serverErrors = computed(() => {
    const fields: Record<string, { key: keyof CompanyDraft; id: string; label: string }> = {
      name: { key: 'name', id: 'company-name', label: 'Company name' },
      companytypeid: { key: 'companyTypeId', id: 'company-type', label: 'Company type' },
      cityid: { key: 'cityId', id: 'company-city', label: 'City' },
      address: { key: 'address', id: 'company-address', label: 'Address' },
      postalcode: { key: 'postalCode', id: 'company-postal', label: 'Postal code' },
      mobilenumber: { key: 'mobileNumber', id: 'company-mobile', label: 'Mobile number' },
      phonenumber: { key: 'phoneNumber', id: 'company-phone', label: 'Phone number' },
      faxnumber: { key: 'faxNumber', id: 'company-fax', label: 'Fax number' },
      description: { key: 'description', id: 'company-description', label: 'Description' },
      'coordinate.lat': { key: 'latitude', id: 'company-location-latitude', label: 'Latitude' },
      'coordinate.lng': { key: 'longitude', id: 'company-location-longitude', label: 'Longitude' },
    }
    const submitted = this.submitted()
    const draft = this.draft()
    return Object.entries(this.store.error()?.fieldErrors ?? {}).flatMap(([name, messages]) => {
      const normalized = name.toLowerCase().replace(/^request\./, '')
      if (normalized === 'companylogo' || normalized.startsWith('companylogo.')) {
        if (this.submittedLogo() && this.submittedLogo() !== this.logo()) return []
        return [{ key: name, name: 'Company logo', id: 'company-logo', messages }]
      }
      const field = fields[normalized]
      if (field && submitted && submitted[field.key] !== draft[field.key]) return []
      return [{ key: name, name: field?.label ?? name, id: field?.id ?? null, messages }]
    })
  })
  protected readonly editorForm = form(this.draft, path => {
    disabled(path, () => this.store.saving())
    required(path.name, { message: 'Company name is required.' })
    required(path.companyTypeId, { message: 'Choose a company type.' })
    for (const key of [
      'name',
      'companyTypeId',
      'cityId',
      'address',
      'postalCode',
      'mobileNumber',
      'phoneNumber',
      'faxNumber',
      'description',
    ] as const) {
      validate(path[key], ({ value }) => {
        if (this.submitted()?.[key] !== value()) return null
        const errors = this.store.error()?.fieldErrors ?? {}
        const messages = Object.entries(errors)
          .filter(
            ([field]) =>
              field.toLowerCase() === key.toLowerCase() ||
              field.toLowerCase() === 'request.' + key.toLowerCase(),
          )
          .flatMap(([, messages]) => messages)
        return messages.length ? { kind: 'server', message: messages.join(' ') } : null
      })
    }
    validate(path.companyTypeId, ({ value }) => {
      if (!value()) return null
      return this.store.types().some(type => String(type.id) === value())
        ? null
        : { kind: 'lookup', message: 'Choose a current company type.' }
    })
    validate(path.latitude, ({ value, valueOf }) =>
      this.coordinateError(value(), valueOf(path.longitude), -90, 90),
    )
    validate(path.longitude, ({ value, valueOf }) =>
      this.coordinateError(value(), valueOf(path.latitude), -180, 180),
    )
  })
  protected readonly typeOptions = computed(() =>
    this.store.types().map(item => ({ value: String(item.id), label: item.name })),
  )
  protected readonly provinceOptions = computed(() =>
    this.store.provinces().map(item => ({ value: String(item.id), label: item.name })),
  )
  protected readonly cityOptions = computed(() =>
    this.store.cities().map(item => ({ value: String(item.id), label: item.name })),
  )
  private readonly province = computed(() => this.draft().provinceId)

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.finishLeave(false)
      this.draft.set(companyDraft(null))
      this.logo.set({ kind: 'keep' })
      this.submitted.set(null)
      this.submittedLogo.set(null)
    })
    let lastRevision = -1
    let lastProvince = ''
    effect(() => {
      const id = this.companyId()
      const allowed = this.canWrite()
      untracked(() => {
        if (allowed && id !== undefined) this.store.load(id)
        else this.store.clear()
      })
    })
    effect(() => {
      const revision = this.store.revision()
      if (revision === lastRevision) return
      lastRevision = revision
      const model = companyDraft(this.store.original())
      lastProvince = model.provinceId
      this.draft.set(model)
      this.logo.set({ kind: 'keep' })
      this.submittedLogo.set(null)
      this.submitted.set(null)
      this.editorForm().reset()
      if (this.store.cityProvinceId() !== model.provinceId)
        untracked(() => this.store.loadCities(model.provinceId))
    })
    effect(() => {
      const province = this.province()
      if (province === lastProvince) return
      lastProvince = province
      untracked(() => {
        this.draft.update(draft => ({ ...draft, cityId: '' }))
        this.store.loadCities(province)
      })
    })
    effect(() => {
      if (this.store.saved() && !this.store.saving())
        untracked(() => {
          if (this.leaveDecision) this.finishLeave(true)
        })
    })
  }

  private coordinateError(value: string, other: string, minimum: number, maximum: number) {
    if (!value.trim() && !other.trim()) return null
    try {
      companyCoordinate(value, minimum, maximum)
      return null
    } catch (error) {
      return {
        kind: 'coordinate',
        message: error instanceof Error ? error.message : 'Invalid coordinate.',
      }
    }
  }
  protected reload() {
    const id = this.companyId()
    if (id !== undefined) this.store.load(id)
  }
  protected save(event: Event) {
    event.preventDefault()
    if (!this.canWrite() || this.store.saving() || this.store.citiesLoading() || this.logoBlocked())
      return
    void submit(this.editorForm, async () => {
      this.submitted.set({ ...this.draft() })
      const logo = this.logo()
      this.submittedLogo.set(logo)
      this.store.save(
        this.draft(),
        logo.kind === 'replace'
          ? { extension: logo.file.extension, data: logo.file.dataUrl, deleteCurrentImage: false }
          : null,
      )
    })
  }
  confirmLeave() {
    if (
      !this.session.user() ||
      !this.canWrite() ||
      (!this.store.saving() && !this.editorForm().dirty() && this.logo().kind === 'keep')
    )
      return true
    if (this.pendingLeave) return this.pendingLeave
    this.leaveOpen.set(true)
    this.pendingLeave = new Promise<boolean>(resolve => {
      this.leaveDecision = resolve
    })
    return this.pendingLeave
  }
  protected finishLeave(discard: boolean) {
    this.leaveOpen.set(false)
    const resolve = this.leaveDecision
    this.leaveDecision = null
    this.pendingLeave = null
    resolve?.(discard)
  }
  protected beforeUnload(event: BeforeUnloadEvent) {
    if (
      this.session.user() &&
      this.canWrite() &&
      (this.store.saving() || this.editorForm().dirty() || this.logo().kind !== 'keep')
    ) {
      event.preventDefault()
      event.returnValue = ''
    }
  }
}
