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
import { NgIcon, provideIcons } from '@ng-icons/core'
import { lucideFileCode, lucideUpload } from '@ng-icons/lucide'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmAttachmentImports } from '@spartan-ng/helm/attachment'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { textForLanguage, type AutocompleteLanguage, type BilingualText } from './localized-text'
import type { AttachmentState } from '@spartan-ng/helm/attachment'

export type FileUploadErrorCode =
  'fileTypeMismatch' | 'fileTooLarge' | 'readerUnavailable' | 'invalidDataUrl' | 'readFailure'

export interface FileUploadCopy {
  readonly chooseFile: BilingualText
  readonly noFile: BilingualText
  readonly keepingExisting: BilingualText
  readonly readingFile: BilingualText
  readonly replacementReady: BilingualText
  readonly invalidUnchanged: BilingualText
  readonly markedForRemoval: BilingualText
  readonly keepExisting: BilingualText
  readonly removeFile: BilingualText
  readonly downloadSelected: BilingualText
  readonly previewAlt: BilingualText
  readonly noTypes: BilingualText
  readonly allowedTypes: BilingualText
  readonly maximumSize: BilingualText
  readonly byteUnit: BilingualText
  readonly errors: Readonly<Record<FileUploadErrorCode, BilingualText>>
}

export const DEFAULT_FILE_UPLOAD_COPY: FileUploadCopy = {
  chooseFile: { en: 'Choose file', fa: 'انتخاب فایل' },
  noFile: { en: 'No file chosen', fa: 'فایلی انتخاب نشده است' },
  keepingExisting: { en: 'Keeping existing file', fa: 'فایل فعلی حفظ می‌شود' },
  readingFile: { en: 'Reading file…', fa: 'در حال خواندن فایل…' },
  replacementReady: { en: 'Replacement file ready', fa: 'فایل جایگزین آماده است' },
  invalidUnchanged: {
    en: 'File not accepted. Existing file is unchanged.',
    fa: 'فایل پذیرفته نشد. فایل فعلی تغییری نکرده است.',
  },
  markedForRemoval: {
    en: 'Existing file marked for removal',
    fa: 'فایل فعلی برای حذف علامت‌گذاری شد',
  },
  keepExisting: { en: 'Keep existing / reset selection', fa: 'حفظ فایل فعلی / بازنشانی انتخاب' },
  removeFile: { en: 'Remove file', fa: 'حذف فایل' },
  downloadSelected: { en: 'Download selected file', fa: 'بارگیری فایل انتخاب‌شده' },
  previewAlt: { en: 'Selected file preview', fa: 'پیش‌نمایش فایل انتخاب‌شده' },
  noTypes: { en: 'No file types configured', fa: 'نوع فایلی پیکربندی نشده است' },
  allowedTypes: { en: 'Allowed: {types}', fa: 'انواع مجاز: {types}' },
  maximumSize: { en: 'Maximum: {size}', fa: 'حداکثر اندازه: {size}' },
  byteUnit: { en: 'bytes', fa: 'بایت' },
  errors: {
    fileTypeMismatch: {
      en: 'The file type and filename extension must match an allowed type.',
      fa: 'نوع فایل و پسوند نام آن باید با یکی از انواع مجاز مطابقت داشته باشد.',
    },
    fileTooLarge: {
      en: 'Choose a nonempty file within the maximum allowed size.',
      fa: 'فایلی غیرخالی با اندازه کمتر از حداکثر مجاز انتخاب کنید.',
    },
    readerUnavailable: {
      en: 'File reading is unavailable in this environment.',
      fa: 'خواندن فایل در این محیط در دسترس نیست.',
    },
    invalidDataUrl: { en: 'The file could not be read.', fa: 'خواندن فایل امکان‌پذیر نبود.' },
    readFailure: {
      en: 'The file could not be read. Select it again to retry.',
      fa: 'خواندن فایل ناموفق بود. برای تلاش دوباره آن را انتخاب کنید.',
    },
  },
}

export type UploadSelection =
  | { kind: 'keep' }
  | { kind: 'reading' }
  | { kind: 'invalid'; code: FileUploadErrorCode }
  | {
      kind: 'replace'
      file: { name: string; mime: string; size: number; extension: string; dataUrl: string }
    }
  | { kind: 'remove' }

@Component({
  selector: 'lib-file-upload',
  imports: [NgIcon, HlmAttachmentImports, HlmButton, HlmFieldImports],
  providers: [provideIcons({ lucideFileCode, lucideUpload })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0', '[attr.id]': 'null' },
  template: `
    <div hlmField class="min-w-0" [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <label hlmFieldLabel [for]="id()">{{ text(label()) }}</label>
      <input
        #fileInput
        class="sr-only"
        type="file"
        [id]="id()"
        [accept]="accept()"
        [disabled]="unavailable()"
        tabindex="-1"
        aria-hidden="true"
        [attr.aria-describedby]="
          id() +
          '-policy ' +
          id() +
          '-status' +
          (value().kind === 'invalid' ? ' ' + id() + '-error' : '')
        "
        (change)="selectFile($event)"
      />
      <div
        hlmAttachment
        orientation="vertical"
        class="w-full max-w-full"
        [state]="attachmentState()"
      >
        @if (attachmentPreview(); as image) {
          <div hlmAttachmentMedia variant="image" class="h-36 min-h-36 w-full min-w-0 rounded-md">
            <img
              [src]="image"
              [alt]="text(copy().previewAlt)"
              class="h-full max-h-36 w-full max-w-full object-contain"
            />
          </div>
        } @else {
          <div hlmAttachmentMedia class="h-36 min-h-36 w-full min-w-0 rounded-md">
            <ng-icon name="lucideFileCode" aria-hidden="true" />
          </div>
        }
        <div hlmAttachmentContent class="w-full min-w-0 sm:flex-1">
          <span hlmAttachmentTitle>{{ attachmentTitle() }}</span>
          <span hlmAttachmentDescription [id]="id() + '-status'" role="status" aria-live="polite">
            {{ attachmentStatus() }}
          </span>
          <span hlmAttachmentDescription [id]="id() + '-policy'">{{ policyText() }}</span>
          @if (replacement(); as file) {
            <span hlmAttachmentDescription>
              {{ file.name }} · {{ file.mime }} · {{ formatBytes(file.size) }}
            </span>
          }
        </div>
        <div hlmAttachmentActions class="w-full sm:w-auto">
          <button
            hlmAttachmentAction
            size="sm"
            class="min-h-11"
            [attr.aria-label]="text(label()) + ': ' + text(copy().chooseFile)"
            [attr.aria-invalid]="value().kind === 'invalid' ? 'true' : null"
            [attr.aria-describedby]="
              id() +
              '-policy ' +
              id() +
              '-status' +
              (value().kind === 'invalid' ? ' ' + id() + '-error' : '')
            "
            [disabled]="unavailable()"
            (click)="openPicker()"
          >
            <ng-icon name="lucideUpload" aria-hidden="true" />
            {{ text(copy().chooseFile) }}
          </button>
        </div>
      </div>
      @if (invalidMessage(); as message) {
        <hlm-field-error [id]="id() + '-error'" [forceShow]="true">{{ message }}</hlm-field-error>
      }
      @if (replacement(); as file) {
        @if (previewUrl(); as url) {
          @if (!file.mime.startsWith('image/')) {
            <a
              hlmBtn
              variant="outline"
              class="min-h-11 min-w-11"
              [href]="url"
              [download]="file.name"
              [attr.aria-disabled]="unavailable()"
              >{{ text(copy().downloadSelected) }}</a
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
            {{ text(copy().keepExisting) }}
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
            {{ text(copy().removeFile) }}
          </button>
        }
      </div>
    </div>
  `,
})
export class FileUploadControl {
  readonly value = model<UploadSelection>({ kind: 'keep' })
  readonly language = input<AutocompleteLanguage>('en')
  readonly copy = input<FileUploadCopy>(DEFAULT_FILE_UPLOAD_COPY)
  readonly id = input.required<string>()
  readonly label = input.required<BilingualText>()
  readonly allowedTypes =
    input.required<readonly { mime: string; extensions: readonly string[] }[]>()
  readonly maxBytes = input.required<number>()
  readonly policyDescription = input<BilingualText | null>(null)
  readonly existingName = input<BilingualText | null>(null)
  readonly existingPreview = input<string | null>(null)
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
    return selection.kind === 'invalid' ? this.text(this.copy().errors[selection.code]) : null
  })
  protected readonly attachmentState = computed<AttachmentState>(() => {
    switch (this.value().kind) {
      case 'invalid':
        return 'error'
      case 'reading':
        return 'processing'
      case 'replace':
        return 'done'
      case 'remove':
        return 'error'
      default:
        return this.existingName() ? 'done' : 'idle'
    }
  })
  protected readonly attachmentTitle = computed(() => {
    const existingName = this.existingName()
    return (
      this.replacement()?.name ??
      (existingName ? this.text(existingName) : this.text(this.copy().noFile))
    )
  })
  protected readonly attachmentStatus = computed(() => {
    switch (this.value().kind) {
      case 'keep': {
        const existingName = this.existingName()
        return existingName
          ? `${this.text(this.copy().keepingExisting)}: ${this.text(existingName)}`
          : this.text(this.copy().noFile)
      }
      case 'reading':
        return this.text(this.copy().readingFile)
      case 'replace':
        return this.text(this.copy().replacementReady)
      case 'invalid':
        return this.text(this.copy().invalidUnchanged)
      case 'remove':
        return this.text(this.copy().markedForRemoval)
    }
  })
  protected readonly attachmentPreview = computed(() => {
    const replacement = this.replacement()
    return replacement?.mime.startsWith('image/') ? this.previewUrl() : this.existingPreview()
  })
  protected readonly policyText = computed(() => {
    const description = this.policyDescription()
    if (description) return this.text(description)
    const copy = this.copy()
    const types = this.accept() || this.text(copy.noTypes)
    return `${this.text(copy.allowedTypes).replace('{types}', types)} · ${this.text(copy.maximumSize).replace('{size}', this.formatBytes(this.maxBytes()))}`
  })
  protected readonly previewUrl = signal<string | null>(null)
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID))
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput')
  private readonly context = computed(() => ({
    id: this.id(),
    key: this.resetKey(),
    name: this.existingName(),
    preview: this.existingPreview(),
    types: this.allowedTypes(),
    maxBytes: this.maxBytes(),
  }))
  private reader: FileReader | null = null
  private epoch = 0
  private objectUrl: string | null = null
  private ownedSelection: UploadSelection | null = null

  protected text(value: BilingualText): string {
    return textForLanguage(value, this.language())
  }

  protected formatBytes(bytes: number): string {
    const locale = this.language() === 'fa' ? 'fa-IR' : 'en-US'
    if (bytes >= 1024)
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024)} KiB`
    return `${new Intl.NumberFormat(locale).format(bytes)} ${this.text(this.copy().byteUnit)}`
  }

  protected openPicker(): void {
    if (!this.unavailable()) this.fileInput()?.nativeElement.click()
  }

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
        code: 'fileTypeMismatch',
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
        code: 'fileTooLarge',
      })
      return
    }
    if (!this.browser || typeof FileReader === 'undefined') {
      this.publish({ kind: 'invalid', code: 'readerUnavailable' })
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
        this.publish({ kind: 'invalid', code: 'invalidDataUrl' })
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
      this.publish({ kind: 'invalid', code: 'readFailure' })
    }
    try {
      reader.readAsDataURL(file)
    } catch {
      if (current()) {
        this.release()
        this.publish({ kind: 'invalid', code: 'readFailure' })
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
