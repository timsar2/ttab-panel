import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { HlmAutocompleteImports } from '@spartan-ng/helm/autocomplete'
import { textForLanguage, type AutocompleteLanguage, type BilingualText } from './localized-text'

export type { AutocompleteLanguage, BilingualText } from './localized-text'

/** Reusable server-backed autocomplete. The consumer owns query and result data. */
@Component({
  selector: 'lib-autocomplete-search',
  imports: [HlmAutocompleteImports, HlmFieldImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full min-w-0 max-w-full sm:max-w-md md:max-w-lg' },
  template: `
    <div hlmField class="relative w-full min-w-0" [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <label hlmFieldLabel class="block min-w-0 whitespace-normal" [for]="id()">
        {{ text(label()) }}
      </label>
      <hlm-autocomplete
        class="block w-full min-w-0"
        [autoHighlight]="true"
        [disabled]="disabled()"
        [itemToString]="itemToString"
        [search]="query()"
        (searchChange)="onSearchChange($event)"
        [value]="selectedId()"
        (valueChange)="onValueChange($event)"
      >
        <hlm-autocomplete-input
          class="min-h-11 w-full"
          [inputId]="id()"
          inputClass="min-h-11 w-full"
          [ariaLabel]="text(label())"
          [placeholder]="text(placeholder())"
          [showSearch]="true"
          [showClear]="true"
          [clearLabel]="text(clearLabel())"
        />
        <hlm-autocomplete-content *hlmAutocompletePortal class="w-full">
          @if (loading() || pending()) {
            <hlm-autocomplete-status role="status" aria-live="polite">
              {{ text(loadingLabel()) }}
            </hlm-autocomplete-status>
          } @else if (query().trim().length < minCharacters()) {
            <hlm-autocomplete-status role="status">
              {{ text(minimumQueryLabel()) }}
            </hlm-autocomplete-status>
          }
          <hlm-autocomplete-empty>
            @if (query().trim().length >= minCharacters() && !loading() && !pending()) {
              {{ text(emptyLabel()) }}
            }
          </hlm-autocomplete-empty>
          <div hlmAutocompleteList [attr.aria-label]="text(label())">
            @for (option of options(); track optionId()(option)) {
              <hlm-autocomplete-item [value]="optionId()(option)">
                <span class="min-w-0 flex-1 break-words">{{ text(optionLabel()(option)) }}</span>
                @if (optionDescription()(option); as description) {
                  <span class="text-muted-foreground min-w-0 text-xs break-words">
                    {{ text(description) }}
                  </span>
                }
              </hlm-autocomplete-item>
            }
          </div>
        </hlm-autocomplete-content>
      </hlm-autocomplete>
    </div>
  `,
})
export class AutocompleteSearch<T> {
  readonly id = input.required<string>()
  readonly language = input<AutocompleteLanguage>('en')
  readonly label = input.required<BilingualText>()
  readonly placeholder = input.required<BilingualText>()
  readonly clearLabel = input.required<BilingualText>()
  readonly loadingLabel = input.required<BilingualText>()
  readonly minimumQueryLabel = input.required<BilingualText>()
  readonly emptyLabel = input.required<BilingualText>()
  readonly disabled = input(false)
  readonly minCharacters = input(2)
  readonly debounceMs = input(350)
  readonly options = input<readonly T[]>([])
  readonly selectedOption = input<T | null>(null)
  readonly loading = input(false)
  readonly optionId = input.required<(option: T) => string>()
  readonly optionLabel = input.required<(option: T) => BilingualText>()
  readonly optionDescription = input<(option: T) => BilingualText | null>(() => null)
  readonly query = model('')
  readonly queryRequested = output<string>()
  readonly optionSelected = output<T>()
  protected readonly pending = signal(false)
  protected readonly selectedId = signal<string | null>(null)
  private readonly selectedLabel = signal('')
  protected readonly itemToString = (value: unknown) => {
    if (typeof value === 'string' && value === this.selectedId()) return this.selectedLabel()
    const option = this.findOption(value)
    return option ? this.text(this.optionLabel()(option)) : ''
  }
  private timer: ReturnType<typeof setTimeout> | undefined
  private suppressedSearch: string | null = null
  private readonly destroyRef = inject(DestroyRef)

  protected text(value: BilingualText): string {
    return textForLanguage(value, this.language())
  }

  constructor() {
    effect(() => {
      const option = this.selectedOption()
      const id = option ? this.optionId()(option) : null
      const label = option ? this.text(this.optionLabel()(option)) : ''
      if (id !== this.selectedId()) this.selectedId.set(id)
      if (label !== this.selectedLabel()) this.selectedLabel.set(label)
      if (label) this.suppressedSearch = label
    })
    this.destroyRef.onDestroy(() => clearTimeout(this.timer))
  }

  protected onSearchChange(value: string) {
    if (this.selectedId() && (this.suppressedSearch === value || value === '')) {
      this.suppressedSearch = null
      return
    }
    this.suppressedSearch = null
    this.query.set(value)
    this.selectedId.set(null)
    this.selectedLabel.set('')
    clearTimeout(this.timer)
    if (value.trim().length < this.minCharacters()) {
      this.pending.set(false)
      this.queryRequested.emit('')
      return
    }
    this.pending.set(true)
    this.timer = setTimeout(() => {
      this.pending.set(false)
      this.queryRequested.emit(value.trim())
    }, this.debounceMs())
  }

  protected onValueChange(value: unknown) {
    const option = this.findOption(value)
    const previouslySelected = this.selectedId()
    const selectedLabel = option ? this.text(this.optionLabel()(option)) : ''
    this.selectedId.set(option ? this.optionId()(option) : null)
    clearTimeout(this.timer)
    this.pending.set(false)
    if (!option) {
      this.suppressedSearch = null
      this.selectedLabel.set('')
      if (previouslySelected) {
        this.query.set('')
        this.queryRequested.emit('')
      }
      return
    }
    this.selectedLabel.set(selectedLabel)
    this.suppressedSearch = selectedLabel
    this.optionSelected.emit(option)
  }

  private findOption(value: unknown): T | null {
    if (typeof value !== 'string') return null
    return this.options().find(option => this.optionId()(option) === value) ?? null
  }
}
