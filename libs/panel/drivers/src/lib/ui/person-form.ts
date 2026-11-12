import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core'
import {
  FormField,
  disabled,
  email,
  form,
  maxLength,
  pattern,
  required,
  submit,
  validate,
} from '@angular/forms/signals'
import { PersonDetail, PersonDraft, personDraft } from '@org/transport-people-data-access'
import {
  TRANSPORT_IMAGE_FILE_TYPES,
  TransportImageUpload,
  transportCoordinate,
  transportImageUpload,
} from '@org/transport-http'
import {
  CoordinateFields,
  FileUploadControl,
  LookupSelect,
  SignalInput,
  UploadSelection,
} from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'

export interface DriverPersonSubmission {
  readonly draft: PersonDraft
  readonly image: TransportImageUpload | null
}

@Component({
  selector: 'lib-driver-person-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    SignalInput,
    CoordinateFields,
    LookupSelect,
    FileUploadControl,
    HlmButton,
    HlmFieldImports,
  ],
  template: `
    <form
      novalidate
      class="grid gap-4 sm:grid-cols-2"
      (submit)="save($event)"
      [attr.aria-busy]="busy()"
    >
      @for (item of fields; track item.key) {
        <div hlmField>
          <label hlmFieldLabel [for]="idPrefix() + '-' + item.key">{{ item.label }}</label>
          <input
            libSignalInput
            [id]="idPrefix() + '-' + item.key"
            class="min-h-11"
            [type]="item.type"
            [formField]="personForm[item.key]"
          />
          @if (personForm[item.key]().touched() && personForm[item.key]().invalid()) {
            <hlm-field-error [forceShow]="true">
              @for (error of personForm[item.key]().errors(); track $index) {
                <div>{{ error.message }}</div>
              }
            </hlm-field-error>
          }
        </div>
      }
      @if (cities().length) {
        <lib-lookup-select
          [id]="idPrefix() + '-city'"
          label="City"
          placeholder="No city selected"
          [field]="personForm.cityId"
          [options]="cities()"
        />
      } @else {
        <p class="text-muted-foreground text-sm sm:col-span-2">
          City: {{ original()?.cityName ?? 'Not selected' }}. City changes require a configured
          geography lookup.
        </p>
      }
      <lib-coordinate-fields
        class="sm:col-span-2"
        [idPrefix]="idPrefix()"
        [latitude]="personForm.latitude"
        [longitude]="personForm.longitude"
      />
      <div class="sm:col-span-2">
        @if (original()?.profileImage; as image) {
          <figure class="mb-3">
            <figcaption class="text-muted-foreground mb-2 text-sm">
              Current profile image
            </figcaption>
            <img
              [src]="image"
              alt="Current person profile"
              class="max-h-32 max-w-full object-contain"
            />
          </figure>
        }
        <lib-file-upload
          [id]="idPrefix() + '-profile-image'"
          label="Profile image replacement"
          [allowedTypes]="imageTypes"
          [maxBytes]="163840"
          policyDescription="JPEG, PNG or WebP. Up to 160 KiB. Existing profile image is kept unless replaced."
          [existingName]="original()?.profileImage ? 'current profile image' : null"
          [disabled]="busy() || !allowed() || !hydrated()"
          [resetKey]="resetKey()"
          [(value)]="image"
        />
      </div>
      @if (imageError()) {
        <p role="alert" class="sm:col-span-2">{{ imageError() }}</p>
      }
      <p class="text-muted-foreground text-sm sm:col-span-2">
        {{
          original()
            ? 'Mobile number is read-only on existing records.'
            : 'Registration creates a linked account and may send welcome messages. It does not assign panel permissions.'
        }}
      </p>
      <button
        hlmBtn
        type="submit"
        class="min-h-11 justify-self-start"
        [disabled]="busy() || !hydrated() || !allowed() || imagePending()"
      >
        {{ original() ? 'Save person details' : 'Register person' }}
      </button>
    </form>
  `,
})
export class DriverPersonForm {
  readonly idPrefix = input('person')
  readonly original = input<PersonDetail | null>(null)
  readonly busy = input(false)
  readonly allowed = input(false)
  readonly cities = input<readonly { value: string; label: string }[]>([])
  readonly submitted = output<DriverPersonSubmission>()
  protected readonly imageTypes = TRANSPORT_IMAGE_FILE_TYPES
  protected readonly image = signal<UploadSelection>({ kind: 'keep' })
  protected readonly resetKey = signal(0)
  protected readonly imageError = signal<string | null>(null)
  protected readonly imagePending = computed(() => !['keep', 'replace'].includes(this.image().kind))
  protected readonly hydrated = signal(false)
  protected readonly draft = signal(personDraft(null))
  readonly dirty = computed(() => this.personForm().dirty() || this.image().kind !== 'keep')
  protected readonly fields: readonly { key: keyof PersonDraft; label: string; type: string }[] = [
    { key: 'firstName', label: 'First name', type: 'text' },
    { key: 'lastName', label: 'Last name', type: 'text' },
    { key: 'nationalId', label: 'National ID', type: 'text' },
    { key: 'mobileNumber', label: 'Mobile number', type: 'tel' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phoneNumber', label: 'Phone number', type: 'tel' },
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'postalCode', label: 'Postal code', type: 'text' },
  ]
  protected readonly personForm = form(this.draft, path => {
    disabled(path, () => this.busy() || !this.allowed() || !this.hydrated())
    disabled(path.mobileNumber, () => this.original() !== null)
    required(path.mobileNumber, { message: 'Enter a mobile number.' })
    pattern(path.mobileNumber, /^09\d{9}$/, {
      message: 'Enter an 11-digit mobile number starting with 09.',
    })
    maxLength(path.firstName, 75)
    maxLength(path.lastName, 75)
    email(path.email, { message: 'Enter a valid email address.' })
    required(path.nationalId, {
      message: 'Enter the national ID required for driver registration.',
    })
    pattern(path.nationalId, /^(?:\d{10})?$/, {
      message: 'Enter 10 digits, or leave this field empty.',
    })
    pattern(path.postalCode, /^(?:\d{10})?$/, {
      message: 'Enter 10 digits, or leave this field empty.',
    })
    for (const key of ['latitude', 'longitude'] as const) {
      validate(path[key], ({ value, valueOf }) => {
        const other = valueOf(path[key === 'latitude' ? 'longitude' : 'latitude']).trim()
        if (!value().trim() && !other) {
          const original = this.original()
          return original && (original.lat !== null || original.lng !== null)
            ? {
                kind: 'coordinate',
                message:
                  'Existing coordinates cannot be removed until the backend contract is approved.',
              }
            : null
        }
        if (!value().trim())
          return { kind: 'coordinate', message: 'Enter both latitude and longitude.' }
        try {
          transportCoordinate(
            value(),
            key === 'latitude' ? -90 : -180,
            key === 'latitude' ? 90 : 180,
          )
          return null
        } catch {
          return {
            kind: 'coordinate',
            message: 'Enter a valid coordinate within its geographic range.',
          }
        }
      })
    }
  })
  constructor() {
    afterNextRender(() => this.hydrated.set(true))
    let previousId: number | null | undefined
    effect(() => {
      const original = this.original()
      const id = original?.id ?? null
      if (id === previousId) return
      previousId = id
      untracked(() => {
        this.reset()
      })
    })
  }
  reset(original: PersonDetail | null = this.original()) {
    this.draft.set(personDraft(original))
    this.personForm().reset()
    this.image.set({ kind: 'keep' })
    this.imageError.set(null)
    this.resetKey.update(value => value + 1)
  }
  protected save(event: Event) {
    event.preventDefault()
    if (!this.allowed() || this.busy() || !this.hydrated() || this.imagePending()) return
    void submit(this.personForm, async () => {
      try {
        const selection = this.image()
        const image = selection.kind === 'replace' ? transportImageUpload(selection.file) : null
        this.imageError.set(null)
        this.submitted.emit({ draft: { ...this.draft() }, image })
      } catch (error) {
        this.imageError.set(
          error instanceof Error ? error.message : 'Select a valid profile image.',
        )
      }
    })
  }
}
