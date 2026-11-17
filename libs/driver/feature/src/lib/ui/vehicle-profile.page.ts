import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { DriverApi, DriverRecord } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import { HlmCardImports } from '@spartan-ng/helm/card'
import { HlmInputImports } from '@spartan-ng/helm/input'
import { HlmLabelImports } from '@spartan-ng/helm/label'
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmAvatarImports } from '@spartan-ng/helm/avatar'
import { HlmSeparatorImports } from '@spartan-ng/helm/separator'
import { FileUploadComponent } from './file-upload.component'
import { uploadStatusLabel } from './upload-status'

type VehicleImageType = 'vehicle' | 'card' | 'insurance'

@Component({
  selector: 'lib-vehicle-profile-page',
  imports: [
    FormsModule,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSpinnerImports,
    HlmAlertImports,
    HlmAvatarImports,
    HlmSeparatorImports,
    FileUploadComponent,
  ],
  template: `
    <div class="page-container" [attr.dir]="fa() ? 'rtl' : 'ltr'">
      <header class="page-header">
        <h1>{{ fa() ? 'پروفایل وسیله نقلیه' : 'Vehicle Profile' }}</h1>
        <p class="page-subtitle">
          {{ fa() ? 'مشخصات وسیله نقلیه خود را مدیریت کنید' : 'Manage your vehicle information' }}
        </p>
      </header>

      @if (loading()) {
        <div class="loading-state">
          <hlm-spinner />
          <p>{{ fa() ? 'در حال بارگذاری...' : 'Loading...' }}</p>
        </div>
      } @else if (driver()) {
        <div class="vehicle-sections">
          <!-- Vehicle Info Card -->
          <hlm-card class="vehicle-card">
            <hlm-card-header>
              <h3 hlmCardTitle>{{ fa() ? 'مشخصات وسیله' : 'Vehicle Details' }}</h3>
            </hlm-card-header>
            <div hlmCardContent>
              <form (submit)="saveVehicle($event)" class="vehicle-form">
                <div class="form-grid">
                  <div class="form-field">
                    <label hlmLabel>{{ fa() ? 'نوع وسیله' : 'Vehicle Type' }}</label>
                    <input
                      hlmInput
                      [(ngModel)]="vehicleForm.type"
                      name="type"
                      [disabled]="saving()"
                      required
                    />
                  </div>
                  <div class="form-field">
                    <label hlmLabel>{{ fa() ? 'پلاک' : 'Plate' }}</label>
                    <input
                      hlmInput
                      [(ngModel)]="vehicleForm.plate"
                      name="plate"
                      [disabled]="saving()"
                      required
                    />
                  </div>
                  <div class="form-field">
                    <label hlmLabel>{{ fa() ? 'رنگ' : 'Color' }}</label>
                    <input
                      hlmInput
                      [(ngModel)]="vehicleForm.color"
                      name="color"
                      [disabled]="saving()"
                    />
                  </div>
                  <div class="form-field">
                    <label hlmLabel>{{ fa() ? 'سال ساخت' : 'Year' }}</label>
                    <input
                      hlmInput
                      [(ngModel)]="vehicleForm.year"
                      name="year"
                      type="number"
                      min="1900"
                      [max]="currentYear"
                      [disabled]="saving()"
                    />
                  </div>
                  <div class="form-field">
                    <label hlmLabel>{{ fa() ? 'ظرفیت' : 'Capacity' }}</label>
                    <input
                      hlmInput
                      [(ngModel)]="vehicleForm.capacity"
                      name="capacity"
                      type="number"
                      min="1"
                      [disabled]="saving()"
                    />
                  </div>
                </div>

                @if (error()) {
                  <hlm-alert variant="destructive" class="form-error">
                    <p hlmAlertDescription>{{ error() }}</p>
                  </hlm-alert>
                }
                @if (success()) {
                  <hlm-alert variant="default" class="form-success">
                    <p hlmAlertDescription>
                      {{
                        fa()
                          ? 'مشخصات وسیله با موفقیت به‌روزرسانی شد.'
                          : 'Vehicle details updated successfully.'
                      }}
                    </p>
                  </hlm-alert>
                }

                <div class="form-actions">
                  <button hlmBtn type="submit" [disabled]="saving()">
                    {{
                      saving()
                        ? fa()
                          ? 'ذخیره در حال انجام...'
                          : 'Saving...'
                        : fa()
                          ? 'ذخیره تغییرات'
                          : 'Save Changes'
                    }}
                  </button>
                </div>
              </form>
            </div>
          </hlm-card>

          <!-- Vehicle Images Card -->
          <hlm-card class="images-card">
            <hlm-card-header>
              <h3 hlmCardTitle>{{ fa() ? 'تصاویر وسیله' : 'Vehicle Images' }}</h3>
              <p hlmCardDescription>
                {{
                  fa()
                    ? 'عکس‌های وسیله، کارت و بیمه را آپلود کنید'
                    : 'Upload vehicle, card, and insurance images'
                }}
              </p>
            </hlm-card-header>
            <div hlmCardContent>
              <div class="images-grid">
                <div class="image-upload" [class.has-image]="vehicleImage()">
                  <div class="image-label">
                    <span class="image-title">{{ fa() ? 'تصویر وسیله' : 'Vehicle Photo' }}</span>
                    @if (vehicleImage()) {
                      <img
                        [src]="vehicleImage()"
                        alt="{{ fa() ? 'عکس وسیله' : 'Vehicle photo' }}"
                        class="preview-image"
                      />
                      <div class="image-overlay">
                        <button
                          hlmBtn
                          variant="ghost"
                          size="icon"
                          (click)="removeImage('vehicle')"
                          class="remove-btn"
                        >
                          <svg
                            class="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    } @else {
                      <lib-file-upload
                        [fa]="fa"
                        acceptedMimeTypes=".jpg,.jpeg,.png,.webp"
                        maxSize="5 MB"
                        acceptedFormats="JPG, PNG, WebP"
                        (fileSelected)="onImageSelected($event, 'vehicle')"
                        (fileDropped)="onImageSelected($event, 'vehicle')"
                      />
                    }
                  </div>
                </div>

                <div class="image-upload" [class.has-image]="cardImage()">
                  <div class="image-label">
                    <span class="image-title">{{
                      fa() ? 'تصویر کارت وسیله' : 'Vehicle Card Image'
                    }}</span>
                    @if (cardImage()) {
                      <img
                        [src]="cardImage()"
                        alt="{{ fa() ? 'عکس کارت' : 'Card photo' }}"
                        class="preview-image"
                      />
                      <div class="image-overlay">
                        <button
                          hlmBtn
                          variant="ghost"
                          size="icon"
                          (click)="removeImage('card')"
                          class="remove-btn"
                        >
                          <svg
                            class="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    } @else {
                      <lib-file-upload
                        [fa]="fa"
                        acceptedMimeTypes=".jpg,.jpeg,.png,.webp"
                        maxSize="5 MB"
                        acceptedFormats="JPG, PNG, WebP"
                        (fileSelected)="onImageSelected($event, 'card')"
                        (fileDropped)="onImageSelected($event, 'card')"
                      />
                    }
                  </div>
                </div>

                <div class="image-upload" [class.has-image]="insuranceImage()">
                  <div class="image-label">
                    <span class="image-title">{{
                      fa() ? 'تصویر بیمه‌نامه' : 'Insurance Image'
                    }}</span>
                    @if (insuranceImage()) {
                      <img
                        [src]="insuranceImage()"
                        alt="{{ fa() ? 'عکس بیمه' : 'Insurance photo' }}"
                        class="preview-image"
                      />
                      <div class="image-overlay">
                        <button
                          hlmBtn
                          variant="ghost"
                          size="icon"
                          (click)="removeImage('insurance')"
                          class="remove-btn"
                        >
                          <svg
                            class="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    } @else {
                      <lib-file-upload
                        [fa]="fa"
                        acceptedMimeTypes=".jpg,.jpeg,.png,.webp"
                        maxSize="5 MB"
                        acceptedFormats="JPG, PNG, WebP"
                        (fileSelected)="onImageSelected($event, 'insurance')"
                        (fileDropped)="onImageSelected($event, 'insurance')"
                      />
                    }
                  </div>
                </div>
              </div>

              @if (imageError()) {
                <hlm-alert variant="destructive" class="image-error">
                  <p hlmAlertDescription>{{ imageError() }}</p>
                </hlm-alert>
              }
              @if (imageSuccess()) {
                <hlm-alert variant="default" class="image-success">
                  <p hlmAlertDescription>
                    {{ fa() ? 'تصاویر با موفقیت آپلود شدند.' : 'Images uploaded successfully.' }}
                  </p>
                </hlm-alert>
              }
              @if (saving() && hasPendingImages()) {
                <p class="upload-status" role="status" aria-live="polite">
                  {{ uploadStatus(fa()) }}
                </p>
              }
            </div>
          </hlm-card>
        </div>
      } @else {
        <hlm-alert variant="default">
          <h4 hlmAlertTitle>{{ fa() ? 'اطلاعات راننده یافت نشد' : 'Driver not found' }}</h4>
          <p hlmAlertDescription>
            {{
              fa()
                ? 'نمی‌توان اطلاعات وسیله را بارگذاری کرد.'
                : 'Unable to load vehicle information.'
            }}
          </p>
        </hlm-alert>
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
        max-width: 800px;
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
      .vehicle-sections {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      @media (min-width: 640px) {
        .form-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (min-width: 1024px) {
        .form-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }
      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .form-field label[hlmLabel] {
        font-size: 0.875rem;
        font-weight: 500;
      }
      .form-field input {
        width: 100%;
      }
      .form-error,
      .form-success,
      .image-error,
      .image-success {
        margin: 1rem 0;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border);
      }
      .images-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
        gap: 1rem;
      }
      .image-upload {
        position: relative;
        min-width: 0;
      }
      .image-title {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: var(--muted-foreground);
        min-height: 2.5rem;
        line-height: 1.25rem;
      }
      .preview-image {
        width: 100%;
        aspect-ratio: 4/3;
        object-fit: cover;
        border-radius: 0.5rem;
        border: 1px solid var(--border);
      }
      .remove-btn {
        background: var(--destructive);
        color: var(--destructive-foreground);
      }
      .image-overlay {
        position: absolute;
        top: 2.5rem;
        right: 0;
        z-index: 10;
      }
      .remove-btn:hover {
        opacity: 0.9;
      }
      .upload-status {
        margin: 1rem 0 0;
        color: var(--muted-foreground);
        text-align: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleProfilePage {
  private readonly api = inject(DriverApi)
  private readonly config = inject(DRIVER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')
  protected readonly uploadStatus = uploadStatusLabel
  protected readonly currentYear = new Date().getFullYear()

  protected readonly loading = signal(true)
  protected readonly saving = signal(false)
  protected readonly error = signal<string | null>(null)
  protected readonly success = signal(false)
  protected readonly imageError = signal<string | null>(null)
  protected readonly imageSuccess = signal(false)
  protected readonly driver = signal<DriverRecord | null>(null)

  protected readonly vehicleImage = signal<string | null>(null)
  protected readonly cardImage = signal<string | null>(null)
  protected readonly insuranceImage = signal<string | null>(null)
  protected readonly pendingImages = signal<Record<VehicleImageType, File | null>>({
    vehicle: null,
    card: null,
    insurance: null,
  })

  protected vehicleForm = {
    type: '',
    plate: '',
    color: '',
    year: '',
    capacity: '',
  }

  constructor() {
    this.loadData()
  }

  protected async loadData(): Promise<void> {
    this.loading.set(true)
    try {
      const driver = await this.api.driver()
      this.driver.set(driver)
      this.vehicleImage.set(driver.vehicleImage ?? null)
      this.cardImage.set(driver.cardImage ?? null)
      this.insuranceImage.set(driver.insuranceImage ?? null)

      this.vehicleForm = {
        type: driver.vehicleType ?? '',
        plate: driver.vehiclePlate ?? '',
        color: driver.vehicleColor ?? '',
        year: driver.vehicleYear ? String(driver.vehicleYear) : '',
        capacity: driver.vehicleCapacity ? String(driver.vehicleCapacity) : '',
      }
    } catch {
      this.error.set(
        this.fa() ? 'بارگذاری اطلاعات وسیله ناموفق بود.' : 'Failed to load vehicle data.',
      )
    } finally {
      this.loading.set(false)
    }
  }

  protected onImageSelected(file: File, type: VehicleImageType): void {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      this.imageError.set(
        this.fa()
          ? 'فقط تصاویر JPG، PNG و WebP مجاز هستند.'
          : 'Only JPG, PNG, and WebP images are accepted.',
      )
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      this.imageError.set(
        this.fa() ? 'حجم فایل نباید بیشتر از ۵ مگابایت باشد.' : 'File size must not exceed 5MB.',
      )
      return
    }

    this.pendingImages.update(images => ({ ...images, [type]: file }))
    const reader = new FileReader()
    reader.onload = () => {
      const preview = reader.result as string
      if (type === 'vehicle') this.vehicleImage.set(preview)
      else if (type === 'card') this.cardImage.set(preview)
      else this.insuranceImage.set(preview)
    }
    reader.readAsDataURL(file)
    this.imageError.set(null)
  }

  protected hasPendingImages(): boolean {
    return Object.values(this.pendingImages()).some(Boolean)
  }

  protected removeImage(type: VehicleImageType): void {
    if (type === 'vehicle') this.vehicleImage.set(null)
    else if (type === 'card') this.cardImage.set(null)
    else this.insuranceImage.set(null)
    this.pendingImages.update(images => ({ ...images, [type]: null }))
  }

  protected async saveVehicle(event: Event): Promise<void> {
    event.preventDefault()
    this.saving.set(true)
    this.error.set(null)
    this.success.set(false)

    try {
      await this.api.updateVehicle({
        vehicleType: this.vehicleForm.type,
        vehiclePlate: this.vehicleForm.plate,
        vehicleColor: this.vehicleForm.color,
        vehicleYear: this.vehicleForm.year ? Number(this.vehicleForm.year) : null,
        vehicleCapacity: this.vehicleForm.capacity ? Number(this.vehicleForm.capacity) : null,
      })

      // Upload pending images
      const pending = this.pendingImages()
      for (const [type, file] of Object.entries(pending)) {
        if (file) {
          await this.api.uploadDocument({
            documentType: type as VehicleImageType,
            file,
          })
        }
      }

      this.success.set(true)
      this.imageSuccess.set(true)
      this.pendingImages.set({ vehicle: null, card: null, insurance: null })
      setTimeout(() => this.loadData(), 1000)
    } catch {
      this.error.set(
        this.fa()
          ? 'ذخیره اطلاعات وسیله ناموفق بود. لطفاً دوباره تلاش کنید.'
          : 'Failed to save vehicle data. Please try again.',
      )
    } finally {
      this.saving.set(false)
    }
  }
}
