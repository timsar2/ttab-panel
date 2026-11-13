import {
  afterEveryRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core'
import { FieldTree } from '@angular/forms/signals'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { HlmNativeSelect, HlmNativeSelectImports } from '@spartan-ng/helm/native-select'
import { textForLanguage, type AutocompleteLanguage, type BilingualText } from './localized-text'

type LookupText = string | BilingualText

@Component({
  selector: 'lib-lookup-select',
  imports: [HlmButton, HlmFieldImports, HlmNativeSelectImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.id]': 'null' },
  template: `
    <div hlmField>
      <label hlmFieldLabel [for]="id()">{{ text(label()) }}</label>
      <hlm-native-select
        #select
        selectClass="min-h-11"
        [selectId]="id()"
        [attr.id]="null"
        [value]="field()().value()"
        (valueChange)="onValueChange($event)"
        [disabled]="unavailable()"
        [aria-invalid]="showErrors()"
        [forceInvalid]="showErrors()"
      >
        <option hlmNativeSelectOption value="">{{ text(placeholder()) }}</option>
        @if (unknownValue(); as value) {
          <option hlmNativeSelectOption [value]="value">
            {{ text(copy.currentSelection) }} ({{ value }})
          </option>
        }
        @for (option of options(); track option.value) {
          <option hlmNativeSelectOption [value]="option.value">{{ option.label }}</option>
        }
      </hlm-native-select>
      @if (loading()) {
        <p hlmFieldDescription [id]="id() + '-loading'" role="status">{{ text(copy.loading) }}</p>
      }
      @if (error()) {
        <hlm-field-error [id]="id() + '-load-error'" [forceShow]="true">
          {{ errorLabel() ? text(errorLabel()!) : text(copy.loadError) }}
        </hlm-field-error>
        <button
          hlmBtn
          class="min-h-11"
          type="button"
          variant="outline"
          [disabled]="unavailable()"
          (click)="retry.emit()"
        >
          {{ text(copy.retry) }}
        </button>
      }
      @if (showErrors()) {
        <hlm-field-error [id]="id() + '-errors'" [forceShow]="true">
          @for (error of field()().errors(); track $index) {
            <div>{{ validationMessage(error.kind, error.message) }}</div>
          }
        </hlm-field-error>
      }
    </div>
  `,
})
export class LookupSelect {
  readonly field = input.required<FieldTree<string>>()
  readonly id = input.required<string>()
  readonly label = input.required<LookupText>()
  readonly options = input.required<readonly { value: string; label: string }[]>()
  readonly loading = input(false)
  readonly error = input<string | null>(null)
  readonly disabled = input(false)
  readonly placeholder = input<LookupText>({ en: 'Choose an option', fa: 'یک گزینه انتخاب کنید' })
  readonly language = input<AutocompleteLanguage>('en')
  readonly errorLabel = input<BilingualText | null>(null)
  readonly validationText = input<((kind: string, message: string) => LookupText | null) | null>(
    null,
  )
  protected readonly copy = {
    currentSelection: { en: 'Current selection', fa: 'مقدار فعلی' },
    loading: { en: 'Loading options...', fa: 'در حال بارگذاری گزینه‌ها...' },
    loadError: { en: 'Options could not be loaded.', fa: 'بارگذاری گزینه‌ها ناموفق بود.' },
    retry: { en: 'Retry', fa: 'تلاش دوباره' },
    required: { en: 'This field is required.', fa: 'تکمیل این فیلد الزامی است.' },
    invalid: { en: 'Choose a valid value.', fa: 'یک مقدار معتبر انتخاب کنید.' },
  } satisfies Record<string, BilingualText>
  readonly retry = output<void>()

  protected readonly unavailable = computed(
    () =>
      this.disabled() || this.loading() || this.field()().disabled() || this.field()().readonly(),
  )
  protected readonly showErrors = computed(
    () => this.field()().touched() && this.field()().invalid() && !this.unavailable(),
  )
  protected readonly unknownValue = computed(() => {
    const value = this.field()().value()
    return value && !this.options().some(option => option.value === value) ? value : null
  })
  private readonly select = viewChild.required('select', { read: ElementRef<HTMLElement> })
  private readonly selectControl = viewChild.required(HlmNativeSelect)
  protected text(value: LookupText): string {
    return typeof value === 'string' ? value : textForLanguage(value, this.language())
  }

  protected validationMessage(kind: string, message: string | undefined): string {
    const custom = this.validationText()?.(kind, message ?? '')
    if (custom) return this.text(custom)
    if (this.language() === 'en' && message) return message
    const key = kind === 'required' ? 'required' : 'invalid'
    return textForLanguage(this.copy[key], this.language())
  }

  protected onValueChange(value: string | null | undefined): void {
    const state = this.field()()
    if (!this.unavailable() && typeof value === 'string' && value !== state.value()) {
      state.value.set(value)
      state.markAsDirty()
    }
    // Helm updates its local value before emitting, including synthetic outputs
    // while locked. Keep that local state consistent with the parent field.
    this.selectControl().writeValue(state.value())
  }

  constructor() {
    // Use the CVA's supported touch hook without attaching FormField: Helm alone
    // owns native disabled state through its disabled input.
    afterEveryRender(() => {
      this.selectControl().registerOnTouched(() => {
        if (!this.unavailable()) this.field()().markAsTouched()
      })
      const select = this.select().nativeElement.querySelector('select')
      if (!select) return
      // Projected options can be replaced without a value change. Native select
      // then falls back to its first option unless its selection is reconciled.
      select.value = this.field()().value()
      select.setAttribute('aria-label', this.text(this.label()))
      const descriptions = [
        this.loading() ? `${this.id()}-loading` : '',
        this.error() ? `${this.id()}-load-error` : '',
        this.showErrors() ? `${this.id()}-errors` : '',
      ]
        .filter(Boolean)
        .join(' ')
      if (descriptions) select.setAttribute('aria-describedby', descriptions)
      else select.removeAttribute('aria-describedby')
    })
  }
}
