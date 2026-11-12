import { isPlatformBrowser } from '@angular/common'
import {
  ChangeDetectionStrategy,
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { HlmInput } from '@spartan-ng/helm/input'

export type UploadSelection =
  | { kind: 'keep' }
  | { kind: 'reading' }
  | { kind: 'invalid'; message: string }
  | {
      kind: 'replace'
      file: { name: string; mime: string; size: number; extension: string; dataUrl: string }
    }
  | { kind: 'remove' }

@Component({
  selector: 'lib-file-upload',
  imports: [HlmButton, HlmFieldImports, HlmInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0', '[attr.id]': 'null' },
  template: `
    <div hlmField class="min-w-0">
      <label hlmFieldLabel [for]="id()">{{ label() }}</label>
      <input
        #fileInput
        hlmInput
        class="h-auto min-h-11 w-full max-w-full min-w-0 file:min-h-11 file:min-w-11"
        type="file"
        [id]="id()"
        [accept]="accept()"
        [disabled]="unavailable()"
        [forceInvalid]="value().kind === 'invalid'"
        [attr.aria-label]="label()"
        [attr.aria-invalid]="value().kind === 'invalid' ? 'true' : null"
        [attr.aria-describedby]="
          id() +
          '-policy ' +
          id() +
          '-status' +
          (value().kind === 'invalid' ? ' ' + id() + '-error' : '')
        "
        (change)="selectFile($event)"
      />
      <p hlmFieldDescription class="wrap-anywhere" [id]="id() + '-policy'">
        @if (policyDescription(); as description) {
          {{ description }}
        } @else {
          Allowed: {{ accept() || 'No file types configured' }}. Maximum: {{ maxBytes() }} bytes.
        }
      </p>
      <p hlmFieldDescription [id]="id() + '-status'" role="status" aria-live="polite">
        @switch (value().kind) {
          @case ('keep') {
            {{ existingName() ? 'Keeping existing file: ' + existingName() : 'No file selected.' }}
          }
          @case ('reading') {
            Reading file...
          }
          @case ('replace') {
            Replacement file ready.
          }
          @case ('invalid') {
            File not accepted. Existing file is unchanged.
          }
          @case ('remove') {
            Existing file marked for removal.
          }
        }
      </p>
      @if (invalidMessage(); as message) {
        <hlm-field-error [id]="id() + '-error'" [forceShow]="true">{{ message }}</hlm-field-error>
      }
      @if (replacement(); as file) {
        <p hlmFieldDescription class="wrap-anywhere">
          {{ file.name }} ({{ file.mime }}, {{ file.size }} bytes)
        </p>
        @if (previewUrl(); as url) {
          @if (file.mime.startsWith('image/')) {
            <img
              [src]="url"
              [alt]="label() + ' preview'"
              class="max-h-48 max-w-full object-contain"
            />
          } @else {
            <a
              hlmBtn
              variant="outline"
              class="min-h-11 min-w-11"
              [href]="url"
              [download]="file.name"
              [disabled]="unavailable()"
              >Download selected file</a
            >
          }
        }
      }
      <div class="flex flex-wrap gap-2">
        @if (value().kind !== 'keep') {
          <button
            hlmBtn
            type="button"
            variant="outline"
            class="min-h-11 min-w-11"
            [disabled]="unavailable()"
            (click)="keep()"
          >
            Keep existing / reset selection
          </button>
        }
        @if (allowRemove()) {
          <button
            hlmBtn
            type="button"
            variant="outline"
            class="min-h-11 min-w-11"
            [disabled]="unavailable()"
            (click)="remove()"
          >
            Remove
          </button>
        }
      </div>
    </div>
  `,
})
export class FileUploadControl {
  readonly value = model<UploadSelection>({ kind: 'keep' })
  readonly id = input.required<string>()
  readonly label = input.required<string>()
  readonly allowedTypes =
    input.required<readonly { mime: string; extensions: readonly string[] }[]>()
  readonly maxBytes = input.required<number>()
  readonly policyDescription = input<string | null>(null)
  readonly existingName = input<string | null>(null)
  readonly disabled = input(false)
  readonly allowRemove = input(false)
  readonly resetKey = input<string | number>(0)
  private readonly hydrated = signal(false)
  protected readonly unavailable = computed(() => this.disabled() || !this.hydrated())

  protected readonly accept = computed(() =>
    this.allowedTypes()
      .flatMap(type => [type.mime, ...type.extensions])
      .join(','),
  )
  protected readonly replacement = computed(() => {
    const selection = this.value()
    return selection.kind === 'replace' ? selection.file : null
  })
  protected readonly invalidMessage = computed(() => {
    const selection = this.value()
    return selection.kind === 'invalid' ? selection.message : null
  })
  protected readonly previewUrl = signal<string | null>(null)
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID))
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput')
  private readonly context = computed(() => ({
    id: this.id(),
    key: this.resetKey(),
    name: this.existingName(),
    types: this.allowedTypes(),
    maxBytes: this.maxBytes(),
  }))
  private reader: FileReader | null = null
  private epoch = 0
  private objectUrl: string | null = null
  private ownedSelection: UploadSelection | null = null

  constructor() {
    afterNextRender(() => {
      if (this.browser) this.hydrated.set(true)
    })
    let previousContext: ReturnType<typeof this.context> | undefined
    effect(() => {
      const context = this.context()
      const selection = this.value()
      untracked(() => {
        if (previousContext && context !== previousContext) {
          this.release()
          this.publish({ kind: 'keep' })
        } else if (selection !== this.ownedSelection) {
          this.release()
          this.ownedSelection = selection
        }
        previousContext = context
      })
    })
    inject(DestroyRef).onDestroy(() => this.release())
  }

  protected selectFile(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (this.unavailable() || !file) return
    this.release()
    const context = this.context()
    const extension = this.allowedTypes()
      .filter(type => type.mime === file.type)
      .flatMap(type => type.extensions)
      .map(extension => extension.toLowerCase())
      .filter(
        extension =>
          extension.startsWith('.') &&
          file.name.length > extension.length &&
          file.name.toLowerCase().endsWith(extension),
      )
      .sort((a, b) => b.length - a.length)[0]
    if (!extension) {
      this.publish({
        kind: 'invalid',
        message: 'The file MIME type and filename extension must match an allowed type.',
      })
      return
    }
    if (
      !Number.isSafeInteger(this.maxBytes()) ||
      this.maxBytes() <= 0 ||
      file.size <= 0 ||
      file.size > this.maxBytes()
    ) {
      this.publish({
        kind: 'invalid',
        message: 'Choose a nonempty file within the configured maximum byte size.',
      })
      return
    }
    if (!this.browser || typeof FileReader === 'undefined') {
      this.publish({ kind: 'invalid', message: 'File reading is unavailable in this environment.' })
      return
    }
    const reading: UploadSelection = { kind: 'reading' }
    this.publish(reading)
    const epoch = this.epoch
    const reader = new FileReader()
    this.reader = reader
    const current = () =>
      this.epoch === epoch &&
      this.reader === reader &&
      this.context() === context &&
      this.value() === reading
    reader.onload = () => {
      if (!current()) return
      if (
        typeof reader.result !== 'string' ||
        !reader.result.startsWith(`data:${file.type};base64,`)
      ) {
        this.release()
        this.publish({ kind: 'invalid', message: 'The file could not be read as a data URL.' })
        return
      }
      this.reader = null
      if (typeof URL.createObjectURL === 'function') {
        try {
          this.objectUrl = URL.createObjectURL(file)
          this.previewUrl.set(this.objectUrl)
        } catch {
          // Reading remains usable when a browser cannot create a local preview.
        }
      }
      this.publish({
        kind: 'replace',
        file: {
          name: file.name,
          mime: file.type,
          size: file.size,
          extension,
          dataUrl: reader.result,
        },
      })
    }
    reader.onerror = reader.onabort = () => {
      if (!current()) return
      this.release()
      this.publish({
        kind: 'invalid',
        message: 'The file could not be read. Select it again to retry.',
      })
    }
    try {
      reader.readAsDataURL(file)
    } catch {
      if (current()) {
        this.release()
        this.publish({
          kind: 'invalid',
          message: 'The file could not be read. Select it again to retry.',
        })
      }
    }
  }

  protected keep(): void {
    if (this.unavailable()) return
    this.release()
    this.publish({ kind: 'keep' })
  }

  protected remove(): void {
    if (this.unavailable() || !this.allowRemove()) return
    this.release()
    this.publish({ kind: 'remove' })
  }

  private publish(selection: UploadSelection): void {
    this.ownedSelection = selection
    this.value.set(selection)
  }

  private release(): void {
    this.epoch++
    const reader = this.reader
    this.reader = null
    if (reader) {
      reader.onload = reader.onerror = reader.onabort = null
      if (reader.readyState === 1) reader.abort()
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
      this.objectUrl = null
    }
    this.previewUrl.set(null)
    const input = this.fileInput()?.nativeElement
    if (input) input.value = ''
  }
}
