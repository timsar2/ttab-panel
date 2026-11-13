import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  effect,
  inject,
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
  type BilingualText,
  UploadSelection,
} from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { DRIVER_LANGUAGE } from '../driver.routes'
import { driverTextPair } from '../driver-text'
import { textForLanguage } from '@org/ui-forms'

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
          <label hlmFieldLabel [for]="idPrefix() + '-' + item.key">{{ text(item.label) }}</label>
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
                <div>{{ validationMessage(item.key, error.kind) }}</div>
              }
            </hlm-field-error>
          }
        </div>
      }
      @if (cities().length) {
        <lib-lookup-select
          [id]="idPrefix() + '-city'"
          [language]="language()"
          [label]="driverTextPair('city')"
          [placeholder]="driverTextPair('noCity')"
          [field]="personForm.cityId"
          [options]="cities()"
        />
      } @else {
        <p class="text-muted-foreground text-sm sm:col-span-2">
          {{ text(driverTextPair('city')) }}:
          {{ original()?.cityName ?? text(driverTextPair('notSelected')) }}.
          {{
            text(driverTextPair('cityLookupUnavailable')).replace(
              '{city}',
              original()?.cityName ?? text(driverTextPair('notSelected'))
            )
          }}
        </p>
      }
      <lib-coordinate-fields
        class="sm:col-span-2"
        [idPrefix]="idPrefix()"
        [language]="language()"
        [latitude]="personForm.latitude"
        [longitude]="personForm.longitude"
        [latitudeLabel]="driverTextPair('latitude')"
        [longitudeLabel]="driverTextPair('longitude')"
        [validationText]="coordinateValidationText"
      />
      <div class="sm:col-span-2">
        <lib-file-upload
          [id]="idPrefix() + '-profile-image'"
          [language]="language()"
          [label]="driverTextPair('profileImageReplacement')"
          [allowedTypes]="imageTypes"
          [maxBytes]="163840"
          [policyDescription]="driverTextPair('profileImagePolicy')"
          [existingName]="original()?.profileImage ? driverTextPair('currentProfileImage') : null"
          [existingPreview]="original()?.profileImage ?? null"
          [disabled]="busy() || !allowed() || !hydrated()"
          [resetKey]="resetKey()"
          [(value)]="image"
        />
      </div>
      @if (imageError()) {
        <p role="alert" class="sm:col-span-2">{{ text(driverTextPair('imageFailedGeneric')) }}</p>
      }
      <p class="text-muted-foreground text-sm sm:col-span-2">
        {{ text(driverTextPair(original() ? 'mobileReadonly' : 'registrationSideEffects')) }}
      </p>
      <button
        hlmBtn
        type="submit"
        class="min-h-11 justify-self-start"
        [disabled]="busy() || !hydrated() || !allowed() || imagePending()"
      >
        {{ text(driverTextPair(original() ? 'savePersonDetails' : 'registerPerson')) }}
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
  protected readonly language =
    inject(DRIVER_LANGUAGE, { optional: true }) ?? signal<'en' | 'fa'>('en')
  protected readonly driverTextPair = driverTextPair
  protected readonly imageTypes = TRANSPORT_IMAGE_FILE_TYPES
  protected readonly image = signal<UploadSelection>({ kind: 'keep' })
  protected readonly resetKey = signal(0)
  protected readonly imageError = signal(false)
  protected readonly imagePending = computed(() => !['keep', 'replace'].includes(this.image().kind))
  protected readonly hydrated = signal(false)
  protected readonly draft = signal(personDraft(null))
  readonly dirty = computed(() => this.personForm().dirty() || this.image().kind !== 'keep')
  protected readonly fields: readonly {
    key: keyof PersonDraft
    label: BilingualText
    type: string
  }[] = [
    { key: 'firstName', label: driverTextPair('firstName'), type: 'text' },
    { key: 'lastName', label: driverTextPair('lastName'), type: 'text' },
    { key: 'nationalId', label: driverTextPair('nationalId'), type: 'text' },
    { key: 'mobileNumber', label: driverTextPair('mobileNumber'), type: 'tel' },
    { key: 'email', label: driverTextPair('email'), type: 'email' },
    { key: 'phoneNumber', label: driverTextPair('phoneNumber'), type: 'tel' },
    { key: 'address', label: driverTextPair('address'), type: 'text' },
    { key: 'postalCode', label: driverTextPair('postalCode'), type: 'text' },
  ]
  protected readonly personForm = form(this.draft, path => {
    disabled(path, () => this.busy() || !this.allowed() || !this.hydrated())
    disabled(path.mobileNumber, () => this.original() !== null)
    required(path.mobileNumber)
    pattern(path.mobileNumber, /^09\d{9}$/)
    maxLength(path.firstName, 75)
    maxLength(path.lastName, 75)
    email(path.email)
    required(path.nationalId)
    pattern(path.nationalId, /^(?:\d{10})?$/)
    pattern(path.postalCode, /^(?:\d{10})?$/)
    for (const key of ['latitude', 'longitude'] as const) {
      validate(path[key], ({ value, valueOf }) => {
        const other = valueOf(path[key === 'latitude' ? 'longitude' : 'latitude']).trim()
        if (!value().trim() && !other) {
          const original = this.original()
          return original && (original.lat !== null || original.lng !== null)
            ? {
                kind: 'coordinate',
                message: this.text(driverTextPair('coordinateRemovalBlocked')),
              }
            : null
        }
        if (!value().trim())
          return { kind: 'coordinate', message: this.text(driverTextPair('bothCoordinates')) }
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
            message: this.text(driverTextPair('coordinateRange')),
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
  protected text(value: BilingualText): string {
    return textForLanguage(value, this.language())
  }
  protected validationMessage(key: keyof PersonDraft, kind: string): string {
    if (kind === 'coordinate') {
      const value = String(this.draft()[key] ?? '').trim()
      const otherKey = key === 'latitude' ? 'longitude' : 'latitude'
      const other = String(this.draft()[otherKey] ?? '').trim()
      if (!value && !other && this.original()?.lat !== null && this.original()?.lat !== undefined)
        return this.text(driverTextPair('coordinateRemovalBlocked'))
      if (!value || !other) return this.text(driverTextPair('bothCoordinates'))
      return this.text(driverTextPair('coordinateRange'))
    }
    if (kind === 'required') {
      if (key === 'mobileNumber') return this.text(driverTextPair('mobileRequired'))
      if (key === 'nationalId') return this.text(driverTextPair('nationalIdRequired'))
      return this.text(driverTextPair('fieldRequired'))
    }
    if (kind === 'email') return this.text(driverTextPair('emailFormat'))
    if (kind === 'pattern') {
      return this.text(
        driverTextPair(key === 'mobileNumber' ? 'mobileFormat' : 'tenDigitsOptional'),
      )
    }
    return this.text(driverTextPair('fieldRequired'))
  }
  protected readonly coordinateValidationText = (): BilingualText => {
    const latitude = this.draft().latitude.trim()
    const longitude = this.draft().longitude.trim()
    if (!latitude && !longitude && this.original()?.lat != null)
      return driverTextPair('coordinateRemovalBlocked')
    if (!latitude || !longitude) return driverTextPair('bothCoordinates')
    return driverTextPair('coordinateRange')
  }
  reset(original: PersonDetail | null = this.original()) {
    this.draft.set(personDraft(original))
    this.personForm().reset()
    this.image.set({ kind: 'keep' })
    this.imageError.set(false)
    this.resetKey.update(value => value + 1)
  }
  protected save(event: Event) {
    event.preventDefault()
    if (!this.allowed() || this.busy() || !this.hydrated() || this.imagePending()) return
    void submit(this.personForm, async () => {
      try {
        const selection = this.image()
        const image = selection.kind === 'replace' ? transportImageUpload(selection.file) : null
        this.imageError.set(false)
        this.submitted.emit({ draft: { ...this.draft() }, image })
      } catch {
        this.imageError.set(true)
      }
    })
  }
}
