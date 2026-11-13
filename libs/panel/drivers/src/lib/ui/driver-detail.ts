import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { lucideFileCode } from '@ng-icons/lucide'
import { SessionStore } from '@org/auth-data-access'
import { DriversApi, DriversStore, driverId } from '@org/transport-drivers-data-access'
import { HlmAttachmentImports } from '@spartan-ng/helm/attachment'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmCardImports } from '@spartan-ng/helm/card'
import { HlmSeparatorImports } from '@spartan-ng/helm/separator'
import { DRIVER_FEATURE, DRIVER_LANGUAGE, DRIVER_MANAGE } from '../driver.routes'
import { driverText, driverTextPair, safeDriverError, type DriverTextKey } from '../driver-text'

export function routeDriverId(value: string | null) {
  if (value === null) return null
  if (!/^[1-9]\d*$/.test(value)) return undefined
  try {
    return driverId(Number(value))
  } catch {
    return undefined
  }
}
export const driverDocuments = [
  {
    key: 'nationalCardFrontImage',
    label: driverTextPair('nationalCardFront'),
    currentLabel: driverTextPair('currentNationalCardFront'),
  },
  {
    key: 'nationalCardBehindImage',
    label: driverTextPair('nationalCardBack'),
    currentLabel: driverTextPair('currentNationalCardBack'),
  },
  {
    key: 'drivingLicenceImage',
    label: driverTextPair('drivingLicence'),
    currentLabel: driverTextPair('currentDrivingLicence'),
  },
  {
    key: 'driverSmartCardImage',
    label: driverTextPair('driverSmartCard'),
    currentLabel: driverTextPair('currentDriverSmartCard'),
  },
] as const

@Component({
  selector: 'lib-driver-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIcon,
    HlmAttachmentImports,
    HlmCardImports,
    HlmSeparatorImports,
    RouterLink,
    HlmButton,
  ],
  providers: [DriversStore, provideIcons({ lucideFileCode })],
  host: {
    class: 'block w-full min-w-0 max-w-full px-4 pb-4 pt-24 md:px-8 md:pb-8 md:pt-36',
  },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header
        class="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="w-full min-w-0 sm:flex-1">
          <p class="text-muted-foreground mb-1 text-sm">{{ text('driverRecord') }}</p>
          <h1 class="text-2xl font-semibold break-words md:text-3xl">{{ driverHeading() }}</h1>
          @if (identitySummary(); as identity) {
            <p class="text-muted-foreground mt-2 text-sm break-words">{{ identity }}</p>
          }
        </div>
        <div class="flex w-full max-w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
          <a
            hlmBtn
            variant="outline"
            class="min-h-11 max-w-full"
            [routerLink]="['..']"
            queryParamsHandling="preserve"
            >{{ text('backToDrivers') }}</a
          >
          @if (canManage()) {
            <a
              hlmBtn
              class="min-h-11 max-w-full"
              [routerLink]="['edit']"
              queryParamsHandling="preserve"
              >{{ text('editDriver') }}</a
            >
          }
        </div>
      </header>
      @if (!id()) {
        <p role="alert">{{ text('invalidDriverUrl') }}</p>
      } @else if (!canRead()) {
        <p role="alert">{{ config.deniedMessage?.[language()] ?? text('accessDriverDenied') }}</p>
      } @else if (store.detailStatus() === 'loading') {
        <p role="status">{{ text('loadingDriverDetails') }}</p>
      } @else if (store.detailStatus() === 'denied') {
        <p role="alert">{{ config.deniedMessage?.[language()] ?? text('accessDriverDenied') }}</p>
      } @else if (store.detailStatus() === 'missing') {
        <p role="alert">{{ text('driverNotFound') }}</p>
      } @else if (store.detailStatus() === 'error') {
        <p role="alert">{{ detailError() }}</p>
        <button hlmBtn variant="outline" (click)="reload()">{{ text('retry') }}</button>
      } @else if (store.detail(); as record) {
        <section class="mb-6 grid min-w-0 gap-4 lg:grid-cols-2">
          <article hlmCard class="min-w-0" aria-labelledby="personal-info-title">
            <header hlmCardHeader>
              <h3 hlmCardTitle id="personal-info-title">{{ text('person') }}</h3>
            </header>
            <div hlmCardContent>
              <dl class="grid min-w-0 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div class="min-w-0">
                  <dt class="text-muted-foreground text-sm">{{ text('mobileNumber') }}</dt>
                  <dd class="mt-1 text-base font-medium break-words">
                    {{ record.person.mobileNumber ?? '-' }}
                  </dd>
                </div>
                <div class="min-w-0">
                  <dt class="text-muted-foreground text-sm">{{ text('email') }}</dt>
                  <dd class="mt-1 text-base font-medium break-all">
                    {{ record.person.email ?? '-' }}
                  </dd>
                </div>
                <div class="min-w-0">
                  <dt class="text-muted-foreground text-sm">{{ text('city') }}</dt>
                  <dd class="mt-1 text-base font-medium break-words">
                    {{ record.person.cityName ?? '-' }}
                  </dd>
                </div>
                <div class="min-w-0 sm:col-span-2">
                  <dt class="text-muted-foreground text-sm">{{ text('address') }}</dt>
                  <dd class="mt-1 text-base font-medium break-words">
                    {{ record.person.address ?? '-' }}
                  </dd>
                </div>
              </dl>
            </div>
          </article>
          <article hlmCard class="min-w-0" aria-labelledby="driver-info-title">
            <header hlmCardHeader>
              <h3 hlmCardTitle id="driver-info-title">{{ text('driverInformation') }}</h3>
              <p class="text-muted-foreground text-sm">{{ text('licenceStoredNote') }}</p>
            </header>
            <div hlmCardContent>
              <div hlmSeparator decorative class="mb-4"></div>
              <dl>
                <dt class="text-muted-foreground text-sm">{{ text('licenceValue') }}</dt>
                <dd class="mt-1 text-base font-medium">{{ record.driver.driverLicenceLevelId }}</dd>
              </dl>
            </div>
          </article>
        </section>
        <section aria-labelledby="driver-documents-title">
          <div class="mb-4">
            <h2 id="driver-documents-title" class="text-xl font-semibold">
              {{ text('documents') }}
            </h2>
            <p class="text-muted-foreground mt-1 text-sm">
              {{ text('storedDocumentsNote') }}
            </p>
          </div>
          <div class="grid min-w-0 gap-4 sm:grid-cols-2">
            @for (document of documents; track document.key) {
              <div
                hlmAttachment
                [state]="record.driver[document.key] ? 'done' : 'idle'"
                orientation="vertical"
                class="w-full min-w-0"
              >
                @if (record.driver[document.key]; as image) {
                  <div
                    hlmAttachmentMedia
                    variant="image"
                    class="h-36 min-h-36 w-full min-w-0 rounded-md"
                  >
                    <img
                      [src]="image"
                      [alt]="localized(document.label)"
                      [title]="localized(document.currentLabel)"
                      class="h-full max-h-36 w-full max-w-full object-contain"
                    />
                  </div>
                } @else {
                  <div hlmAttachmentMedia class="h-36 min-h-36 w-full min-w-0 rounded-md">
                    <ng-icon name="lucideFileCode" aria-hidden="true" />
                  </div>
                }
                <div hlmAttachmentContent class="w-full min-w-0">
                  <span hlmAttachmentTitle>{{ localized(document.label) }}</span>
                  <span hlmAttachmentDescription>
                    {{ record.driver[document.key] ? text('currentDocument') : text('noDocument') }}
                  </span>
                </div>
              </div>
            }
          </div>
        </section>
      }
    </main>
  `,
})
export class DriverDetailPage {
  protected readonly config = inject(DRIVER_FEATURE)
  protected readonly language = inject(DRIVER_LANGUAGE)
  protected readonly canManage = inject(DRIVER_MANAGE)
  protected readonly store = inject(DriversStore)
  private readonly api = inject(DriversApi)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly id = computed(() => routeDriverId(this.params().get('id')))
  protected readonly canRead = computed(
    () => this.canManage() && !!this.session.user() && this.api.companyId() !== null,
  )
  protected readonly documents = driverDocuments
  protected readonly detailError = computed(() =>
    safeDriverError(this.store.detailError(), this.language(), 'detailFailedGeneric'),
  )
  protected readonly driverHeading = computed(() => {
    const person = this.store.detail()?.person
    return person ? `${person.firstName} ${person.lastName}`.trim() : this.text('driverDetails')
  })
  protected readonly identitySummary = computed(() => {
    const person = this.store.detail()?.person
    return person
      ? `${this.text('personDriverId')}: ${person.id} · ${this.text('nationalId')}: ${person.nationalId ?? '-'}`
      : ''
  })
  protected text(key: DriverTextKey): string {
    return driverText(this.language(), key)
  }
  protected localized(value: { en: string; fa: string }): string {
    return value[this.language()]
  }
  constructor() {
    effect(() => {
      const id = this.id()
      this.api.companyId()
      this.session.version()
      untracked(() => {
        this.store.clear()
        if (id && this.canRead()) this.store.loadDetail(id)
      })
    })
  }
  protected reload() {
    const id = this.id()
    if (id) this.store.loadDetail(id)
  }
}
