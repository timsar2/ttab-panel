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
import { HlmAvatarImports } from '@spartan-ng/helm/avatar'
import { HlmSeparatorImports } from '@spartan-ng/helm/separator'

@Component({
  selector: 'lib-driver-profile-page',
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
  ],
  template: `
    <div class="page-container" [attr.dir]="fa() ? 'rtl' : 'ltr'">
      <header class="page-header">
        <h1>{{ fa() ? 'پروفایل کاربری' : 'User Profile' }}</h1>
        <p class="page-subtitle">
          {{
            fa()
              ? 'اطلاعات هویتی و تماس خود را مدیریت کنید'
              : 'Manage your identity and contact information'
          }}
        </p>
      </header>

      @if (loading()) {
        <div class="loading-state">
          <hlm-spinner />
          <p>{{ fa() ? 'در حال بارگذاری...' : 'Loading...' }}</p>
        </div>
      } @else {
        <hlm-card class="profile-card">
          <hlm-card-header>
            <div class="avatar-section">
              <hlm-avatar class="profile-avatar">
                @if (profileImage()) {
                  <img [src]="profileImage()" alt="" hlmAvatarImage />
                } @else {
                  <span hlmAvatarFallback>{{
                    profile()?.['firstName']?.toString()?.charAt(0) ?? 'D'
                  }}</span>
                }
              </hlm-avatar>
              <div class="avatar-actions">
                <label class="file-input-label">
                  {{ fa() ? 'تغییر عکس' : 'Change Photo' }}
                  <input
                    type="file"
                    accept="image/*"
                    (change)="onImageSelected($event)"
                    #fileInput
                  />
                </label>
                @if (profileImage() || profile()?.['profileImage']) {
                  <button hlmBtn variant="ghost" size="sm" (click)="removeImage()">
                    {{ fa() ? 'حذف' : 'Remove' }}
                  </button>
                }
              </div>
            </div>
          </hlm-card-header>

          <div hlmCardContent>
            <form (submit)="saveProfile($event)" class="profile-form">
              <div class="form-grid">
                <div class="form-field">
                  <label hlmLabel>{{ fa() ? 'نام کامل' : 'Full Name' }}</label>
                  <input
                    hlmInput
                    [(ngModel)]="formData.fullName"
                    name="fullName"
                    [disabled]="saving()"
                    required
                  />
                </div>
                <div class="form-field">
                  <label hlmLabel>{{ fa() ? 'شماره موبایل' : 'Mobile Number' }}</label>
                  <input
                    hlmInput
                    [(ngModel)]="formData.mobileNumber"
                    name="mobileNumber"
                    type="tel"
                    [disabled]="saving()"
                    required
                  />
                </div>
                <div class="form-field">
                  <label hlmLabel>{{ fa() ? 'ایمیل' : 'Email' }}</label>
                  <input
                    hlmInput
                    [(ngModel)]="formData.email"
                    name="email"
                    type="email"
                    [disabled]="saving()"
                  />
                </div>
                <div class="form-field">
                  <label hlmLabel>{{ fa() ? 'آدرس' : 'Address' }}</label>
                  <input
                    hlmInput
                    [(ngModel)]="formData.address"
                    name="address"
                    [disabled]="saving()"
                  />
                </div>
                <div class="form-field">
                  <label hlmLabel>{{ fa() ? 'استان' : 'Province' }}</label>
                  <select
                    hlmInput
                    [(ngModel)]="formData.provinceId"
                    name="provinceId"
                    (change)="onProvinceChange()"
                    [disabled]="saving()"
                  >
                    <option value="">{{ fa() ? 'انتخاب استان' : 'Select Province' }}</option>
                    @for (province of provinces(); track province.id) {
                      <option [value]="province.id">{{ province.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-field">
                  <label hlmLabel>{{ fa() ? 'شهر' : 'City' }}</label>
                  <select
                    hlmInput
                    [(ngModel)]="formData.cityId"
                    name="cityId"
                    [disabled]="saving() || !formData.provinceId"
                  >
                    <option value="">{{ fa() ? 'انتخاب شهر' : 'Select City' }}</option>
                    @for (city of cities(); track city.id) {
                      <option [value]="city.id">{{ city.name }}</option>
                    }
                  </select>
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
                      fa() ? 'پروفایل با موفقیت به‌روزرسانی شد.' : 'Profile updated successfully.'
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
        max-width: 700px;
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
      .profile-card {
        overflow: hidden;
      }
      .avatar-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem 0;
      }
      .profile-avatar {
        width: 100px;
        height: 100px;
      }
      .avatar-actions {
        display: flex;
        gap: 0.5rem;
      }
      .file-input-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-size: 0.875rem;
        color: var(--primary);
      }
      .file-input-label input {
        position: absolute;
        width: 0.1px;
        height: 0.1px;
        opacity: 0;
        overflow: hidden;
        z-index: -1;
      }
      .profile-form {
        padding-top: 1rem;
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
      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .form-field label[hlmLabel] {
        font-size: 0.875rem;
        font-weight: 500;
      }
      .form-field input,
      .form-field select {
        width: 100%;
      }
      .form-error,
      .form-success {
        margin: 1rem 0;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverProfilePage {
  private readonly api = inject(DriverApi)
  private readonly config = inject(DRIVER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')

  protected readonly loading = signal(true)
  protected readonly saving = signal(false)
  protected readonly error = signal<string | null>(null)
  protected readonly success = signal(false)
  protected readonly profile = signal<Record<string, unknown> | null>(null)
  protected readonly profileImage = signal<string | null>(null)
  protected readonly provinces = signal<{ id: number; name: string }[]>([])
  protected readonly cities = signal<{ id: number; name: string }[]>([])
  protected readonly selectedFile = signal<File | null>(null)

  protected formData = {
    fullName: '',
    mobileNumber: '',
    email: '',
    address: '',
    provinceId: '',
    cityId: '',
  }

  constructor() {
    this.loadData()
  }

  protected async loadData(): Promise<void> {
    this.loading.set(true)
    try {
      const [profile, provinces] = await Promise.all([this.api.profile(), this.api.provinces()])
      this.profile.set(profile)
      this.profileImage.set(
        typeof profile['profileImage'] === 'string' ? profile['profileImage'] : null,
      )
      this.provinces.set(provinces)

      this.formData = {
        fullName:
          `${String(profile['firstName'] ?? '')} ${String(profile['lastName'] ?? '')}`.trim(),
        mobileNumber: String(profile['mobileNumber'] ?? ''),
        email: String(profile['email'] ?? ''),
        address: String(profile['address'] ?? ''),
        provinceId: String(profile['provinceId'] ?? ''),
        cityId: String(profile['cityId'] ?? ''),
      }

      if (this.formData.provinceId) {
        this.loadCities(Number(this.formData.provinceId))
      }
    } catch {
      this.error.set(this.fa() ? 'بارگذاری پروفایل ناموفق بود.' : 'Failed to load profile.')
    } finally {
      this.loading.set(false)
    }
  }

  protected async loadCities(provinceId: number): Promise<void> {
    try {
      const cities = await this.api.cities(provinceId)
      this.cities.set(cities)
    } catch {
      this.cities.set([])
    }
  }

  protected onProvinceChange(): void {
    this.formData.cityId = ''
    if (this.formData.provinceId) {
      this.loadCities(Number(this.formData.provinceId))
    } else {
      this.cities.set([])
    }
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files?.[0]) {
      this.selectedFile.set(input.files[0])
      const reader = new FileReader()
      reader.onload = e => this.profileImage.set(e.target?.result as string)
      reader.readAsDataURL(input.files[0])
    }
  }

  protected removeImage(): void {
    this.profileImage.set(null)
    this.selectedFile.set(null)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  protected async saveProfile(event: Event): Promise<void> {
    event.preventDefault()
    this.saving.set(true)
    this.error.set(null)
    this.success.set(false)

    try {
      // Upload image if selected
      if (this.selectedFile()) {
        // In a real implementation, upload to a profile image endpoint
        // For now, just update profile
      }

      await this.api.updateProfile({
        fullName: this.formData.fullName,
        mobileNumber: this.formData.mobileNumber,
        email: this.formData.email,
        address: this.formData.address,
        provinceId: this.formData.provinceId ? Number(this.formData.provinceId) : null,
        cityId: this.formData.cityId ? Number(this.formData.cityId) : null,
      })

      this.success.set(true)
      this.loadData() // Reload to get updated data
    } catch {
      this.error.set(
        this.fa()
          ? 'ذخیره پروفایل ناموفق بود. لطفاً دوباره تلاش کنید.'
          : 'Failed to save profile. Please try again.',
      )
    } finally {
      this.saving.set(false)
    }
  }
}
