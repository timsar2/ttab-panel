import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormField, form } from '@angular/forms/signals'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { ConfirmDialog, FileUploadControl, SignalInput, UploadSelection } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import {
  USER_CAN_MANAGE,
  USER_COMPANY_ID,
  USER_FEATURE,
  USER_LANGUAGE,
  USER_IMAGE_FILE_TYPES,
  UserDetail,
  deleteUser,
  userDetail,
  updateUser,
  userProfileImagePayload,
  userHttp,
} from './users.routes'

interface UserDraft {
  firstName: string
  lastName: string
  email: string
  nationalId: string
  mobileNumber: string
  phoneNumber: string
  cityId: number
  address: string
  postalCode: string
  lat: number | null
  lng: number | null
}

const blankDraft: UserDraft = {
  firstName: '',
  lastName: '',
  email: '',
  nationalId: '',
  mobileNumber: '',
  phoneNumber: '',
  cityId: 0,
  address: '',
  postalCode: '',
  lat: null,
  lng: null,
}

const profileImageLabel = { en: 'Profile image', fa: 'تصویر پروفایل' }
const currentProfileImage = { en: 'Current profile image', fa: 'تصویر پروفایل فعلی' }
const profileImagePolicy = {
  en: 'JPEG, PNG, or WebP. Maximum size 160 KiB.',
  fa: 'فرمت JPEG، PNG یا WebP. حداکثر اندازه ۱۶۰ کیلوبایت.',
}

@Component({
  selector: 'lib-user-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ConfirmDialog,
    FormField,
    SignalInput,
    FileUploadControl,
    HlmButton,
    HlmFieldImports,
    RouterLink,
  ],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="rtl() ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-muted-foreground text-sm">{{ rtl() ? 'اطلاعات کاربر' : 'User record' }}</p>
          <h1 class="text-2xl font-semibold">{{ title() }}</h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['..']">{{
            rtl() ? 'بازگشت' : 'Back to users'
          }}</a>
          @if (user() && !editing() && canManage()) {
            <button hlmBtn class="min-h-11" type="button" (click)="editing.set(true)">
              {{ rtl() ? 'ویرایش' : 'Edit' }}
            </button>
            <button
              hlmBtn
              variant="destructive"
              class="min-h-11"
              type="button"
              [disabled]="deleting()"
              (click)="deleteConfirmationOpen.set(true)"
            >
              {{
                deleting()
                  ? rtl()
                    ? 'در حال حذف...'
                    : 'Deleting...'
                  : rtl()
                    ? 'حذف کاربر'
                    : 'Delete user'
              }}
            </button>
          }
        </div>
      </header>
      @if (!canManage()) {
        <p role="alert">
          {{ rtl() ? 'دسترسی مجاز نیست.' : 'You are not authorized to view users.' }}
        </p>
      } @else if (loading()) {
        <p role="status">{{ rtl() ? 'در حال بارگذاری...' : 'Loading user details...' }}</p>
      } @else if (error()) {
        <p role="alert">{{ error() }}</p>
        <button hlmBtn variant="outline" type="button" (click)="load()">
          {{ rtl() ? 'تلاش دوباره' : 'Retry' }}
        </button>
      } @else if (user(); as record) {
        @if (editing()) {
          <form class="grid min-w-0 gap-4 sm:grid-cols-2" (submit)="save($event)">
            @for (field of textFields; track field) {
              <div hlmField [class]="field === 'address' ? 'sm:col-span-2' : ''">
                <label hlmFieldLabel [for]="field">{{ label(field) }}</label>
                <input
                  libSignalInput
                  class="min-h-11"
                  [id]="field"
                  [type]="field === 'email' ? 'email' : 'text'"
                  [formField]="editor[field]"
                />
              </div>
            }
            @for (field of numberFields; track field) {
              <div hlmField>
                <label hlmFieldLabel [for]="field">{{ label(field) }}</label>
                <input
                  libSignalInput
                  class="min-h-11"
                  [id]="field"
                  type="number"
                  [formField]="editor[field]"
                />
              </div>
            }
            <lib-file-upload
              class="sm:col-span-2"
              id="user-profile-image"
              [language]="rtl() ? 'fa' : 'en'"
              [label]="profileImageLabel"
              [allowedTypes]="imageTypes"
              [maxBytes]="163840"
              [policyDescription]="profileImagePolicy"
              [existingName]="record.profileImage ? currentProfileImage : null"
              [existingPreview]="record.profileImage ?? null"
              [disabled]="saving()"
              [allowRemove]="!!record.profileImage"
              [(value)]="image"
            />
            <div class="flex flex-wrap gap-2 sm:col-span-2">
              <button hlmBtn class="min-h-11" type="submit" [disabled]="saving() || imagePending()">
                {{
                  saving()
                    ? rtl()
                      ? 'در حال ذخیره...'
                      : 'Saving...'
                    : rtl()
                      ? 'ذخیره تغییرات'
                      : 'Save changes'
                }}
              </button>
              <button
                hlmBtn
                variant="outline"
                class="min-h-11"
                type="button"
                [disabled]="saving()"
                (click)="cancelEdit()"
              >
                {{ rtl() ? 'انصراف' : 'Cancel' }}
              </button>
            </div>
          </form>
        } @else {
          <section class="mb-6 flex min-w-0 items-center gap-4 rounded-lg border p-4">
            @if (record.profileImage) {
              <img
                class="h-20 w-20 shrink-0 rounded-full border object-cover"
                [src]="record.profileImage"
                [alt]="title()"
                loading="lazy"
                referrerpolicy="no-referrer"
              />
            } @else {
              <span
                class="bg-muted text-muted-foreground flex h-20 w-20 shrink-0 items-center justify-center rounded-full border text-lg font-semibold"
                aria-hidden="true"
                >{{ initials() }}</span
              >
            }
            <div class="min-w-0">
              <h2 class="font-semibold">{{ rtl() ? 'تصویر پروفایل' : 'Profile image' }}</h2>
              <p class="text-muted-foreground mt-1 text-sm break-all">
                {{
                  record.profileImage
                    ? rtl()
                      ? 'تصویر ثبت‌شده'
                      : 'Profile photo on file'
                    : rtl()
                      ? 'تصویری ثبت نشده است'
                      : 'No profile image'
                }}
              </p>
            </div>
          </section>
          <section class="grid min-w-0 gap-4 sm:grid-cols-2" aria-label="User details">
            @for (item of displayFields(record); track item.label) {
              <article
                [class]="
                  item.wide
                    ? 'min-w-0 rounded-lg border p-4 sm:col-span-2'
                    : 'min-w-0 rounded-lg border p-4'
                "
              >
                <h2 class="text-muted-foreground text-sm">{{ item.label }}</h2>
                <p class="mt-1 font-medium break-words">{{ item.value || '-' }}</p>
              </article>
            }
          </section>
        }
      }
      <lib-confirm-dialog
        [(open)]="deleteConfirmationOpen"
        [title]="rtl() ? 'حذف کاربر' : 'Delete user'"
        [description]="deleteDescription()"
        [confirmLabel]="rtl() ? 'حذف' : 'Delete'"
        [cancelLabel]="rtl() ? 'انصراف' : 'Cancel'"
        [busy]="deleting()"
        (confirmed)="removeUser()"
      />
    </main>
  `,
})
export class UserDetailPage {
  protected readonly config = inject(USER_FEATURE)
  private readonly companyId = inject(USER_COMPANY_ID)
  private readonly language = inject(USER_LANGUAGE)
  protected readonly canManage = inject(USER_CAN_MANAGE)
  private readonly http = userHttp()
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  protected readonly user = signal<UserDetail | null>(null)
  protected readonly loading = signal(true)
  protected readonly saving = signal(false)
  protected readonly deleting = signal(false)
  protected readonly deleteConfirmationOpen = signal(false)
  protected readonly editing = signal(false)
  protected readonly error = signal<string | null>(null)
  protected readonly draft = signal<UserDraft>({ ...blankDraft })
  protected readonly image = signal<UploadSelection>({ kind: 'keep' })
  protected readonly imageTypes = USER_IMAGE_FILE_TYPES
  protected readonly profileImageLabel = profileImageLabel
  protected readonly currentProfileImage = currentProfileImage
  protected readonly profileImagePolicy = profileImagePolicy
  protected readonly imagePending = computed(
    () => !['keep', 'replace', 'remove'].includes(this.image().kind),
  )
  protected readonly editor = form(this.draft)
  protected readonly textFields: readonly Exclude<keyof UserDraft, 'cityId' | 'lat' | 'lng'>[] = [
    'firstName',
    'lastName',
    'email',
    'nationalId',
    'mobileNumber',
    'phoneNumber',
    'postalCode',
    'address',
  ]
  protected readonly numberFields: readonly ('cityId' | 'lat' | 'lng')[] = ['cityId', 'lat', 'lng']
  protected readonly rtl = computed(() => this.language() === 'fa')
  protected readonly title = computed(() => {
    const record = this.user()
    return record
      ? `${record.firstName ?? ''} ${record.lastName ?? ''}`.trim() || `User ${record.id}`
      : this.rtl()
        ? 'جزئیات کاربر'
        : 'User details'
  })
  protected readonly deleteDescription = computed(() =>
    this.rtl()
      ? `آیا از حذف ${this.title()} مطمئن هستید؟ این عملیات برگشت‌پذیر نیست و ممکن است حساب ورود مرتبط را نیز غیرفعال کند.`
      : `Delete ${this.title()}? This cannot be undone and may also deactivate the linked sign-in account.`,
  )
  private request = 0

  constructor() {
    void this.load()
  }

  protected async load() {
    const id = Number(this.route.snapshot.paramMap.get('id'))
    const companyId = this.companyId()
    const request = ++this.request
    if (!this.canManage() || companyId === null || !Number.isSafeInteger(id) || id < 1) {
      this.error.set(
        this.rtl()
          ? 'شناسه یا دسترسی شرکت نامعتبر است.'
          : 'Invalid user ID or unavailable company access.',
      )
      this.loading.set(false)
      return
    }
    this.loading.set(true)
    this.error.set(null)
    try {
      const record = (await firstValueFrom(userDetail(this.http, this.config, id))).result
      if (request !== this.request) return
      this.user.set(record)
      this.draft.set({
        firstName: record.firstName ?? '',
        lastName: record.lastName ?? '',
        email: record.email ?? '',
        nationalId: record.nationalId ?? '',
        mobileNumber: record.mobileNumber ?? '',
        phoneNumber: record.phoneNumber ?? '',
        cityId: record.cityId,
        address: record.address ?? '',
        postalCode: record.postalCode ?? '',
        lat: record.lat,
        lng: record.lng,
      })
    } catch {
      if (request === this.request)
        this.error.set(
          this.rtl() ? 'بارگذاری اطلاعات کاربر ناموفق بود.' : 'Unable to load user details.',
        )
    } finally {
      if (request === this.request) this.loading.set(false)
    }
  }

  protected async save(event: Event) {
    event.preventDefault()
    const record = this.user()
    const companyId = this.companyId()
    const draft = this.draft()
    if (!record || companyId === null || this.saving() || this.imagePending()) return
    if (
      !draft.mobileNumber.trim() ||
      !this.validCoordinates(draft.lat, draft.lng) ||
      !Number.isSafeInteger(draft.cityId) ||
      draft.cityId < 1
    ) {
      this.error.set(
        this.rtl()
          ? 'شماره همراه و شهر معتبر الزامی است؛ مختصات باید خالی یا معتبر باشد.'
          : 'A mobile number and valid city are required; coordinates must be empty or a valid pair.',
      )
      return
    }
    this.saving.set(true)
    this.error.set(null)
    try {
      const profileImage = userProfileImagePayload(this.image())
      const response = await firstValueFrom(
        updateUser(this.http, this.config, {
          id: record.id,
          companyId,
          mobileNumber: draft.mobileNumber.trim(),
          phoneNumber: draft.phoneNumber.trim() || null,
          firstName: draft.firstName.trim() || null,
          lastName: draft.lastName.trim() || null,
          email: draft.email.trim() || null,
          cityId: draft.cityId,
          nationalId: draft.nationalId.trim() || null,
          address: draft.address.trim(),
          postalCode: draft.postalCode.trim() || null,
          coordinate:
            draft.lat === null && draft.lng === null
              ? null
              : { lat: draft.lat as number, lng: draft.lng as number },
          ...(profileImage ? { profileImage } : {}),
        }),
      )
      this.user.set(response.result)
      this.image.set({ kind: 'keep' })
      this.editing.set(false)
      await this.load()
    } catch {
      this.error.set(
        this.rtl()
          ? 'ذخیره اطلاعات ناموفق بود؛ تغییرات فرم حفظ شده‌اند.'
          : 'Unable to save user; your draft has been retained.',
      )
    } finally {
      this.saving.set(false)
    }
  }

  protected async removeUser() {
    const record = this.user()
    if (!record || !this.canManage() || this.deleting()) return
    this.deleting.set(true)
    this.error.set(null)
    try {
      await firstValueFrom(deleteUser(this.http, this.config, record.id))
      this.user.set(null)
      await this.router.navigate(['..'], { relativeTo: this.route })
    } catch {
      this.error.set(
        this.rtl() ? 'حذف کاربر ناموفق بود.' : 'Unable to delete user. The record was not removed.',
      )
    } finally {
      this.deleting.set(false)
    }
  }

  protected cancelEdit() {
    const record = this.user()
    if (!record) return
    this.draft.set({
      firstName: record.firstName ?? '',
      lastName: record.lastName ?? '',
      email: record.email ?? '',
      nationalId: record.nationalId ?? '',
      mobileNumber: record.mobileNumber ?? '',
      phoneNumber: record.phoneNumber ?? '',
      cityId: record.cityId,
      address: record.address ?? '',
      postalCode: record.postalCode ?? '',
      lat: record.lat,
      lng: record.lng,
    })
    this.editing.set(false)
    this.image.set({ kind: 'keep' })
    this.error.set(null)
  }
  protected label(key: keyof UserDraft) {
    const labels = this.rtl()
      ? {
          firstName: 'نام',
          lastName: 'نام خانوادگی',
          email: 'ایمیل',
          nationalId: 'کد ملی',
          mobileNumber: 'تلفن همراه',
          phoneNumber: 'تلفن ثابت',
          cityId: 'شناسه شهر',
          address: 'نشانی',
          postalCode: 'کد پستی',
          lat: 'عرض جغرافیایی',
          lng: 'طول جغرافیایی',
        }
      : {
          firstName: 'First name',
          lastName: 'Last name',
          email: 'Email',
          nationalId: 'National ID',
          mobileNumber: 'Mobile number',
          phoneNumber: 'Phone number',
          cityId: 'City ID',
          address: 'Address',
          postalCode: 'Postal code',
          lat: 'Latitude',
          lng: 'Longitude',
        }
    return labels[key]
  }
  protected displayFields(record: UserDetail) {
    return [
      { label: this.label('mobileNumber'), value: record.mobileNumber },
      { label: this.label('email'), value: record.email },
      { label: this.label('nationalId'), value: record.nationalId },
      { label: this.rtl() ? 'شهر' : 'City', value: record.cityName },
      { label: this.rtl() ? 'استان' : 'Province', value: record.provinceName },
      { label: this.label('address'), value: record.address, wide: true },
      { label: this.label('postalCode'), value: record.postalCode },
      {
        label: this.rtl() ? 'مختصات' : 'Coordinates',
        value:
          record.lat === null && record.lng === null
            ? '-'
            : `${record.lat ?? '-'}, ${record.lng ?? '-'}`,
      },
    ]
  }
  protected initials() {
    const parts = this.title().trim().split(/\s+/).filter(Boolean)
    return parts.length
      ? `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`
      : '?'
  }
  private validCoordinates(lat: number | null, lng: number | null) {
    if (lat === null && lng === null) return true
    return (
      lat !== null &&
      lng !== null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    )
  }
}
