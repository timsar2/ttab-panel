import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import { FieldTree, FormField } from '@angular/forms/signals'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { SignalInput } from './signal-input'

@Component({
  selector: 'lib-coordinate-fields',
  imports: [FormField, SignalInput, HlmButton, HlmFieldImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div hlmFieldGroup>
      <div hlmField>
        <label hlmFieldLabel [for]="idPrefix() + '-latitude'">{{ latitudeLabel() }}</label>
        <input
          libSignalInput
          class="min-h-11"
          type="text"
          inputmode="decimal"
          [id]="idPrefix() + '-latitude'"
          [formField]="latitude()"
          [attr.aria-label]="latitudeLabel()"
          [attr.aria-describedby]="
            latitude()().touched() && latitude()().invalid()
              ? idPrefix() + '-latitude-errors'
              : null
          "
        />
        @if (latitude()().touched() && latitude()().invalid()) {
          <hlm-field-error [id]="idPrefix() + '-latitude-errors'" [forceShow]="true">
            @for (error of latitude()().errors(); track $index) {
              <div>{{ error.message || 'Invalid value' }}</div>
            }
          </hlm-field-error>
        }
      </div>
      <div hlmField>
        <label hlmFieldLabel [for]="idPrefix() + '-longitude'">{{ longitudeLabel() }}</label>
        <input
          libSignalInput
          class="min-h-11"
          type="text"
          inputmode="decimal"
          [id]="idPrefix() + '-longitude'"
          [formField]="longitude()"
          [attr.aria-label]="longitudeLabel()"
          [attr.aria-describedby]="
            longitude()().touched() && longitude()().invalid()
              ? idPrefix() + '-longitude-errors'
              : null
          "
        />
        @if (longitude()().touched() && longitude()().invalid()) {
          <hlm-field-error [id]="idPrefix() + '-longitude-errors'" [forceShow]="true">
            @for (error of longitude()().errors(); track $index) {
              <div>{{ error.message || 'Invalid value' }}</div>
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
          Choose on map
        </button>
      }
    </div>
  `,
})
export class CoordinateFields {
  readonly latitude = input.required<FieldTree<string>>()
  readonly longitude = input.required<FieldTree<string>>()
  readonly idPrefix = input.required<string>()
  readonly latitudeLabel = input('Latitude')
  readonly longitudeLabel = input('Longitude')
  readonly mapEnabled = input(false)
  readonly mapRequested = output<void>()

  protected readonly mapUnavailable = computed(
    () =>
      this.latitude()().disabled() ||
      this.latitude()().readonly() ||
      this.longitude()().disabled() ||
      this.longitude()().readonly(),
  )
}
