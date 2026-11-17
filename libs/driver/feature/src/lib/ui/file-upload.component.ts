import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'

@Component({
  selector: 'lib-file-upload',
  standalone: true,
  template: `
    <div
      class="upload-area"
      [class.drag-over]="dragOver"
      [attr.dir]="fa() ? 'rtl' : 'ltr'"
      role="button"
      tabindex="0"
      (click)="fileInput.click()"
      (keydown.enter)="fileInput.click()"
      (keydown.space)="$event.preventDefault(); fileInput.click()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <input
        #fileInput
        class="file-input"
        type="file"
        [accept]="acceptedMimeTypes"
        (change)="onFileSelected($event)"
      />
      <svg
        class="upload-icon"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p class="upload-text">
        {{
          uploadLabel ||
            (fa() ? 'فایل را اینجا بکشید یا کلیک کنید' : 'Drag & drop or click to upload')
        }}
      </p>
      <p class="upload-hint">
        {{ hint || (fa() ? 'حداکثر' : 'Max') + ' ' + maxSize + ' • ' + acceptedFormats }}
      </p>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .upload-area {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        width: 100%;
        height: 14rem;
        box-sizing: border-box;
        padding: 1.25rem;
        overflow-wrap: anywhere;
        border: 2px dashed var(--border);
        border-radius: 0.75rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .upload-area:hover,
      .upload-area.drag-over {
        border-color: var(--primary);
        background: color-mix(in srgb, var(--primary) 5%, transparent);
      }
      .upload-area:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
      }
      .upload-icon {
        flex: 0 0 48px;
        width: 48px;
        height: 48px;
        margin: 0 auto 0.5rem;
        color: var(--muted-foreground);
      }
      .upload-area:hover .upload-icon,
      .upload-area.drag-over .upload-icon {
        color: var(--primary);
      }
      .upload-text {
        margin: 0 0 0.5rem;
        font-weight: 500;
        line-height: 1.5;
      }
      .upload-hint {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.4;
        color: var(--muted-foreground);
      }
      .file-input {
        position: absolute;
        width: 0.1px;
        height: 0.1px;
        opacity: 0;
        overflow: hidden;
        z-index: -1;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent {
  @Input({ required: true }) fa!: () => boolean
  @Input() acceptedMimeTypes = ''
  @Input() maxSize = ''
  @Input() acceptedFormats = ''
  @Input() uploadLabel = ''
  @Input() hint = ''

  @Output() readonly fileSelected = new EventEmitter<File>()
  @Output() readonly fileDropped = new EventEmitter<File>()

  protected dragOver = false

  protected onDragOver(event: DragEvent): void {
    event.preventDefault()
    this.dragOver = true
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault()
    this.dragOver = false
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault()
    this.dragOver = false
    const file = event.dataTransfer?.files[0]
    if (file) this.fileDropped.emit(file)
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) this.fileSelected.emit(file)
    input.value = ''
  }
}
