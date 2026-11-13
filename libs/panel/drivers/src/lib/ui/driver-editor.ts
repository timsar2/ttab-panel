import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChildren,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { disabled, form, submit, validate } from '@angular/forms/signals'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { DriverDraft, DriversApi, DriversStore } from '@org/transport-drivers-data-access'
import { PeopleApi, PeopleSearchStore, PersonRow } from '@org/transport-people-data-access'
import {
  TRANSPORT_IMAGE_FILE_TYPES,
  TransportImageUpload,
  transportImageUpload,
} from '@org/transport-http'
import {
  AutocompleteSearch,
  ConfirmDialog,
  FileUploadControl,
  LookupSelect,
  UploadSelection,
  type BilingualText,
} from '@org/ui-forms'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import {
  DRIVER_FEATURE,
  DRIVER_LANGUAGE,
  DRIVER_MANAGE,
  DRIVER_REGISTER,
  DRIVER_PERSON_CITIES,
} from '../driver.routes'
import { DriverPersonEditorStore } from '../person-editor.store'
import {
  DRIVER_TEXT,
  driverFieldLabel,
  driverText,
  driverTextPair,
  safeDriverError,
  type DriverTextKey,
} from '../driver-text'
import { driverDocuments, routeDriverId } from './driver-detail'
import { DriverPersonForm, DriverPersonSubmission } from './person-form'

type DocumentKey = (typeof driverDocuments)[number]['key']
const emptyUploads = (): Record<DocumentKey, UploadSelection> => ({
  nationalCardFrontImage: { kind: 'keep' },
  nationalCardBehindImage: { kind: 'keep' },
  drivingLicenceImage: { kind: 'keep' },
  driverSmartCardImage: { kind: 'keep' },
})

export function driverReplacement(selection: UploadSelection): TransportImageUpload | undefined {
  if (selection.kind === 'keep') return undefined
  if (selection.kind !== 'replace') throw new Error('invalid-upload')
  return transportImageUpload(selection.file)
}

@Component({
  selector: 'lib-driver-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ConfirmDialog,
    FileUploadControl,
    LookupSelect,
    AutocompleteSearch,
    DriverPersonForm,
    HlmButton,
    HlmFieldImports,
    HlmAlertImports,
  ],
  providers: [DriversStore, PeopleSearchStore, DriverPersonEditorStore],
  host: { class: 'block min-w-0 p-4 md:p-8', '(window:beforeunload)': 'beforeUnload($event)' },
  template: `
    <header class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-muted-foreground mb-1 text-sm">
          {{ text(id() === null ? 'driverOnboarding' : 'driverRecord') }}
        </p>
        <h1 class="text-2xl font-semibold">
          {{ text(id() === null ? 'addDriverTitle' : 'editDriverTitle') }}
        </h1>
      </div>
      <a
        hlmBtn
        variant="outline"
        class="min-h-11"
        [routerLink]="['.']"
        [relativeTo]="route.parent"
        queryParamsHandling="preserve"
        >{{ text('backToDrivers') }}</a
      >
    </header>
    <lib-confirm-dialog
      [(open)]="leaveOpen"
      [title]="text('discardUnsaved')"
      [description]="text(busy() ? 'saveInProgress' : 'discardChangesDescription')"
      [confirmLabel]="text('discardChanges')"
      [cancelLabel]="text('keepEditing')"
      [busy]="busy()"
      (confirmed)="finishLeave(true)"
      (canceled)="finishLeave(false)"
    />
    @if (id() === undefined) {
      <p role="alert">{{ text('invalidDriverUrl') }}</p>
    } @else if (!canWrite()) {
      <p role="alert">
        {{ deniedMessage() }}
      </p>
    } @else if (id() !== null && store.detailStatus() === 'loading') {
      <p role="status">{{ text('loadingDriverDetails') }}</p>
    } @else if (id() !== null && store.detailStatus() === 'denied') {
      <p role="alert">{{ text('accessDriverDenied') }}</p>
    } @else if (id() !== null && store.detailStatus() === 'missing') {
      <p role="alert">{{ text('driverNotFound') }}</p>
    } @else if (id() !== null && store.detailStatus() === 'error') {
      <p role="alert">{{ safeError(store.detailError(), 'detailFailedGeneric') }}</p>
      <button hlmBtn variant="outline" (click)="reload()">{{ text('retry') }}</button>
    } @else {
      @if (id() === null) {
        <ol
          [attr.aria-label]="text('onboardingProgress')"
          class="border-border mb-6 grid grid-cols-2 border-b pb-4 text-sm"
        >
          <li [attr.aria-current]="!selected() ? 'step' : null">
            <span class="font-semibold">01</span> {{ text('selectPersistedPerson') }}
          </li>
          <li [attr.aria-current]="selected() ? 'step' : null">
            <span class="font-semibold">02</span> {{ text('licenceAndDocuments') }}
          </li>
        </ol>
      }
      @if (id() === null) {
        <section aria-labelledby="person-selection-title" [hidden]="selected() !== null">
          <h2 id="person-selection-title" class="mb-2 text-xl font-semibold">
            {{ text('startWithPerson') }}
          </h2>
          <p class="text-muted-foreground mb-5">
            {{ text('selectExistingCompanyPerson') }}
          </p>
          <lib-autocomplete-search
            class="mb-5 w-full"
            id="driver-person-search"
            [language]="language()"
            [label]="DRIVER_TEXT.personNameOrNationalId"
            [placeholder]="DRIVER_TEXT.driverSearchHint"
            [clearLabel]="DRIVER_TEXT.clearPersonSearch"
            [loadingLabel]="DRIVER_TEXT.searching"
            [minimumQueryLabel]="DRIVER_TEXT.minimumSearch"
            [emptyLabel]="DRIVER_TEXT.noMatchingPeople"
            [query]="personSearchText()"
            [options]="people.page()?.items ?? []"
            [loading]="people.loading()"
            [optionId]="personRowId"
            [optionLabel]="personRowLabel"
            [optionDescription]="personOptionDescription"
            (queryRequested)="searchPeople($event)"
            (optionSelected)="selectPerson($event)"
          />
          @if (canRegister()) {
            <button
              hlmBtn
              variant="outline"
              type="button"
              class="my-5 min-h-11"
              (click)="registerOpen.set(!registerOpen())"
            >
              {{ text(registerOpen() ? 'hideRegistration' : 'registerNewPerson') }}
            </button>
            <section
              [hidden]="!registerOpen()"
              class="border-border bg-card text-card-foreground border p-5"
              aria-labelledby="person-registration-title"
            >
              <h2 id="person-registration-title" class="mb-4 text-xl font-semibold">
                {{ text('registerPerson') }}
              </h2>
              <lib-driver-person-form
                [cities]="cities()"
                [allowed]="canRegister() && canWrite()"
                [busy]="busy() || personStore.unconfirmed()"
                (submitted)="savePerson($event)"
              />
            </section>
          }
        </section>
      }
      @if (personStore.error(); as error) {
        <div hlmAlert variant="destructive" role="alert" class="my-4">
          <h2 hlmAlertTitle>{{ text('personSaveFailed') }}</h2>
          <p hlmAlertDescription>{{ safeError(error, 'personFailedGeneric') }}</p>
          @for (field of personErrors(); track field.key) {
            <p>{{ fieldLabel(field.key) }}: {{ text('serverFieldInvalid') }}</p>
          }
        </div>
      }
      @if (personStore.unconfirmed()) {
        <p role="alert">{{ text('persistedPersonMissing') }}</p>
      }
      @if (id() === null && selected()) {
        @switch (store.detailStatus()) {
          @case ('loading') {
            <p role="status">{{ text('checkExistingDriver') }}</p>
          }
          @case ('denied') {
            <p role="alert">
              {{ text('existingDriverDenied') }}
            </p>
          }
          @case ('error') {
            <p role="alert">{{ safeError(store.detailError(), 'detailFailedGeneric') }}</p>
            <button hlmBtn variant="outline" (click)="reload()">
              {{ text('retryDriverCheck') }}
            </button>
          }
        }
        @if (!ready()) {
          <button
            hlmBtn
            variant="outline"
            class="mt-4"
            [disabled]="busy()"
            (click)="changePerson()"
          >
            {{ text('chooseAnotherPerson') }}
          </button>
        }
      }
      @if (ready()) {
        @if (id() === null && store.detail()) {
          <p role="status" class="mb-4">
            {{ text('existingDriverNotice') }}
          </p>
        }
        <section
          class="bg-card text-card-foreground border-border mb-6 border p-5"
          aria-labelledby="selected-person-title"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-muted-foreground text-sm">{{ text('persistedPerson') }}</p>
              <h2 id="selected-person-title" class="text-xl font-semibold">{{ personName() }}</h2>
              <p class="text-muted-foreground mt-1 text-sm">
                {{ personIdentity() }}
              </p>
            </div>
            @if (id() === null) {
              <button
                hlmBtn
                variant="outline"
                type="button"
                [disabled]="busy() || personDirty()"
                (click)="changePerson()"
              >
                {{ text('chooseAnotherPerson') }}
              </button>
            }
            <button
              hlmBtn
              variant="outline"
              type="button"
              [disabled]="busy()"
              (click)="togglePersonEditor()"
            >
              {{ text(editPerson() ? 'hidePersonEditor' : 'editPerson') }}
            </button>
          </div>
          @if (personStore.loading()) {
            <p role="status" class="mt-4">{{ text('loadingPerson') }}</p>
          }
          @if (currentPerson(); as person) {
            <div class="mt-5" [hidden]="!editPerson()">
              <lib-driver-person-form
                idPrefix="selected-person"
                [cities]="cities()"
                [original]="person"
                [allowed]="canWrite()"
                [busy]="busy() || personStore.unconfirmed()"
                (submitted)="savePerson($event)"
              />
            </div>
          }
          @if (personStore.saved()) {
            <p class="mt-3 text-sm" role="status">{{ text('personSaved') }}</p>
          }
        </section>
        @if (store.saveError(); as error) {
          <div hlmAlert variant="destructive" role="alert" class="mb-5">
            <h2 hlmAlertTitle>{{ text('driverSaveFailed') }}</h2>
            <p hlmAlertDescription>{{ safeError(error, 'saveFailedGeneric') }}</p>
            @for (field of driverErrors(); track field.key) {
              <p>{{ fieldLabel(field.key) }}: {{ text('serverFieldInvalid') }}</p>
            }
          </div>
        }
        @if (localError()) {
          <p role="alert" class="mb-4">{{ text(localError()!) }}</p>
        }
        @if (store.saveOutcome() === 'unconfirmed') {
          <p role="alert" class="mb-4">{{ text('saveUnconfirmed') }}</p>
        }
        <form
          novalidate
          class="grid gap-6"
          (submit)="save($event)"
          [attr.aria-busy]="store.saving()"
        >
          <section aria-labelledby="licence-title" class="max-w-md">
            <h2 id="licence-title" class="mb-4 text-xl font-semibold">
              {{ text('driverInformation') }}
            </h2>
            <lib-lookup-select
              id="driver-licence"
              [language]="language()"
              [label]="DRIVER_TEXT.licenceValue"
              [placeholder]="DRIVER_TEXT.selectLicence"
              [errorLabel]="DRIVER_TEXT.selectLicenceRequired"
              [validationText]="licenceValidationText"
              [field]="driverForm.licence"
              [options]="licenceOptions"
            />
            <p class="text-muted-foreground mt-2 text-sm">
              {{ text('licenceStoredNote') }}
            </p>
          </section>
          <fieldset hlmFieldSet [disabled]="unavailable()">
            <legend hlmFieldLegend>{{ text('documentReplacements') }}</legend>
            <p class="text-muted-foreground mb-5 text-sm">
              {{ text('documentReplacementNote') }}
            </p>
            <div class="grid gap-6 sm:grid-cols-2">
              @for (document of documents; track document.key) {
                <div>
                  <lib-file-upload
                    [id]="'driver-' + document.key"
                    [language]="language()"
                    [label]="document.label"
                    [allowedTypes]="imageTypes"
                    [maxBytes]="163840"
                    [policyDescription]="DRIVER_TEXT.documentImagePolicy"
                    [existingName]="
                      store.detail()?.driver?.[document.key] ? document.currentLabel : null
                    "
                    [existingPreview]="store.detail()?.driver?.[document.key] ?? null"
                    [disabled]="unavailable()"
                    [resetKey]="resetKey()"
                    [value]="uploads()[document.key]"
                    (valueChange)="setUpload(document.key, $event)"
                  />
                </div>
              }
            </div>
          </fieldset>
          <footer class="border-border flex flex-wrap items-center gap-3 border-t pt-5">
            <button
              hlmBtn
              type="submit"
              class="min-h-11"
              [disabled]="unavailable() || uploadsPending() || personDirty()"
            >
              {{ text(store.saving() ? 'savingDriver' : 'saveDriver') }}
            </button>
            <p class="text-muted-foreground text-sm">
              {{ text('roleAssignmentNote') }}
            </p>
            @if (personDirty()) {
              <p role="status">
                {{ text('savePersonFirst') }}
              </p>
              <button
                hlmBtn
                variant="outline"
                type="button"
                [disabled]="busy()"
                (click)="discardPersonDraft()"
              >
                {{ text('discardPersonChanges') }}
              </button>
            }
          </footer>
        </form>
      }
    }
  `,
})
export class DriverEditor {
  protected readonly route = inject(ActivatedRoute)
  protected readonly language = inject(DRIVER_LANGUAGE)
  protected readonly DRIVER_TEXT = DRIVER_TEXT
  protected readonly config = inject(DRIVER_FEATURE)
  protected readonly store = inject(DriversStore)
  protected readonly people = inject(PeopleSearchStore)
  protected readonly personStore = inject(DriverPersonEditorStore)
  private readonly api = inject(DriversApi)
  private readonly peopleApi = inject(PeopleApi)
  private readonly session = inject(SessionStore)
  private readonly manage = inject(DRIVER_MANAGE)
  protected readonly canRegister = inject(DRIVER_REGISTER)
  protected readonly cities = inject(DRIVER_PERSON_CITIES)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly id = computed(() => routeDriverId(this.params().get('id')))
  protected readonly canWrite = computed(
    () =>
      this.manage() &&
      !!this.session.user() &&
      this.api.companyId() !== null &&
      this.api.companyId() === this.peopleApi.companyId(),
  )
  protected readonly selected = signal<PersonRow | null>(null)
  protected readonly registerOpen = signal(false)
  protected readonly editPerson = signal(false)
  protected readonly personSearchText = signal('')
  private readonly searchQuery = signal({ text: '', pageIndex: 0, pageSize: 10 })
  protected readonly personRowId = (row: PersonRow) => String(row.id)
  protected readonly personRowLabel = (row: PersonRow): BilingualText => ({
    en: row.fullName ?? `${driverText('en', 'person')} ${row.id}`,
    fa: row.fullName ?? `${driverText('fa', 'person')} ${row.id}`,
  })
  protected readonly personOptionDescription = (row: PersonRow): BilingualText | null =>
    row.nationalId === null ? null : { en: row.nationalId, fa: row.nationalId }
  protected readonly licenceValidationText = (kind: string) =>
    driverTextPair(kind === 'required' ? 'selectLicenceRequired' : 'selectLicenceKnown')
  protected readonly ready = computed(() =>
    this.id() === null
      ? this.selected() !== null && ['missing', 'ready'].includes(this.store.detailStatus())
      : this.store.detailStatus() === 'ready' && this.store.detail()?.driver.id === this.id(),
  )
  protected readonly personId = computed(
    () => this.selected()?.id ?? this.store.detail()?.person.id ?? null,
  )
  protected readonly currentPerson = computed(() => {
    const id = this.personId()
    return (
      [this.personStore.saved(), this.personStore.detail(), this.store.detail()?.person].find(
        person => person?.id === id,
      ) ?? null
    )
  })
  protected readonly personName = computed(() => {
    const name =
      this.selected()?.fullName ??
      [this.currentPerson()?.firstName, this.currentPerson()?.lastName].filter(Boolean).join(' ')
    return name || `${this.text('person')} ${this.personId() ?? ''}`
  })
  protected readonly personNationalId = computed(
    () => this.selected()?.nationalId ?? this.currentPerson()?.nationalId,
  )
  protected readonly documents = driverDocuments
  protected readonly imageTypes = TRANSPORT_IMAGE_FILE_TYPES
  protected readonly uploads = signal(emptyUploads())
  protected readonly resetKey = signal(0)
  protected readonly uploadsPending = computed(() =>
    Object.values(this.uploads()).some(value => !['keep', 'replace'].includes(value.kind)),
  )
  private readonly draft = signal({ licence: '' })
  private readonly hydrated = signal(false)
  protected readonly busy = computed(
    () => this.store.saving() || this.personStore.saving() || this.personStore.loading(),
  )
  protected readonly unavailable = computed(
    () =>
      !this.hydrated() ||
      !this.canWrite() ||
      this.busy() ||
      this.store.saveOutcome() === 'unconfirmed',
  )
  protected readonly driverForm = form(this.draft, path => {
    disabled(path, () => this.unavailable())
    validate(path.licence, ({ value }) => {
      if (!value()) return { kind: 'required', message: this.text('selectLicenceRequired') }
      return ['1', '2'].includes(value())
        ? null
        : { kind: 'licence', message: this.text('selectLicenceKnown') }
    })
  })
  protected readonly licenceOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
  ]
  protected readonly localError = signal<DriverTextKey | null>(null)
  protected readonly personErrors = computed(() =>
    Object.keys(this.personStore.error()?.fieldErrors ?? {}).map(key => ({ key })),
  )
  protected readonly driverErrors = computed(() =>
    Object.keys(this.store.saveError()?.fieldErrors ?? {}).map(key => ({ key })),
  )
  private readonly personForms = viewChildren(DriverPersonForm)
  protected readonly personDirty = computed(() => this.personForms().some(form => form.dirty()))
  protected readonly leaveOpen = signal(false)
  private decision: ((value: boolean) => void) | null = null
  private pendingLeave: Promise<boolean> | null = null
  private saved = false

  protected text(key: DriverTextKey): string {
    return driverText(this.language(), key)
  }

  protected safeError(error: unknown, fallback: Parameters<typeof safeDriverError>[2]): string {
    return safeDriverError(error, this.language(), fallback)
  }

  protected fieldLabel(key: string): string {
    return driverFieldLabel(key, this.language())
  }

  protected deniedMessage(): string {
    return this.config.deniedMessage?.[this.language()] ?? this.text('accessManageDenied')
  }

  protected personIdentity(): string {
    return this.text('personIdNationalId')
      .replace('{id}', String(this.personId() ?? '-'))
      .replace('{nationalId}', this.personNationalId() ?? '-')
  }

  constructor() {
    afterNextRender(() => this.hydrated.set(true))
    let hydratedId: number | null = null
    effect(() => {
      const id = this.id()
      const allowed = this.canWrite()
      this.api.companyId()
      this.peopleApi.companyId()
      this.session.version()
      untracked(() => {
        hydratedId = null
        this.saved = false
        this.store.clear()
        this.people.clear()
        this.personStore.clear()
        this.selected.set(null)
        this.registerOpen.set(false)
        this.editPerson.set(false)
        this.draft.set({ licence: '' })
        this.driverForm().reset()
        this.uploads.set(emptyUploads())
        this.resetKey.update(value => value + 1)
        this.localError.set(null)
        this.personSearchText.set('')
        this.finishLeave(false)
        if (allowed && id) this.store.loadDetail(id)
      })
    })
    effect(() => {
      const record = this.store.detail()
      if (
        !record ||
        record.driver.id !== (this.id() ?? this.selected()?.id) ||
        hydratedId === record.driver.id
      )
        return
      hydratedId = record.driver.id
      untracked(() => {
        this.draft.set({ licence: String(record.driver.driverLicenceLevelId) })
        this.driverForm().reset()
      })
    })
    effect(() => {
      const person = this.personStore.saved()
      if (!person) return
      untracked(() => {
        if (this.id() === null) {
          this.selected.set({
            id: person.id,
            fullName: [person.firstName, person.lastName].filter(Boolean).join(' '),
            nationalId: person.nationalId,
            profileImage: person.profileImage,
          })
          this.registerOpen.set(false)
          if (this.store.detailStatus() === 'idle') this.store.loadDetail(person.id)
        } else this.editPerson.set(false)
        this.personForms().forEach(form =>
          form.reset(form.original()?.id === person.id ? person : null),
        )
      })
    })
    effect(() => {
      if (this.store.saveOutcome() !== 'confirmed' || this.store.saving()) return
      const record = this.store.saved()
      if (!record) return
      untracked(() => {
        this.saved = true
        this.driverForm().reset()
        this.uploads.set(emptyUploads())
        this.finishLeave(true)
        void this.router.navigate([record.driver.id], {
          relativeTo: this.route.parent,
          queryParamsHandling: 'preserve',
        })
      })
    })
    inject(DestroyRef).onDestroy(() => {
      this.finishLeave(false)
      this.uploads.set(emptyUploads())
      this.selected.set(null)
    })
  }
  protected reload() {
    const id = this.id() ?? this.selected()?.id
    if (id) this.store.loadDetail(id)
  }
  protected searchPeople(value: string) {
    this.personSearchText.set(value)
    this.searchQuery.set({ ...this.searchQuery(), text: value, pageIndex: 0 })
    if (value.trim().length < 2) {
      this.people.clear()
      return
    }
    this.loadPeople()
  }
  protected loadPeople() {
    const query = this.searchQuery()
    const numeric = /^\d+$/.test(query.text.trim())
    this.people.load({
      fullName: numeric ? '' : query.text.trim(),
      nationalId: numeric ? query.text.trim() : '',
      userShiftState: null,
      pageIndex: query.pageIndex,
      pageSize: query.pageSize,
    })
  }
  protected selectPerson(person: PersonRow) {
    if (this.canWrite() && this.people.select(person.id)) {
      this.personStore.clear()
      this.editPerson.set(false)
      this.selected.set(person)
      this.personSearchText.set(person.fullName ?? `${this.text('person')} ${person.id}`)
      this.store.loadDetail(person.id)
    }
  }
  protected async changePerson() {
    if (this.busy() || !(await this.confirmLeave())) return
    this.selected.set(null)
    this.store.clear()
    this.personStore.clear()
    this.editPerson.set(false)
    this.draft.set({ licence: '' })
    this.driverForm().reset()
    this.uploads.set(emptyUploads())
    this.resetKey.update(value => value + 1)
  }
  protected togglePersonEditor() {
    if (!this.canWrite() || this.busy()) return
    this.editPerson.update(open => !open)
    const id = this.personId()
    if (this.editPerson() && id && !this.currentPerson()) this.personStore.load(id)
  }
  protected savePerson(submission: DriverPersonSubmission) {
    const creating = this.id() === null && this.selected() === null
    if (
      !this.canWrite() ||
      (creating && !this.canRegister()) ||
      (!creating && !this.currentPerson())
    )
      return
    this.personStore.save(
      submission.draft,
      creating ? null : this.currentPerson(),
      submission.image,
    )
  }
  protected discardPersonDraft() {
    this.personForms().forEach(form => form.reset())
  }
  protected setUpload(key: DocumentKey, value: UploadSelection) {
    this.uploads.update(values => ({ ...values, [key]: value }))
  }
  protected save(event: Event) {
    event.preventDefault()
    if (this.unavailable() || !this.ready() || this.uploadsPending() || this.personDirty()) return
    void submit(this.driverForm, async () => {
      const id = this.personId()
      if (!id) return
      try {
        const images: Partial<Record<DocumentKey, TransportImageUpload>> = {}
        for (const document of this.documents) {
          const image = driverReplacement(this.uploads()[document.key])
          if (image) images[document.key] = image
        }
        const draft: DriverDraft = {
          driverLicenceLevelId: Number(this.draft().licence) as 1 | 2,
          ...images,
        }
        if (
          new TextEncoder().encode(
            JSON.stringify({ ...draft, id, companyId: this.api.companyId() }),
          ).length > 1048576
        )
          throw new Error('combined-images-too-large')
        this.localError.set(null)
        this.store.save(id, draft)
      } catch (error) {
        this.localError.set(
          error instanceof Error && error.message === 'combined-images-too-large'
            ? 'imageSizeExceeded'
            : 'imagePrepareFailed',
        )
      }
    })
  }
  private dirty() {
    return (
      !this.saved &&
      (this.driverForm().dirty() ||
        !!this.selected() ||
        this.personDirty() ||
        Object.values(this.uploads()).some(value => value.kind !== 'keep'))
    )
  }
  confirmLeave() {
    if (!this.canWrite() || (!this.busy() && !this.dirty())) return true
    if (this.pendingLeave) return this.pendingLeave
    this.leaveOpen.set(true)
    this.pendingLeave = new Promise(resolve => {
      this.decision = resolve
    })
    return this.pendingLeave
  }
  protected finishLeave(discard: boolean) {
    this.leaveOpen.set(false)
    const resolve = this.decision
    this.decision = null
    this.pendingLeave = null
    resolve?.(discard)
  }
  protected beforeUnload(event: BeforeUnloadEvent) {
    if (this.canWrite() && (this.busy() || this.dirty())) {
      event.preventDefault()
      event.returnValue = ''
    }
  }
}
