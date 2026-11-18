import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core'
import { Choice, PassengerApi } from '../passenger.api'
import { PASSENGER_FEATURE_CONFIG } from '../passenger.routes'
import { HlmButtonImports } from '@spartan-ng/helm/button'

@Component({
  selector: 'lib-passenger-profile-page',
  imports: [HlmButtonImports],
  template: `
    <div class="page-head">
      <h1>{{ fa() ? 'حساب کاربری' : 'Account profile' }}</h1>
      <p>{{ fa() ? 'اطلاعات هویتی و تماس شما' : 'Your identity and contact details' }}</p>
    </div>
    @if (loading()) {
      <div class="panel" role="status">
        {{ fa() ? 'در حال بارگذاری...' : 'Loading profile...' }}
      </div>
    }
    @if (error()) {
      <div class="panel stack" role="alert">
        <p class="error">{{ error() }}</p>
        <button class="secondary" (click)="load()">{{ fa() ? 'تلاش دوباره' : 'Retry' }}</button>
      </div>
    }
    @if (!loading() && profile()) {
      <form class="panel stack" (submit)="$event.preventDefault(); save()">
        <header class="profile-identity">
          <button
            class="profile-avatar-trigger"
            type="button"
            [disabled]="saving()"
            [attr.aria-label]="fa() ? 'تغییر تصویر نمایه' : 'Change profile photo'"
            (click)="openImagePicker(profileImageInput)"
          >
            @if (displayProfilePhoto(); as image) {
              <img [src]="image" alt="" (error)="profileImageFailed.set(true)" />
            } @else {
              <span class="profile-avatar-fallback" aria-hidden="true">{{
                profileInitials()
              }}</span>
            }
            <span class="profile-avatar-edit" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
              </svg>
            </span>
          </button>
          <input
            #profileImageInput
            class="profile-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            tabindex="-1"
            aria-hidden="true"
            (change)="selectImage($event)"
          />
          <div class="profile-identity-copy">
            <h2>{{ profileDisplayName() }}</h2>
            <p>{{ fa() ? 'تصویر حساب کاربری' : 'Your account photo' }}</p>
            @if (imagePreview()) {
              <p class="profile-image-pending" role="status">
                {{
                  fa()
                    ? 'تصویر جدید انتخاب شد؛ برای ثبت، ذخیره تغییرات را بزنید.'
                    : 'New photo selected. Save changes to apply it.'
                }}
              </p>
            }
          </div>
        </header>
        <div class="grid">
          <label
            >{{ fa() ? 'نام' : 'First name'
            }}<input
              autocomplete="given-name"
              [value]="firstName()"
              (input)="firstName.set($any($event.target).value)"
              required
              maxlength="100"
          /></label>
          <label
            >{{ fa() ? 'نام خانوادگی' : 'Last name'
            }}<input
              autocomplete="family-name"
              [value]="lastName()"
              (input)="lastName.set($any($event.target).value)"
              required
              maxlength="100"
          /></label>
          <label
            >{{ fa() ? 'شماره همراه تأییدشده' : 'Verified mobile number'
            }}<input type="tel" [value]="$any(profile()?.['mobileNumber'] ?? '')" readonly
          /></label>
          <label
            >{{ fa() ? 'ایمیل' : 'Email'
            }}<input
              type="email"
              autocomplete="email"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
          /></label>
          <label
            >{{ fa() ? 'کد ملی' : 'National ID'
            }}<input [value]="nationalId()" (input)="nationalId.set($any($event.target).value)"
          /></label>
          <label
            >{{ fa() ? 'استان' : 'Province'
            }}<select [value]="provinceId()" (change)="selectProvince(+$any($event.target).value)">
              <option value="">{{ fa() ? 'انتخاب استان' : 'Select province' }}</option>
              @for (item of provinces(); track item.id) {
                <option [value]="item.id">{{ item.name }}</option>
              }
            </select></label
          >
          <label
            >{{ fa() ? 'شهر' : 'City'
            }}<select [value]="cityId()" (change)="cityId.set($any($event.target).value)">
              <option value="">{{ fa() ? 'انتخاب شهر' : 'Select city' }}</option>
              @for (item of cities(); track item.id) {
                <option [value]="item.id">{{ item.name }}</option>
              }
            </select></label
          >
          <label
            >{{ fa() ? 'شماره تماس ثابت' : 'Phone'
            }}<input
              type="tel"
              autocomplete="tel"
              [value]="phoneNumber()"
              (input)="phoneNumber.set($any($event.target).value)"
          /></label>
          <label
            >{{ fa() ? 'کد پستی' : 'Postal code'
            }}<input
              autocomplete="postal-code"
              [value]="postalCode()"
              (input)="postalCode.set($any($event.target).value)"
          /></label>
        </div>
        <label
          >{{ fa() ? 'نشانی' : 'Address'
          }}<textarea
            autocomplete="street-address"
            [value]="address()"
            (input)="address.set($any($event.target).value)"
          ></textarea>
        </label>
        <p class="notice">
          {{
            fa()
              ? 'شماره همراه فقط پس از تأیید رمز یک‌بارمصرف قابل تغییر است. تصویر JPG، PNG یا WebP تا ۶۵۰ کیلوبایت انتخاب کنید.'
              : 'Mobile-number changes require a separate OTP verification flow. Choose a JPG, PNG, or WebP image up to 650 KB.'
          }}
        </p>
        @if (saveError()) {
          <p role="alert" class="error">{{ saveError() }}</p>
        }
        @if (saved()) {
          <p role="status">{{ fa() ? 'اطلاعات ذخیره شد.' : 'Profile saved.' }}</p>
        }
        <div class="actions">
          <button hlmBtn class="primary" type="submit" [disabled]="saving()">
            {{
              saving()
                ? fa()
                  ? 'در حال ذخیره...'
                  : 'Saving...'
                : fa()
                  ? 'ذخیره تغییرات'
                  : 'Save changes'
            }}
          </button>
        </div>
      </form>
    }
  `,
  styleUrl: './passenger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerProfilePage {
  private readonly api = inject(PassengerApi)
  private readonly config = inject(PASSENGER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')
  protected readonly loading = signal(true)
  protected readonly saving = signal(false)
  protected readonly error = signal<string | null>(null)
  protected readonly saveError = signal<string | null>(null)
  protected readonly saved = signal(false)
  protected readonly profile = signal<Record<string, unknown> | null>(null)
  protected readonly provinces = signal<Choice[]>([])
  protected readonly cities = signal<Choice[]>([])
  protected readonly firstName = signal('')
  protected readonly lastName = signal('')
  protected readonly email = signal('')
  protected readonly nationalId = signal('')
  protected readonly phoneNumber = signal('')
  protected readonly postalCode = signal('')
  protected readonly address = signal('')
  protected readonly imagePreview = signal<string | null>(null)
  protected readonly profileImageFailed = signal(false)
  protected readonly profileDisplayName = computed(() =>
    `${this.firstName().trim()} ${this.lastName().trim()}`.trim(),
  )
  protected readonly profileInitials = computed(() => {
    const initials = [this.firstName().trim(), this.lastName().trim()]
      .map(name => name[0])
      .filter(Boolean)
      .join('')
    return initials || 'P'
  })
  protected readonly displayProfilePhoto = computed(() => {
    if (this.profileImageFailed()) return null
    const preview = this.imagePreview()
    if (preview) return preview
    const image = this.profile()?.['profileImage']
    return typeof image === 'string' && image ? image : null
  })
  private readonly imageUpload = signal<{ extension: string; data: string } | null>(null)
  protected readonly provinceId = signal('')
  protected readonly cityId = signal('')

  constructor() {
    afterNextRender(() => void this.load())
  }

  protected async load(): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    try {
      const [profile, provinces] = await Promise.all([this.api.profile(), this.api.provinces()])
      this.profile.set(profile)
      this.profileImageFailed.set(false)
      this.provinces.set(provinces)
      this.firstName.set(String(profile['firstName'] ?? ''))
      this.lastName.set(String(profile['lastName'] ?? ''))
      this.email.set(String(profile['email'] ?? ''))
      this.nationalId.set(String(profile['nationalId'] ?? ''))
      this.phoneNumber.set(String(profile['phoneNumber'] ?? ''))
      this.postalCode.set(String(profile['postalCode'] ?? ''))
      this.address.set(String(profile['address'] ?? ''))
      const province = provinces.find(item => item.name === profile['provinceName'])
      if (province) {
        this.provinceId.set(String(province.id))
        this.cities.set(await this.api.cities(province.id))
      }
      if (typeof profile['cityId'] === 'number') this.cityId.set(String(profile['cityId']))
    } catch {
      this.error.set(
        this.fa() ? 'بارگذاری اطلاعات حساب ناموفق بود.' : 'Could not load your profile.',
      )
    } finally {
      this.loading.set(false)
    }
  }

  protected async selectProvince(id: number): Promise<void> {
    this.provinceId.set(id ? String(id) : '')
    this.cityId.set('')
    this.cities.set([])
    if (!id) return
    try {
      this.cities.set(await this.api.cities(id))
    } catch {
      this.saveError.set(
        this.fa() ? 'بارگذاری شهرها ناموفق بود.' : 'Could not load cities for this province.',
      )
    }
  }

  protected openImagePicker(input: HTMLInputElement): void {
    if (this.saving()) return
    input.value = ''
    input.click()
  }

  protected async save(): Promise<void> {
    const current = this.profile()
    if (
      !current ||
      !Number.isSafeInteger(current['id']) ||
      !this.firstName().trim() ||
      !this.lastName().trim()
    )
      return
    this.saving.set(true)
    this.saveError.set(null)
    this.saved.set(false)
    try {
      await this.api.updateProfile({
        id: current['id'],
        firstName: this.firstName().trim(),
        lastName: this.lastName().trim(),
        email: this.email().trim() || null,
        nationalId: this.nationalId().trim() || null,
        phoneNumber: this.phoneNumber().trim() || null,
        cityId: this.cityId() ? Number(this.cityId()) : null,
        address: this.address().trim() || null,
        postalCode: this.postalCode().trim() || null,
        ...(this.imageUpload()
          ? { profileImage: { ...this.imageUpload(), deleteCurrentImage: false } }
          : {}),
      })
      this.imageUpload.set(null)
      this.imagePreview.set(null)
      this.saved.set(true)
      await this.load()
    } catch {
      this.saveError.set(
        this.fa() ? 'ذخیره اطلاعات تأیید نشد.' : 'The service did not confirm your profile update.',
      )
    } finally {
      this.saving.set(false)
    }
  }

  protected selectImage(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpeg',
      'image/png': '.png',
      'image/webp': '.webp',
    }
    if (!extensions[file.type] || file.size > 650 * 1024) {
      this.imageUpload.set(null)
      this.imagePreview.set(null)
      this.saveError.set(
        this.fa()
          ? 'فرمت تصویر پشتیبانی نمی‌شود یا حجم آن بیشتر از ۶۵۰ کیلوبایت است.'
          : 'Unsupported image format or file larger than 650 KB.',
      )
      input.value = ''
      return
    }
    const reader = new FileReader()
    reader.addEventListener(
      'load',
      () => {
        if (
          typeof reader.result !== 'string' ||
          !reader.result.startsWith(`data:${file.type};base64,`)
        ) {
          this.saveError.set(
            this.fa() ? 'خواندن تصویر ناموفق بود.' : 'Could not read the selected image.',
          )
          return
        }
        this.imageUpload.set({ extension: extensions[file.type], data: reader.result })
        this.imagePreview.set(reader.result)
        this.profileImageFailed.set(false)
        this.saveError.set(null)
      },
      { once: true },
    )
    reader.addEventListener(
      'error',
      () =>
        this.saveError.set(
          this.fa() ? 'خواندن تصویر ناموفق بود.' : 'Could not read the selected image.',
        ),
      { once: true },
    )
    reader.readAsDataURL(file)
  }
}
