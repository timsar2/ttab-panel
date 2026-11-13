import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import { FieldTree, FormField } from '@angular/forms/signals'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { textForLanguage, type AutocompleteLanguage, type BilingualText } from './localized-text'
import { SignalInput } from './signal-input'

@Component({
  selector: 'lib-coordinate-fields',
  imports: [FormField, SignalInput, HlmButton, HlmFieldImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div hlmFieldGroup>
      <div hlmField>
        <label hlmFieldLabel [for]="idPrefix() + '-latitude'">{{ text(latitudeLabel()) }}</label>
        <input
          libSignalInput
          class="min-h-11"
          type="text"
          inputmode="decimal"
          [id]="idPrefix() + '-latitude'"
          [formField]="latitude()"
          [attr.aria-label]="text(latitudeLabel())"
          [attr.aria-describedby]="
            latitude()().touched() && latitude()().invalid()
              ? idPrefix() + '-latitude-errors'
              : null
          "
        />
        @if (latitude()().touched() && latitude()().invalid()) {
          <hlm-field-error [id]="idPrefix() + '-latitude-errors'" [forceShow]="true">
            @for (error of latitude()().errors(); track $index) {
              <div>{{ validationMessage(error.kind, error.message) }}</div>
            }
          </hlm-field-error>
        }
      </div>
      <div hlmField>
        <label hlmFieldLabel [for]="idPrefix() + '-longitude'">{{ text(longitudeLabel()) }}</label>
        <input
          libSignalInput
          class="min-h-11"
          type="text"
          inputmode="decimal"
          [id]="idPrefix() + '-longitude'"
          [formField]="longitude()"
          [attr.aria-label]="text(longitudeLabel())"
          [attr.aria-describedby]="
            longitude()().touched() && longitude()().invalid()
              ? idPrefix() + '-longitude-errors'
              : null
          "
        />
        @if (longitude()().touched() && longitude()().invalid()) {
          <hlm-field-error [id]="idPrefix() + '-longitude-errors'" [forceShow]="true">
            @for (error of longitude()().errors(); track $index) {
              <div>{{ validationMessage(error.kind, error.message) }}</div>
            }
          </hlm-field-error>
        }
      </div>
      @if (mapEnabled()) {
        <button
          hlmBtn
          class="min-h-11"
          type="button"
          variant="outline"
          [disabled]="mapUnavailable()"
          (click)="mapRequested.emit()"
        >
          {{ text(mapText) }}
        </button>
      }
    </div>
  `,
})
export class CoordinateFields {
  readonly latitude = input.required<FieldTree<string>>()
  readonly longitude = input.required<FieldTree<string>>()
  readonly idPrefix = input.required<string>()
  readonly latitudeLabel = input<string | BilingualText>({ en: 'Latitude', fa: 'عرض جغرافیایی' })
  readonly longitudeLabel = input<string | BilingualText>({ en: 'Longitude', fa: 'طول جغرافیایی' })
  readonly language = input<AutocompleteLanguage>('en')
  readonly validationText = input<
    ((kind: string, message: string) => string | BilingualText | null) | null
  >(null)
  readonly mapEnabled = input(false)
  readonly mapRequested = output<void>()

  protected readonly mapUnavailable = computed(
    () =>
      this.latitude()().disabled() ||
      this.latitude()().readonly() ||
      this.longitude()().disabled() ||
      this.longitude()().readonly(),
  )
  protected readonly invalidText: BilingualText = {
    en: 'Enter a valid coordinate within its geographic range.',
    fa: 'مختصات معتبر در محدوده جغرافیایی وارد کنید.',
  }
  protected readonly mapText: BilingualText = { en: 'Choose on map', fa: 'انتخاب روی نقشه' }
  protected text(value: string | BilingualText): string {
    if (typeof value === 'string') return value
    return textForLanguage(value, this.language())
  }

  protected validationMessage(kind: string, message: string | undefined): string {
    const custom = this.validationText()?.(kind, message ?? '')
    if (custom) return this.text(custom)
    if (this.language() === 'en' && message) return message
    return this.text(this.invalidText)
  }
}
