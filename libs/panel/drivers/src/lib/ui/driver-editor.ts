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
import { FormField, disabled, form, required, submit, validate } from '@angular/forms/signals'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { DriverDraft, DriversApi, DriversStore } from '@org/transport-drivers-data-access'
import { PeopleApi, PeopleSearchStore, PersonRow } from '@org/transport-people-data-access'
import {
  TRANSPORT_IMAGE_FILE_TYPES,
  TransportImageUpload,
  transportImageUpload,
} from '@org/transport-http'
import { DataTable, DataTableColumn, DataTablePage } from '@org/ui-data-table'
import {
  ConfirmDialog,
  FileUploadControl,
  LookupSelect,
  SignalInput,
  UploadSelection,
} from '@org/ui-forms'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import {
  DRIVER_FEATURE,
  DRIVER_MANAGE,
  DRIVER_REGISTER,
  DRIVER_PERSON_CITIES,
} from '../driver.routes'
import { DriverPersonEditorStore } from '../person-editor.store'
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
  if (selection.kind !== 'replace')
    throw new Error('Finish selecting valid replacement documents before saving.')
  return transportImageUpload(selection.file)
}

@Component({
  selector: 'lib-driver-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    RouterLink,
    ConfirmDialog,
    FileUploadControl,
    LookupSelect,
    SignalInput,
    DataTable,
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
          {{ id() === null ? 'Driver onboarding' : 'Driver record' }}
        </p>
        <h1 class="text-2xl font-semibold">{{ id() === null ? 'Add driver' : 'Edit driver' }}</h1>
      </div>
      <a
        hlmBtn
        variant="outline"
        class="min-h-11"
        [routerLink]="['.']"
        [relativeTo]="route.parent"
        queryParamsHandling="preserve"
        >Back to drivers</a
      >
    </header>
    <lib-confirm-dialog
      [(open)]="leaveOpen"
      title="Discard unsaved changes?"
      [description]="
        busy()
          ? 'A save is in progress. Stay here until it completes.'
          : 'Unsaved person and driver changes will be lost.'
      "
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      [busy]="busy()"
      (confirmed)="finishLeave(true)"
      (canceled)="finishLeave(false)"
    />
    @if (id() === undefined) {
      <p role="alert">Invalid driver URL.</p>
    } @else if (!canWrite()) {
      <p role="alert">
        {{ config.deniedMessage ?? 'You do not have access to manage drivers in this company.' }}
      </p>
    } @else if (id() !== null && store.detailStatus() === 'loading') {
      <p role="status">Loading driver details...</p>
    } @else if (id() !== null && store.detailStatus() === 'denied') {
      <p role="alert">You do not have access to this driver.</p>
    } @else if (id() !== null && store.detailStatus() === 'missing') {
      <p role="alert">Driver not found.</p>
    } @else if (id() !== null && store.detailStatus() === 'error') {
      <p role="alert">{{ store.detailError()?.message }}</p>
      <button hlmBtn variant="outline" (click)="reload()">Retry</button>
    } @else {
      @if (id() === null) {
        <ol
          aria-label="Onboarding progress"
          class="border-border mb-6 grid grid-cols-2 border-b pb-4 text-sm"
        >
          <li [attr.aria-current]="!selected() ? 'step' : null">
            <span class="font-semibold">01</span> Select a persisted person
          </li>
          <li [attr.aria-current]="selected() ? 'step' : null">
            <span class="font-semibold">02</span> Licence & documents
          </li>
        </ol>
      }
      @if (id() === null) {
        <section aria-labelledby="person-selection-title" [hidden]="selected() !== null">
          <h2 id="person-selection-title" class="mb-2 text-xl font-semibold">
            Start with a person
          </h2>
          <p class="text-muted-foreground mb-5">
            Select an existing company person. A national ID alone is not a persisted identity.
          </p>
          <form class="mb-5 flex flex-wrap items-end gap-3" (submit)="searchPeople($event)">
            <div hlmField class="min-w-0 flex-1">
              <label hlmFieldLabel for="driver-person-search">Person name or national ID</label>
              <input
                libSignalInput
                id="driver-person-search"
                type="search"
                class="min-h-11"
                [formField]="personSearchForm.text"
              />
            </div>
            <button hlmBtn variant="outline" type="submit" class="min-h-11">Find person</button>
          </form>
          @if (searched()) {
            <lib-data-table
              [rows]="people.page()?.items ?? []"
              [columns]="personColumns"
              [rowId]="personRowId"
              [rowLabel]="personRowLabel"
              caption="Existing people"
              [loading]="people.loading()"
              [error]="
                people.error()?.message ??
                (people.status() === 'denied' ? 'People access is not approved.' : null)
              "
              [page]="personPage()"
              actionLabel="Select person"
              (rowAction)="selectPerson($event)"
              (pageChange)="pagePeople($event)"
              (retry)="loadPeople()"
            />
          }
          @if (canRegister()) {
            <button
              hlmBtn
              variant="outline"
              type="button"
              class="my-5 min-h-11"
              (click)="registerOpen.set(!registerOpen())"
            >
              {{ registerOpen() ? 'Hide registration' : 'Register a new person' }}
            </button>
            <section
              [hidden]="!registerOpen()"
              class="border-border bg-card text-card-foreground border p-5"
              aria-labelledby="person-registration-title"
            >
              <h2 id="person-registration-title" class="mb-4 text-xl font-semibold">
                Register person
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
          <h2 hlmAlertTitle>Person could not be saved</h2>
          <p hlmAlertDescription>{{ error.message }}</p>
          @for (field of personErrors(); track field.key) {
            <p>{{ field.key }}: {{ field.messages.join(' ') }}</p>
          }
        </div>
      }
      @if (personStore.unconfirmed()) {
        <p role="alert">
          The server did not return a persisted person. Verify the people list before registering
          again. Driver saving is unavailable.
        </p>
      }
      @if (id() === null && selected()) {
        @switch (store.detailStatus()) {
          @case ('loading') {
            <p role="status">Checking existing driver information...</p>
          }
          @case ('denied') {
            <p role="alert">
              Existing driver information could not be authorized. Driver saving is unavailable.
            </p>
          }
          @case ('error') {
            <p role="alert">{{ store.detailError()?.message }}</p>
            <button hlmBtn variant="outline" (click)="reload()">Retry driver check</button>
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
            Choose another person
          </button>
        }
      }
      @if (ready()) {
        @if (id() === null && store.detail()) {
          <p role="status" class="mb-4">
            This person already has a driver record. Existing licence and documents are loaded;
            saving will update that record.
          </p>
        }
        <section
          class="bg-card text-card-foreground border-border mb-6 border p-5"
          aria-labelledby="selected-person-title"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-muted-foreground text-sm">Persisted person</p>
              <h2 id="selected-person-title" class="text-xl font-semibold">{{ personName() }}</h2>
              <p class="text-muted-foreground mt-1 text-sm">
                Person ID {{ personId() }} | National ID {{ personNationalId() ?? '-' }}
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
                Choose another person
              </button>
            }
            <button
              hlmBtn
              variant="outline"
              type="button"
              [disabled]="busy()"
              (click)="togglePersonEditor()"
            >
              {{ editPerson() ? 'Hide person editor' : 'Edit person details' }}
            </button>
          </div>
          @if (personStore.loading()) {
            <p role="status" class="mt-4">Loading person details...</p>
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
            <p class="mt-3 text-sm" role="status">Person details saved.</p>
          }
        </section>
        @if (store.saveError(); as error) {
          <div hlmAlert variant="destructive" role="alert" class="mb-5">
            <h2 hlmAlertTitle>Driver could not be saved</h2>
            <p hlmAlertDescription>{{ error.message }}</p>
            @for (field of driverErrors(); track field.key) {
              <p>{{ field.key }}: {{ field.messages.join(' ') }}</p>
            }
          </div>
        }
        @if (localError()) {
          <p role="alert" class="mb-4">{{ localError() }}</p>
        }
        @if (store.saveOutcome() === 'unconfirmed') {
          <p role="alert" class="mb-4">
            The server accepted the request without confirming the saved record. Verify driver
            details before saving again.
          </p>
        }
        <form
          novalidate
          class="grid gap-6"
          (submit)="save($event)"
          [attr.aria-busy]="store.saving()"
        >
          <section aria-labelledby="licence-title" class="max-w-md">
            <h2 id="licence-title" class="mb-4 text-xl font-semibold">Driver information</h2>
            <lib-lookup-select
              id="driver-licence"
              label="Licence value"
              placeholder="Select licence value"
              [field]="driverForm.licence"
              [options]="licenceOptions"
            />
            <p class="text-muted-foreground mt-2 text-sm">
              Values are shown as stored. No qualification or availability is inferred.
            </p>
          </section>
          <fieldset hlmFieldSet [disabled]="unavailable()">
            <legend hlmFieldLegend>Document replacements</legend>
            <p class="text-muted-foreground mb-5 text-sm">
              Optional. Existing documents are preserved unless you choose a replacement. Removal is
              not available. Maximum 160 KiB per image.
            </p>
            <div class="grid gap-6 sm:grid-cols-2">
              @for (document of documents; track document.key) {
                <div>
                  @if (store.detail()?.driver?.[document.key]; as image) {
                    <figure class="border-border mb-3 border p-3">
                      <figcaption class="text-muted-foreground mb-2 text-sm">
                        Current {{ document.label }}
                      </figcaption>
                      <img
                        [src]="image"
                        [alt]="'Current ' + document.label"
                        class="max-h-40 max-w-full object-contain"
                      />
                    </figure>
                  }
                  <lib-file-upload
                    [id]="'driver-' + document.key"
                    [label]="document.label"
                    [allowedTypes]="imageTypes"
                    [maxBytes]="163840"
                    policyDescription="JPEG, PNG or WebP. Up to 160 KiB. Existing documents are kept unless replaced."
                    [existingName]="
                      store.detail()?.driver?.[document.key] ? 'current document' : null
                    "
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
              {{ store.saving() ? 'Saving driver...' : 'Save driver' }}
            </button>
            <p class="text-muted-foreground text-sm">
              Saving may assign the linked account the Driver role.
            </p>
            @if (personDirty()) {
              <p role="status">
                Save person changes first, or discard them before saving the driver.
              </p>
              <button
                hlmBtn
                variant="outline"
                type="button"
                [disabled]="busy()"
                (click)="discardPersonDraft()"
              >
                Discard person changes
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
  protected readonly searched = signal(false)
  private readonly searchDraft = signal({ text: '' })
  private readonly searchQuery = signal({ text: '', pageIndex: 0, pageSize: 10 })
  protected readonly personSearchForm = form(this.searchDraft)
  protected readonly personColumns: readonly DataTableColumn<PersonRow>[] = [
    { accessorKey: 'fullName', header: 'Person' },
    { accessorKey: 'nationalId', header: 'National ID' },
  ]
  protected readonly personRowId = (row: PersonRow) => String(row.id)
  protected readonly personRowLabel = (row: PersonRow) => row.fullName ?? `Person ${row.id}`
  protected readonly personPage = computed<DataTablePage>(() => ({
    ...this.searchQuery(),
    totalPages: this.people.page()?.pagination.totalPages ?? 0,
    hasPreviousPage: this.people.page()?.pagination.hasPreviousPage ?? false,
    hasNextPage: this.people.page()?.pagination.hasNextPage ?? false,
  }))
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
  protected readonly personName = computed(
    () =>
      this.selected()?.fullName ??
      [this.currentPerson()?.firstName, this.currentPerson()?.lastName].filter(Boolean).join(' '),
  )
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
    required(path.licence, { message: 'Choose a licence value.' })
    validate(path.licence, ({ value }) =>
      !value() || ['1', '2'].includes(value())
        ? null
        : { kind: 'licence', message: 'Choose licence value 1 or 2.' },
    )
  })
  protected readonly licenceOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
  ]
  protected readonly localError = signal<string | null>(null)
  protected readonly personErrors = computed(() =>
    Object.entries(this.personStore.error()?.fieldErrors ?? {}).map(([key, messages]) => ({
      key,
      messages,
    })),
  )
  protected readonly driverErrors = computed(() =>
    Object.entries(this.store.saveError()?.fieldErrors ?? {}).map(([key, messages]) => ({
      key,
      messages,
    })),
  )
  private readonly personForms = viewChildren(DriverPersonForm)
  protected readonly personDirty = computed(() => this.personForms().some(form => form.dirty()))
  protected readonly leaveOpen = signal(false)
  private decision: ((value: boolean) => void) | null = null
  private pendingLeave: Promise<boolean> | null = null
  private saved = false

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
        this.searched.set(false)
        this.draft.set({ licence: '' })
        this.driverForm().reset()
        this.uploads.set(emptyUploads())
        this.resetKey.update(value => value + 1)
        this.localError.set(null)
        this.searchDraft.set({ text: '' })
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
  protected searchPeople(event: Event) {
    event.preventDefault()
    this.searchQuery.set({ ...this.searchQuery(), text: this.searchDraft().text, pageIndex: 0 })
    this.loadPeople()
  }
  protected pagePeople(page: { pageIndex: number; pageSize: number }) {
    this.searchQuery.update(query => ({ ...query, ...page }))
    this.loadPeople()
  }
  protected loadPeople() {
    this.searched.set(true)
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
          throw new Error(
            'Combined images exceed the 1 MiB request limit. Choose smaller replacements.',
          )
        this.localError.set(null)
        this.store.save(id, draft)
      } catch (error) {
        this.localError.set(
          error instanceof Error ? error.message : 'Unable to prepare driver documents.',
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
