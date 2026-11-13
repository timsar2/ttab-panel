import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormField, form } from '@angular/forms/signals'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { SignalInput } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import {
  USER_CAN_MANAGE,
  USER_COMPANY_ID,
  USER_FEATURE,
  USER_LANGUAGE,
  UserDetail,
  userDetail,
  updateUser,
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
  lat: number
  lng: number
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
  lat: 0,
  lng: 0,
}

@Component({
  selector: 'lib-user-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, SignalInput, HlmButton, HlmFieldImports, RouterLink],
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
            <div class="flex flex-wrap gap-2 sm:col-span-2">
              <button hlmBtn class="min-h-11" type="submit" [disabled]="saving()">
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
  protected readonly user = signal<UserDetail | null>(null)
  protected readonly loading = signal(true)
  protected readonly saving = signal(false)
  protected readonly editing = signal(false)
  protected readonly error = signal<string | null>(null)
  protected readonly draft = signal<UserDraft>({ ...blankDraft })
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
    if (!record || companyId === null || this.saving()) return
    if (
      !draft.mobileNumber.trim() ||
      !Number.isFinite(draft.lat) ||
      !Number.isFinite(draft.lng) ||
      !Number.isSafeInteger(draft.cityId) ||
      draft.cityId < 1
    ) {
      this.error.set(
        this.rtl()
          ? 'شماره همراه، شهر و مختصات معتبر الزامی است.'
          : 'A mobile number, valid city, and coordinates are required.',
      )
      return
    }
    this.saving.set(true)
    this.error.set(null)
    try {
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
          coordinate: { lat: draft.lat, lng: draft.lng },
        }),
      )
      this.user.set(response.result)
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
      { label: this.label('address'), value: record.address, wide: true },
      { label: this.label('postalCode'), value: record.postalCode },
      { label: this.rtl() ? 'مختصات' : 'Coordinates', value: `${record.lat}, ${record.lng}` },
    ]
  }
}
