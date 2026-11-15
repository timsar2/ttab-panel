import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { DriverApi } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import { HlmCardImports } from '@spartan-ng/helm/card'
import { HlmInputImports } from '@spartan-ng/helm/input'
import { HlmLabelImports } from '@spartan-ng/helm/label'
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmSeparatorImports } from '@spartan-ng/helm/separator'
import { HlmProgressImports } from '@spartan-ng/helm/progress'

type DocumentType = 'nationalId' | 'drivingLicense' | 'smartCard'

interface DocumentInfo {
  type: DocumentType
  title: string
  description: string
  requiresLicenceLevel: boolean
  acceptedFormats: string
  maxSize: string
}

const DOCUMENTS: DocumentInfo[] = [
  {
    type: 'nationalId',
    title: 'National ID Card',
    description: 'Upload a clear photo of your national identity card.',
    requiresLicenceLevel: false,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSize: '5 MB',
  },
  {
    type: 'drivingLicense',
    title: 'Driving License',
    description: 'Upload your driving license. Licence level is required.',
    requiresLicenceLevel: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSize: '5 MB',
  },
  {
    type: 'smartCard',
    title: 'Driver Smart Card',
    description: 'Upload your driver smart card.',
    requiresLicenceLevel: false,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSize: '5 MB',
  },
]

@Component({
  selector: 'lib-document-upload-page',
  imports: [
    FormsModule,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSpinnerImports,
    HlmAlertImports,
    HlmSeparatorImports,
    HlmProgressImports,
  ],
  template: `
    <div class="page-container" [attr.dir]="fa() ? 'rtl' : 'ltr'">
      <header class="page-header">
        <h1>{{ fa() ? 'مدرک‌های رانندگی' : 'Driver Documents' }}</h1>
        <p class="page-subtitle">
          {{
            fa()
              ? 'مدرک‌های احراز هویت و مجوز رانندگی را آپلود کنید'
              : 'Upload identity and driving license documents'
          }}
        </p>
      </header>

      @if (loading()) {
        <div class="loading-state">
          <hlm-spinner />
          <p>{{ fa() ? 'در حال بارگذاری...' : 'Loading...' }}</p>
        </div>
      } @else {
        <div class="documents-grid">
          @for (doc of documents; track doc.type) {
            <hlm-card class="document-card">
              <hlm-card-header>
                <div class="document-header">
                  <h3 hlmCardTitle>{{ getTitle(doc.type) }}</h3>
                  <span class="status-badge" [class.uploaded]="isUploaded(doc.type)">
                    {{
                      isUploaded(doc.type)
                        ? fa()
                          ? 'آپلود شده'
                          : 'Uploaded'
                        : fa()
                          ? 'منتظر آپلود'
                          : 'Pending'
                    }}
                  </span>
                </div>
                <p hlmCardDescription>{{ getDescription(doc.type) }}</p>
              </hlm-card-header>
              <div hlmCardContent>
                <div class="document-info">
                  <p class="info-item">
                    <span class="info-label">{{
                      fa() ? 'فرمت‌های مجاز' : 'Accepted formats'
                    }}</span>
                    <span class="info-value">{{ doc.acceptedFormats }}</span>
                  </p>
                  <p class="info-item">
                    <span class="info-label">{{ fa() ? 'حداکثر حجم' : 'Max size' }}</span>
                    <span class="info-value">{{ doc.maxSize }}</span>
                  </p>
                </div>

                @if (doc.requiresLicenceLevel) {
                  <div class="form-field">
                    <label hlmLabel>{{ fa() ? 'سطح گواهینامه' : 'Licence Level' }}</label>
                    <select
                      hlmInput
                      [ngModel]="getLicenceLevel(doc.type)"
                      (ngModelChange)="setLicenceLevel(doc.type, $event)"
                      name="licenceLevel_{{ doc.type }}"
                      [disabled]="isUploading(doc.type) || isUploaded(doc.type)"
                    >
                      <option value="">{{ fa() ? 'انتخاب سطح' : 'Select level' }}</option>
                      <option value="1">{{ fa() ? 'سطح ۱' : 'Level 1' }}</option>
                      <option value="2">{{ fa() ? 'سطح ۲' : 'Level 2' }}</option>
                      <option value="3">{{ fa() ? 'سطح ۳' : 'Level 3' }}</option>
                    </select>
                  </div>
                }

                @if (isUploaded(doc.type)) {
                  <div class="uploaded-preview">
                    <p class="preview-label">{{ fa() ? 'فایل آپلود شده' : 'Uploaded file' }}</p>
                    <div class="preview-actions">
                      <button hlmBtn variant="outline" size="sm" (click)="viewDocument(doc.type)">
                        {{ fa() ? 'مشاهده' : 'View' }}
                      </button>
                      <button hlmBtn variant="ghost" size="sm" (click)="removeDocument(doc.type)">
                        {{ fa() ? 'حذف و جایگزینی' : 'Remove & Replace' }}
                      </button>
                    </div>
                  </div>
                } @else {
                  <div
                    class="upload-area"
                    (click)="fileInput.click()"
                    (dragover)="onDragOver($event)"
                    (dragleave)="onDragLeave($event)"
                    (drop)="onDrop($event, doc.type)"
                    [class.drag-over]="isDragOver(doc.type)"
                  >
                    <input
                      #fileInput
                      type="file"
                      [accept]="getAcceptedMimeTypes(doc.type)"
                      (change)="onFileSelected($event, doc.type)"
                      class="file-input"
                    />
                    <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p class="upload-text">
                      {{
                        fa() ? 'فایل را اینجا بکشید یا کلیک کنید' : 'Drag & drop or click to upload'
                      }}
                    </p>
                    <p class="upload-hint">
                      {{ fa() ? 'حداکثر' : 'Max' }} {{ doc.maxSize }} • {{ doc.acceptedFormats }}
                    </p>
                  </div>
                }

                @if (isUploading(doc.type)) {
                  <div class="upload-progress">
                    <hlm-progress [value]="getUploadProgress(doc.type)" class="progress-bar" />
                    <p class="progress-text">
                      {{ fa() ? 'در حال آپلود...' : 'Uploading...' }}
                      {{ getUploadProgress(doc.type) }}%
                    </p>
                  </div>
                }

                @if (getDocError(doc.type)) {
                  <hlm-alert variant="destructive" class="doc-error">
                    <p hlmAlertDescription>{{ getDocError(doc.type) }}</p>
                  </hlm-alert>
                }
              </div>
            </hlm-card>
          }
        </div>

        @if (globalError()) {
          <hlm-alert variant="destructive" class="global-error">
            <h4 hlmAlertTitle>{{ fa() ? 'خطا' : 'Error' }}</h4>
            <p hlmAlertDescription>{{ globalError() }}</p>
          </hlm-alert>
        }
        @if (globalSuccess()) {
          <hlm-alert variant="default" class="global-success">
            <h4 hlmAlertTitle>{{ fa() ? 'موفقیت' : 'Success' }}</h4>
            <p hlmAlertDescription>
              {{ fa() ? 'مدرک‌ها با موفقیت آپلود شدند.' : 'Documents uploaded successfully.' }}
            </p>
          </hlm-alert>
        }
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .page-container {
        padding: 1.5rem;
        max-width: 900px;
        margin: 0 auto;
      }
      .page-header {
        margin-bottom: 1.5rem;
      }
      .page-header h1 {
        font-size: 1.875rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
      }
      .page-subtitle {
        color: var(--muted-foreground);
        margin: 0;
      }
      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 3rem;
      }
      .documents-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      @media (min-width: 768px) {
        .documents-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (min-width: 1024px) {
        .documents-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }
      .document-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .status-badge {
        font-size: 0.75rem;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        background: var(--muted);
        color: var(--muted-foreground);
      }
      .status-badge.uploaded {
        background: color-mix(in srgb, var(--primary) 15%, transparent);
        color: var(--primary);
      }
      .document-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding: 0.75rem;
        background: var(--muted);
        border-radius: 0.5rem;
      }
      .info-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
      }
      .info-label {
        color: var(--muted-foreground);
      }
      .info-value {
        font-weight: 500;
      }
      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        margin-bottom: 1rem;
      }
      .form-field label[hlmLabel] {
        font-size: 0.875rem;
        font-weight: 500;
      }
      .form-field select {
        width: 100%;
      }
      .uploaded-preview {
        padding: 1rem;
        background: color-mix(in srgb, var(--primary) 5%, transparent);
        border-radius: 0.5rem;
        border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
      }
      .preview-label {
        margin: 0 0 0.75rem;
        font-size: 0.875rem;
        font-weight: 500;
      }
      .preview-actions {
        display: flex;
        gap: 0.5rem;
      }
      .upload-area {
        border: 2px dashed var(--border);
        border-radius: 0.75rem;
        padding: 2rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .upload-area:hover,
      .upload-area.drag-over {
        border-color: var(--primary);
        background: color-mix(in srgb, var(--primary) 5%, transparent);
      }
      .upload-icon {
        width: 48px;
        height: 48px;
        margin: 0 auto 1rem;
        color: var(--muted-foreground);
      }
      .upload-area:hover .upload-icon,
      .upload-area.drag-over .upload-icon {
        color: var(--primary);
      }
      .upload-text {
        margin: 0 0 0.5rem;
        font-weight: 500;
      }
      .upload-hint {
        margin: 0;
        font-size: 0.75rem;
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
      .upload-progress {
        margin-top: 1rem;
      }
      .progress-bar {
        height: 6px;
      }
      .progress-text {
        margin: 0.5rem 0 0;
        font-size: 0.875rem;
        color: var(--muted-foreground);
        text-align: center;
      }
      .doc-error {
        margin-top: 1rem;
      }
      .global-error,
      .global-success {
        margin-top: 1.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentUploadPage {
  private readonly api = inject(DriverApi)
  private readonly config = inject(DRIVER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')

  protected readonly loading = signal(true)
  protected readonly documents = DOCUMENTS
  protected readonly uploadedDocs = signal<Record<DocumentType, boolean>>({
    nationalId: false,
    drivingLicense: false,
    smartCard: false,
  })
  protected readonly uploading = signal<Record<DocumentType, boolean>>({
    nationalId: false,
    drivingLicense: false,
    smartCard: false,
  })
  protected readonly uploadProgress = signal<Record<DocumentType, number>>({
    nationalId: 0,
    drivingLicense: 0,
    smartCard: 0,
  })
  protected readonly docErrors = signal<Record<DocumentType, string | null>>({
    nationalId: null,
    drivingLicense: null,
    smartCard: null,
  })
  protected readonly dragOver = signal<Record<DocumentType, boolean>>({
    nationalId: false,
    drivingLicense: false,
    smartCard: false,
  })
  protected readonly licenceLevels = signal<Record<DocumentType, string>>({
    nationalId: '',
    drivingLicense: '',
    smartCard: '',
  })
  protected readonly globalError = signal<string | null>(null)
  protected readonly globalSuccess = signal(false)

  constructor() {
    this.checkExistingDocuments()
  }

  protected async checkExistingDocuments(): Promise<void> {
    this.loading.set(true)
    try {
      // In a real implementation, check document status from API
      // For now, just set loading to false
    } catch {
      // Ignore errors
    } finally {
      this.loading.set(false)
    }
  }

  protected getTitle(type: DocumentType): string {
    const doc = this.documents.find(d => d.type === type)
    const titles: Record<DocumentType, { en: string; fa: string }> = {
      nationalId: { en: 'National ID Card', fa: 'کارت ملی' },
      drivingLicense: { en: 'Driving License', fa: 'گواهینامه رانندگی' },
      smartCard: { en: 'Driver Smart Card', fa: 'کارت هوشمند راننده' },
    }
    return this.fa() ? titles[type].fa : titles[type].en
  }

  protected getDescription(type: DocumentType): string {
    const doc = this.documents.find(d => d.type === type)
    const descriptions: Record<DocumentType, { en: string; fa: string }> = {
      nationalId: {
        en: 'Upload a clear photo of your national identity card.',
        fa: 'تصویری شفاف از کارت ملی خود آپلود کنید.',
      },
      drivingLicense: {
        en: 'Upload your driving license. Licence level is required.',
        fa: 'گواهینامه رانندگی خود را آپلود کنید. تعیین سطح گواهینامه الزامی است.',
      },
      smartCard: {
        en: 'Upload your driver smart card.',
        fa: 'کارت هوشمند راننده خود را آپلود کنید.',
      },
    }
    return this.fa() ? descriptions[type].fa : descriptions[type].en
  }

  protected getAcceptedMimeTypes(type: DocumentType): string {
    return '.jpg,.jpeg,.png,.pdf'
  }

  protected getLicenceLevel(type: DocumentType): string {
    return this.licenceLevels()[type]
  }

  protected setLicenceLevel(type: DocumentType, value: string): void {
    this.licenceLevels.update(state => ({ ...state, [type]: value }))
  }

  protected getUploadProgress(type: DocumentType): number {
    return this.uploadProgress()[type]
  }

  protected getDocError(type: DocumentType): string | null {
    return this.docErrors()[type]
  }

  protected isUploading(type: DocumentType): boolean {
    return this.uploading()[type]
  }

  protected isUploaded(type: DocumentType): boolean {
    return this.uploadedDocs()[type]
  }

  protected isDragOver(type: DocumentType): boolean {
    return this.dragOver()[type]
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault()
    event.stopPropagation()
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault()
    event.stopPropagation()
  }

  protected onDrop(event: DragEvent, type: DocumentType): void {
    event.preventDefault()
    event.stopPropagation()
    this.dragOver.update(state => ({ ...state, [type]: false }))

    const file = event.dataTransfer?.files[0]
    if (file) {
      this.uploadFile(type, file)
    }
  }

  protected onFileSelected(event: Event, type: DocumentType): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
      this.uploadFile(type, file)
    }
    // Reset input value to allow selecting the same file again
    input.value = ''
  }

  protected async uploadFile(type: DocumentType, file: File): Promise<void> {
    if (!file.type.match(/^image\/(jpeg|png)$/) && file.type !== 'application/pdf') {
      this.docErrors.update(errors => ({
        ...errors,
        [type]: this.fa()
          ? 'فرمت فایل مجاز نیست. فقط JPG، PNG و PDFAccepted است.'
          : 'Invalid file format. Only JPG, PNG, and PDF accepted.',
      }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      this.docErrors.update(errors => ({
        ...errors,
        [type]: this.fa()
          ? 'حجم فایل نباید بیشتر از ۵ مگابایت باشد.'
          : 'File size must not exceed 5MB.',
      }))
      return
    }

    this.docErrors.update(errors => ({ ...errors, [type]: null }))
    this.uploading.update(state => ({ ...state, [type]: true }))
    this.uploadProgress.update(state => ({ ...state, [type]: 0 }))

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        this.uploadProgress.update(state => {
          const current = state[type]
          if (current >= 90) return state
          return { ...state, [type]: current + 10 }
        })
      }, 200)

      const licenceLevel = type === 'drivingLicense' ? this.licenceLevels()[type] : undefined
      await this.api.uploadDocument({
        documentType: type,
        file,
        licenceLevel,
      })

      clearInterval(progressInterval)
      this.uploadProgress.update(state => ({ ...state, [type]: 100 }))
      this.uploadedDocs.update(state => ({ ...state, [type]: true }))
      this.globalSuccess.set(true)
      this.globalError.set(null)
    } catch {
      this.docErrors.update(errors => ({
        ...errors,
        [type]: this.fa()
          ? 'آپلود ناموفق بود. لطفاً دوباره تلاش کنید.'
          : 'Upload failed. Please try again.',
      }))
      this.globalError.set(
        this.fa()
          ? 'آپلود مدرک ناموفق بود. لطفاً دوباره تلاش کنید.'
          : 'Document upload failed. Please try again.',
      )
      this.globalSuccess.set(false)
    } finally {
      this.uploading.update(state => ({ ...state, [type]: false }))
      setTimeout(() => {
        this.uploadProgress.update(state => ({ ...state, [type]: 0 }))
        this.globalSuccess.set(false)
      }, 3000)
    }
  }

  protected viewDocument(type: DocumentType): void {
    // In a real implementation, open document viewer
    alert(this.fa() ? 'مشاهده مدرک در حال توسعه است.' : 'Document viewer coming soon.')
  }

  protected removeDocument(type: DocumentType): void {
    this.uploadedDocs.update(state => ({ ...state, [type]: false }))
    this.licenceLevels.update(state => ({ ...state, [type]: '' }))
    this.docErrors.update(state => ({ ...state, [type]: null }))
  }
}
