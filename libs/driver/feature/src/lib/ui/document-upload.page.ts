import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
  DriverApi,
  DriverDocumentImageField,
  DriverDocumentImages,
} from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import { HlmCardImports } from '@spartan-ng/helm/card'
import { HlmInputImports } from '@spartan-ng/helm/input'
import { HlmLabelImports } from '@spartan-ng/helm/label'
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { FileUploadComponent } from './file-upload.component'

type DocumentType = 'nationalCardFront' | 'nationalCardBehind' | 'drivingLicense' | 'smartCard'

interface DocumentInfo {
  type: DocumentType
  field: DriverDocumentImageField
  title: string
  description: string
  requiresLicenceLevel: boolean
  acceptedFormats: string
  maxSize: string
}

const DOCUMENTS: DocumentInfo[] = [
  {
    type: 'nationalCardFront',
    field: 'nationalCardFrontImage',
    title: 'National ID Card · Front',
    description: 'Upload the front side of your national identity card.',
    requiresLicenceLevel: false,
    acceptedFormats: 'JPG, PNG, WebP',
    maxSize: '5 MB',
  },
  {
    type: 'nationalCardBehind',
    field: 'nationalCardBehindImage',
    title: 'National ID Card · Back',
    description: 'Upload the back side of your national identity card.',
    requiresLicenceLevel: false,
    acceptedFormats: 'JPG, PNG, WebP',
    maxSize: '5 MB',
  },
  {
    type: 'smartCard',
    field: 'driverSmartCardImage',
    title: 'Driver Smart Card',
    description: 'Upload your driver smart card.',
    requiresLicenceLevel: false,
    acceptedFormats: 'JPG, PNG, WebP',
    maxSize: '5 MB',
  },
  {
    type: 'drivingLicense',
    field: 'drivingLicenceImage',
    title: 'Driving License',
    description: 'Upload your driving license. Licence level is required.',
    requiresLicenceLevel: true,
    acceptedFormats: 'JPG, PNG, WebP',
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
    FileUploadComponent,
  ],
  template: `
    <div class="page-container" [attr.dir]="fa() ? 'rtl' : 'ltr'">
      <header class="page-header">
        <div class="header-copy">
          <span class="eyebrow">{{ fa() ? 'تکمیل پروفایل' : 'PROFILE CHECKLIST' }}</span>
          <h1>{{ fa() ? 'مدرک‌های رانندگی' : 'Driver Documents' }}</h1>
          <p class="page-subtitle">
            {{
              fa()
                ? 'مدرک‌های احراز هویت و مجوز رانندگی را آپلود کنید'
                : 'Upload identity and driving license documents'
            }}
          </p>
        </div>
        <div class="requirement-note">
          <span class="requirement-dot"></span>
          {{
            fa()
              ? 'تصاویر مدارک را انتخاب و سپس ذخیره کنید'
              : 'Select the document images, then save them together'
          }}
        </div>
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
                  <span class="status-badge" [class.uploaded]="getCurrentImage(doc.field)">
                    {{
                      getPendingFile(doc.type)
                        ? fa()
                          ? 'تغییر ذخیره‌نشده'
                          : 'Unsaved change'
                        : getCurrentImage(doc.field)
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
                @if (doc.requiresLicenceLevel) {
                  <div class="form-field">
                    <label hlmLabel for="driver-licence-level">{{
                      fa() ? 'سطح گواهینامه' : 'Licence Level'
                    }}</label>
                    <select
                      id="driver-licence-level"
                      hlmInput
                      [ngModel]="getLicenceLevel(doc.type)"
                      (ngModelChange)="setLicenceLevel(doc.type, $event)"
                      name="licenceLevel_{{ doc.type }}"
                      [disabled]="saving()"
                    >
                      <option value="">{{ fa() ? 'انتخاب سطح' : 'Select level' }}</option>
                      <option value="1">{{ fa() ? 'سطح ۱' : 'Level 1' }}</option>
                      <option value="2">{{ fa() ? 'سطح ۲' : 'Level 2' }}</option>
                    </select>
                  </div>
                }

                @if (getCurrentImage(doc.field)) {
                  <div class="image-preview current-preview">
                    <p class="preview-label">{{ fa() ? 'تصویر ذخیره‌شده' : 'Currently stored' }}</p>
                    <a [href]="getCurrentImage(doc.field)" target="_blank" rel="noopener">
                      <img [src]="getCurrentImage(doc.field)" [alt]="getTitle(doc.type)" />
                    </a>
                  </div>
                }
                @if (getPendingPreview(doc.type)) {
                  <div class="image-preview staged-preview">
                    <p class="preview-label">
                      {{ fa() ? 'تصویر جدید، ذخیره‌نشده' : 'New image · not saved' }}
                    </p>
                    <img [src]="getPendingPreview(doc.type)" [alt]="getTitle(doc.type)" />
                    <button
                      hlmBtn
                      variant="ghost"
                      size="sm"
                      type="button"
                      (click)="clearPending(doc.type)"
                    >
                      {{ fa() ? 'لغو تغییر' : 'Discard change' }}
                    </button>
                  </div>
                }
                <lib-file-upload
                  [fa]="fa"
                  [acceptedMimeTypes]="getAcceptedMimeTypes()"
                  [maxSize]="doc.maxSize"
                  [acceptedFormats]="doc.acceptedFormats"
                  [uploadLabel]="
                    getPendingFile(doc.type)
                      ? fa()
                        ? 'انتخاب تصویر دیگری'
                        : 'Choose a different image'
                      : ''
                  "
                  (fileSelected)="stageFile(doc.type, $event)"
                  (fileDropped)="stageFile(doc.type, $event)"
                />
              </div>
            </hlm-card>
          }
        </div>

        <div class="save-bar">
          <span
            >{{ pendingCount() }}
            {{ fa() ? 'مدرک آماده ذخیره است' : 'document(s) ready to save' }}</span
          >
          <button
            hlmBtn
            type="button"
            [disabled]="!hasPendingFiles() || saving()"
            (click)="saveAll()"
          >
            @if (saving()) {
              <hlm-spinner />
            }
            {{
              saving() ? (fa() ? 'در حال ذخیره...' : 'Saving...') : fa() ? 'ذخیره همه' : 'Save All'
            }}
          </button>
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
        padding: clamp(1rem, 3vw, 2.5rem);
        max-width: 1120px;
        margin: 0 auto;
        color: var(--foreground);
      }
      .page-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      .header-copy {
        min-width: 0;
      }
      .eyebrow {
        display: block;
        margin-bottom: 0.5rem;
        color: var(--primary);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.12em;
      }
      .page-header h1 {
        color: var(--foreground);
        font-size: clamp(1.6rem, 3vw, 2rem);
        font-weight: 700;
        letter-spacing: -0.025em;
        margin: 0 0 0.4rem;
      }
      .page-subtitle {
        color: var(--muted-foreground);
        margin: 0;
        line-height: 1.65;
      }
      .requirement-note {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        flex: 0 0 auto;
        padding: 0.65rem 0.9rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--card);
        color: var(--muted-foreground);
        font-size: 0.8rem;
      }
      .requirement-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background: var(--primary);
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
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
        align-items: stretch;
        gap: 1.25rem;
      }
      .document-card {
        display: flex;
        flex-direction: column;
        min-width: 0;
        height: 100%;
        overflow: hidden;
        border-color: var(--border);
        background: var(--card);
        box-shadow: 0 8px 28px color-mix(in srgb, var(--foreground) 5%, transparent);
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease,
          transform 160ms ease;
      }
      .document-card:hover {
        border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
        box-shadow: 0 14px 34px color-mix(in srgb, var(--foreground) 9%, transparent);
        transform: translateY(-2px);
      }
      .document-card [hlmCardHeader] {
        min-height: 8rem;
        padding-bottom: 0.75rem;
      }
      .document-card [hlmCardContent] {
        display: flex;
        flex: 1;
        flex-direction: column;
      }
      .document-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }
      .document-header h3,
      .document-card [hlmCardDescription] {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .document-header h3 {
        color: var(--foreground);
        font-size: 1.05rem;
        font-weight: 650;
        line-height: 1.5;
      }
      .document-card [hlmCardDescription] {
        color: var(--muted-foreground);
        line-height: 1.65;
      }
      .status-badge {
        flex: 0 0 auto;
        font-size: 0.72rem;
        font-weight: 600;
        padding: 0.3rem 0.65rem;
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
        justify-content: center;
        gap: 0.5rem;
        min-height: 7rem;
        box-sizing: border-box;
        margin-bottom: 1rem;
        padding: 0.75rem;
        background: var(--muted);
        border-radius: 0.5rem;
      }
      .info-item {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.25rem 0.75rem;
        font-size: 0.875rem;
      }
      .info-label {
        color: var(--muted-foreground);
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .info-value {
        font-weight: 500;
        min-width: 0;
        overflow-wrap: anywhere;
        text-align: end;
      }
      .form-field {
        display: flex;
        flex-direction: column;
        min-height: 4.25rem;
        gap: 0.375rem;
        margin-bottom: 0.75rem;
      }
      .form-field-empty {
        visibility: hidden;
      }
      .form-field label[hlmLabel] {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--foreground);
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
      .image-preview {
        margin-bottom: 0.8rem;
        padding: 0.75rem;
        border: 1px solid var(--border);
        border-radius: 0.65rem;
      }
      .current-preview {
        background: var(--muted);
      }
      .staged-preview {
        border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
        background: color-mix(in srgb, var(--primary) 7%, var(--card));
      }
      .image-preview a,
      .image-preview img {
        display: block;
      }
      .image-preview img {
        width: 100%;
        max-height: 12rem;
        object-fit: contain;
        border-radius: 0.4rem;
        background: var(--background);
      }
      .staged-preview button {
        margin-top: 0.4rem;
      }
      .save-bar {
        position: sticky;
        bottom: 1rem;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 1.5rem;
        padding: 0.85rem 1rem;
        border: 1px solid var(--border);
        border-radius: 0.85rem;
        background: color-mix(in srgb, var(--card) 94%, transparent);
        box-shadow: 0 8px 24px color-mix(in srgb, var(--foreground) 10%, transparent);
        color: var(--muted-foreground);
      }
      .preview-actions {
        display: flex;
        gap: 0.5rem;
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
      @media (max-width: 640px) {
        .page-header {
          align-items: flex-start;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
        .requirement-note {
          border-radius: 0.75rem;
          white-space: normal;
        }
        .documents-grid {
          grid-template-columns: minmax(0, 1fr);
          gap: 1rem;
        }
        .document-card [hlmCardHeader] {
          min-height: 0;
        }
        .form-field-empty {
          display: none;
        }
        .save-bar {
          bottom: 0.5rem;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .document-card {
          transition: none;
        }
        .document-card:hover {
          transform: none;
        }
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
  protected readonly saving = signal(false)
  protected readonly documents = DOCUMENTS
  protected readonly currentImages = signal<DriverDocumentImages>({
    nationalCardFrontImage: null,
    nationalCardBehindImage: null,
    drivingLicenceImage: null,
    driverSmartCardImage: null,
    driverLicenceLevelId: 0,
  })
  protected readonly pendingFiles = signal<Record<DocumentType, File | null>>({
    nationalCardFront: null,
    nationalCardBehind: null,
    drivingLicense: null,
    smartCard: null,
  })
  protected readonly pendingPreviews = signal<Record<DocumentType, string | null>>({
    nationalCardFront: null,
    nationalCardBehind: null,
    drivingLicense: null,
    smartCard: null,
  })
  protected readonly licenceLevels = signal<Record<DocumentType, string>>({
    nationalCardFront: '',
    nationalCardBehind: '',
    drivingLicense: '',
    smartCard: '',
  })
  protected readonly globalError = signal<string | null>(null)
  protected readonly globalSuccess = signal(false)
  protected readonly pendingCount = computed(
    () => Object.values(this.pendingFiles()).filter(Boolean).length,
  )
  protected readonly hasPendingFiles = computed(() => this.pendingCount() > 0)

  constructor() {
    this.checkExistingDocuments()
  }

  protected async checkExistingDocuments(): Promise<void> {
    this.loading.set(true)
    try {
      const images = await this.api.driverDocumentImages()
      this.currentImages.set(images)
      if (images.driverLicenceLevelId > 0)
        this.licenceLevels.update(levels => ({
          ...levels,
          drivingLicense: String(images.driverLicenceLevelId),
        }))
    } catch {
      this.globalError.set(
        this.fa() ? 'بارگذاری مدارک ناموفق بود.' : 'Failed to load driver documents.',
      )
    } finally {
      this.loading.set(false)
    }
  }

  protected getTitle(type: DocumentType): string {
    const titles: Record<DocumentType, { en: string; fa: string }> = {
      nationalCardFront: { en: 'National ID · Front', fa: 'روی کارت ملی' },
      nationalCardBehind: { en: 'National ID · Back', fa: 'پشت کارت ملی' },
      smartCard: { en: 'Driver Smart Card', fa: 'کارت هوشمند راننده' },
      drivingLicense: { en: 'Driving License', fa: 'گواهینامه رانندگی' },
    }
    return this.fa() ? titles[type].fa : titles[type].en
  }

  protected getDescription(type: DocumentType): string {
    const descriptions: Record<DocumentType, { en: string; fa: string }> = {
      nationalCardFront: {
        en: 'Upload the front side of your national ID.',
        fa: 'تصویر روی کارت ملی را بارگذاری کنید.',
      },
      nationalCardBehind: {
        en: 'Upload the back side of your national ID.',
        fa: 'تصویر پشت کارت ملی را بارگذاری کنید.',
      },
      smartCard: {
        en: 'Upload your driver smart card.',
        fa: 'کارت هوشمند راننده خود را آپلود کنید.',
      },
      drivingLicense: {
        en: 'Upload your driving license. Licence level is required.',
        fa: 'گواهینامه رانندگی خود را آپلود کنید. تعیین سطح گواهینامه الزامی است.',
      },
    }
    return this.fa() ? descriptions[type].fa : descriptions[type].en
  }

  protected getAcceptedMimeTypes(): string {
    return '.jpg,.jpeg,.png,.webp'
  }

  protected getLicenceLevel(type: DocumentType): string {
    return this.licenceLevels()[type]
  }

  protected setLicenceLevel(type: DocumentType, value: string): void {
    this.licenceLevels.update(state => ({ ...state, [type]: value }))
  }

  protected getCurrentImage(field: DriverDocumentImageField): string | null {
    return this.currentImages()[field]
  }

  protected getPendingFile(type: DocumentType): File | null {
    return this.pendingFiles()[type]
  }

  protected getPendingPreview(type: DocumentType): string | null {
    return this.pendingPreviews()[type]
  }

  protected stageFile(type: DocumentType, file: File): void {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      this.globalError.set(
        this.fa()
          ? 'فقط تصاویر JPG، PNG و WebP مجاز هستند.'
          : 'Only JPG, PNG, and WebP images are accepted.',
      )
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      this.globalError.set(
        this.fa()
          ? 'حجم هر فایل نباید بیشتر از ۵ مگابایت باشد.'
          : 'Each file must not exceed 5 MB.',
      )
      return
    }
    this.pendingFiles.update(files => ({ ...files, [type]: file }))
    const reader = new FileReader()
    reader.onload = () =>
      this.pendingPreviews.update(previews => ({ ...previews, [type]: String(reader.result) }))
    reader.onerror = () =>
      this.globalError.set(
        this.fa() ? 'نمایش تصویر انتخاب‌شده ناموفق بود.' : 'Could not preview the selected image.',
      )
    reader.readAsDataURL(file)
    this.globalError.set(null)
    this.globalSuccess.set(false)
  }

  protected clearPending(type: DocumentType): void {
    this.pendingFiles.update(files => ({ ...files, [type]: null }))
    this.pendingPreviews.update(previews => ({ ...previews, [type]: null }))
  }

  protected async saveAll(): Promise<void> {
    const pending = this.pendingFiles()
    const images: Partial<Record<DriverDocumentImageField, File>> = {}
    for (const doc of this.documents) {
      const file = pending[doc.type]
      if (file) images[doc.field] = file
    }
    if (!Object.keys(images).length) return
    if (!this.licenceLevels().drivingLicense && !this.currentImages().driverLicenceLevelId) {
      this.globalError.set(
        this.fa() ? 'سطح گواهینامه را انتخاب کنید.' : 'Choose a licence level before saving.',
      )
      return
    }
    this.saving.set(true)
    this.globalError.set(null)
    this.globalSuccess.set(false)
    try {
      const saved = await this.api.saveDriverDocumentImages(
        images,
        this.licenceLevels().drivingLicense,
        this.currentImages(),
      )
      this.currentImages.update(current => ({ ...current, ...saved }))
      this.pendingFiles.set({
        nationalCardFront: null,
        nationalCardBehind: null,
        drivingLicense: null,
        smartCard: null,
      })
      this.pendingPreviews.set({
        nationalCardFront: null,
        nationalCardBehind: null,
        drivingLicense: null,
        smartCard: null,
      })
      this.globalSuccess.set(true)
    } catch (error) {
      this.globalError.set(
        error instanceof Error
          ? error.message
          : this.fa()
            ? 'ذخیره مدارک ناموفق بود.'
            : 'Could not save documents.',
      )
    } finally {
      this.saving.set(false)
    }
  }
}
