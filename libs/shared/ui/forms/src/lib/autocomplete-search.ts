import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { HlmInput } from '@spartan-ng/helm/input'

/** Reusable server-backed autocomplete. The consumer owns query and result data. */
@Component({
  selector: 'lib-autocomplete-search',
  imports: [HlmInput, HlmFieldImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div hlmField class="relative min-w-0">
      <label hlmFieldLabel [for]="id()">{{ label() }}</label>
      <input
        hlmInput
        [id]="id()"
        type="search"
        class="min-h-11 pe-20"
        role="combobox"
        aria-autocomplete="list"
        [attr.aria-label]="label()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-controls]="isOpen() ? id() + '-options' : null"
        [attr.aria-activedescendant]="activeOptionId()"
        [attr.placeholder]="placeholder()"
        [value]="query()"
        [disabled]="disabled()"
        (input)="onInput($event)"
        (keydown)="onKeydown($event)"
        (focus)="onFocus()"
        (blur)="onBlur()"
      />
      @if (query()) {
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground focus-visible:outline-ring absolute end-2 top-8 min-h-11 min-w-11 rounded-md focus-visible:outline-2"
          [attr.aria-label]="clearLabel()"
          [disabled]="disabled()"
          (click)="clear()"
        >
          Clear
        </button>
      }
      @if (isOpen()) {
        <div
          class="bg-popover text-popover-foreground border-border absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto border shadow-md"
        >
          @if (loading() || pending()) {
            <p class="text-muted-foreground px-3 py-2 text-sm" role="status">
              {{ loadingLabel() }}
            </p>
          } @else if (query().trim().length < minCharacters()) {
            <p class="text-muted-foreground px-3 py-2 text-sm" role="status">
              {{ minimumQueryLabel() }}
            </p>
          } @else if (!options().length) {
            <p class="text-muted-foreground px-3 py-2 text-sm" role="status">{{ emptyLabel() }}</p>
          } @else {
            <ul [id]="id() + '-options'" role="listbox" [attr.aria-label]="label()">
              @for (option of options(); track optionId()(option); let index = $index) {
                <li role="presentation">
                  <button
                    type="button"
                    role="option"
                    class="hover:bg-accent focus-visible:bg-accent flex min-h-11 w-full flex-col items-start px-3 py-2 text-start focus-visible:outline-none"
                    [id]="id() + '-option-' + index"
                    [attr.aria-selected]="activeIndex() === index"
                    (pointerdown)="$event.preventDefault()"
                    (click)="choose(option)"
                  >
                    <span>{{ optionLabel()(option) }}</span>
                    @if (optionDescription()(option); as description) {
                      <span class="text-muted-foreground text-xs">{{ description }}</span>
                    }
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      }
    </div>
  `,
})
export class AutocompleteSearch<T> {
  readonly id = input.required<string>()
  readonly label = input.required<string>()
  readonly placeholder = input('')
  readonly clearLabel = input('Clear search')
  readonly loadingLabel = input('Searching...')
  readonly minimumQueryLabel = input('Enter at least 2 characters to search.')
  readonly emptyLabel = input('No matching results.')
  readonly disabled = input(false)
  readonly minCharacters = input(2)
  readonly debounceMs = input(350)
  readonly options = input<readonly T[]>([])
  readonly loading = input(false)
  readonly optionId = input.required<(option: T) => string>()
  readonly optionLabel = input.required<(option: T) => string>()
  readonly optionDescription = input<(option: T) => string | null>(() => null)
  readonly query = model('')
  readonly queryRequested = output<string>()
  readonly optionSelected = output<T>()
  protected readonly focused = signal(false)
  protected readonly activeIndex = signal(-1)
  protected readonly pending = signal(false)
  protected readonly activeOptionId = computed(() =>
    this.activeIndex() >= 0 && this.activeIndex() < this.options().length
      ? `${this.id()}-option-${this.activeIndex()}`
      : null,
  )
  protected readonly isOpen = computed(
    () => this.focused() && (this.loading() || this.pending() || this.query().length > 0),
  )
  private timer: ReturnType<typeof setTimeout> | undefined
  private readonly destroyRef = inject(DestroyRef)

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.timer))
  }

  protected onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value
    this.query.set(value)
    this.activeIndex.set(-1)
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

  protected onFocus() {
    this.focused.set(true)
  }

  protected onBlur() {
    this.focused.set(false)
    this.activeIndex.set(-1)
  }

  protected onKeydown(event: KeyboardEvent) {
    const count = this.options().length
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault()
      this.focused.set(true)
      this.activeIndex.update(index => (index + 1) % count)
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault()
      this.activeIndex.update(index => (index <= 0 ? count - 1 : index - 1))
    } else if (event.key === 'Enter' && this.activeIndex() >= 0 && this.activeIndex() < count) {
      event.preventDefault()
      this.choose(this.options()[this.activeIndex()])
    } else if (event.key === 'Escape') {
      this.focused.set(false)
      this.activeIndex.set(-1)
    }
  }

  protected choose(option: T) {
    clearTimeout(this.timer)
    this.pending.set(false)
    this.query.set(this.optionLabel()(option))
    this.activeIndex.set(-1)
    this.focused.set(false)
    this.optionSelected.emit(option)
  }

  protected clear() {
    clearTimeout(this.timer)
    this.pending.set(false)
    this.query.set('')
    this.activeIndex.set(-1)
    this.focused.set(true)
    this.queryRequested.emit('')
  }
}
