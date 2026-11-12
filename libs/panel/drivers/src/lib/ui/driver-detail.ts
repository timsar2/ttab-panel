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
import { SessionStore } from '@org/auth-data-access'
import { DriversApi, DriversStore, driverId } from '@org/transport-drivers-data-access'
import { HlmButton } from '@spartan-ng/helm/button'
import { DRIVER_FEATURE, DRIVER_MANAGE } from '../driver.routes'

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
  { key: 'nationalCardFrontImage', label: 'National card front' },
  { key: 'nationalCardBehindImage', label: 'National card back' },
  { key: 'drivingLicenceImage', label: 'Driving licence' },
  { key: 'driverSmartCardImage', label: 'Driver smart card' },
] as const

@Component({
  selector: 'lib-driver-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButton],
  providers: [DriversStore],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <header class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-muted-foreground mb-1 text-sm">Driver record</p>
        <h1 class="text-2xl font-semibold">Driver details</h1>
      </div>
      <a
        hlmBtn
        variant="outline"
        class="min-h-11"
        [routerLink]="['..']"
        queryParamsHandling="preserve"
        >Back to drivers</a
      >
    </header>
    @if (!id()) {
      <p role="alert">Invalid driver URL.</p>
    } @else if (!canRead()) {
      <p role="alert">{{ config.deniedMessage ?? 'You do not have access to this driver.' }}</p>
    } @else if (store.detailStatus() === 'loading') {
      <p role="status">Loading driver details...</p>
    } @else if (store.detailStatus() === 'denied') {
      <p role="alert">{{ config.deniedMessage ?? 'You do not have access to this driver.' }}</p>
    } @else if (store.detailStatus() === 'missing') {
      <p role="alert">Driver not found.</p>
    } @else if (store.detailStatus() === 'error') {
      <p role="alert">{{ store.detailError()?.message }}</p>
      <button hlmBtn variant="outline" (click)="reload()">Retry</button>
    } @else if (store.detail(); as record) {
      <section
        class="bg-card text-card-foreground border-border mb-6 border p-5"
        aria-labelledby="driver-identity-title"
      >
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="driver-identity-title" class="text-xl font-semibold">
            {{ record.person.firstName }} {{ record.person.lastName }}
          </h2>
          @if (canManage()) {
            <a hlmBtn class="min-h-11" [routerLink]="['edit']" queryParamsHandling="preserve"
              >Edit driver</a
            >
          }
        </div>
        <dl class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-muted-foreground text-sm">Person / driver ID</dt>
            <dd>{{ record.person.id }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">National ID</dt>
            <dd>{{ record.person.nationalId ?? '-' }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">Mobile number</dt>
            <dd>{{ record.person.mobileNumber ?? '-' }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">Email</dt>
            <dd class="break-all">{{ record.person.email ?? '-' }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">City</dt>
            <dd>{{ record.person.cityName ?? '-' }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-sm">Licence value</dt>
            <dd>{{ record.driver.driverLicenceLevelId }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-muted-foreground text-sm">Address</dt>
            <dd>{{ record.person.address ?? '-' }}</dd>
          </div>
        </dl>
      </section>
      <section aria-labelledby="driver-documents-title">
        <h2 id="driver-documents-title" class="mb-2 text-xl font-semibold">Documents</h2>
        <p class="text-muted-foreground mb-5 text-sm">
          Stored documents do not indicate approval, qualification or expiry status.
        </p>
        <div class="grid gap-5 sm:grid-cols-2">
          @for (document of documents; track document.key) {
            <figure class="border-border bg-card text-card-foreground border p-4">
              <figcaption class="mb-3 font-medium">{{ document.label }}</figcaption>
              @if (record.driver[document.key]; as image) {
                <img
                  [src]="image"
                  [alt]="document.label"
                  class="max-h-60 max-w-full object-contain"
                />
              } @else {
                <p class="text-muted-foreground text-sm">No document on record.</p>
              }
            </figure>
          }
        </div>
      </section>
    }
  `,
})
export class DriverDetailPage {
  protected readonly config = inject(DRIVER_FEATURE)
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
    () => !!this.session.user() && this.api.companyId() !== null,
  )
  protected readonly documents = driverDocuments
  constructor() {
    effect(() => {
      const id = this.id()
      this.api.companyId()
      this.session.version()
      untracked(() => {
        this.store.clear()
        if (id) this.store.loadDetail(id)
      })
    })
  }
  protected reload() {
    const id = this.id()
    if (id) this.store.loadDetail(id)
  }
}
