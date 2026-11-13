import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { DriversApi, driverId } from '@org/transport-drivers-data-access'
import {
  CAR_DOCUMENT_FIELDS,
  VehicleId,
  VehiclesApi,
  VehiclesStore,
  carId,
} from '@org/transport-vehicles-data-access'
import { ConfirmDialog } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { Subscription } from 'rxjs'
import { VEHICLE_LANGUAGE, VEHICLE_MANAGE } from '../vehicle.routes'
import { VEHICLE_TEXT, vehicleText } from '../vehicle-text'

@Component({
  selector: 'lib-vehicle-detail',
  imports: [ConfirmDialog, HlmButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-muted-foreground mb-1 text-sm">{{ text('vehicles') }}</p>
          <h1 class="text-2xl font-semibold">{{ record()?.carPlate ?? text('vehicleDetails') }}</h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <a
            hlmBtn
            variant="outline"
            class="min-h-11"
            [routerLink]="['..']"
            queryParamsHandling="preserve"
            >{{ text('back') }}</a
          >
          @if (record() && canManage()) {
            <a
              hlmBtn
              variant="outline"
              class="min-h-11"
              [routerLink]="['edit']"
              queryParamsHandling="preserve"
              >{{ text('editCar') }}</a
            >
            <button
              hlmBtn
              variant="destructive"
              class="min-h-11"
              type="button"
              [disabled]="store.mutating()"
              (click)="deleteOpen.set(true)"
            >
              {{ text('deleteCar') }}
            </button>
          }
        </div>
      </header>
      @switch (store.detailStatus()) {
        @case ('loading') {
          <p role="status">{{ text('detailLoading') }}</p>
        }
        @case ('denied') {
          <p role="alert">{{ text('denied') }}</p>
        }
        @case ('missing') {
          <p role="alert">{{ text('notFound') }}</p>
        }
        @case ('error') {
          <p role="alert">{{ text('loadFailed') }}</p>
          <button hlmBtn variant="outline" (click)="reload()">{{ text('retry') }}</button>
        }
        @case ('ready') {
          @if (record(); as vehicle) {
            <section
              class="grid min-w-0 gap-3 sm:grid-cols-2"
              [attr.aria-label]="text('vehicleDetails')"
            >
              <article class="rounded-lg border p-4">
                <h2 class="text-muted-foreground text-sm">{{ text('driver') }}</h2>
                <p class="mt-1 font-medium break-words">
                  {{ driverName() ?? (driverError() ? text('denied') : vehicle.driverId) }}
                </p>
              </article>
              <article class="rounded-lg border p-4">
                <h2 class="text-muted-foreground text-sm">{{ text('vehicleType') }}</h2>
                <p class="mt-1 font-medium break-words">{{ typeName() }}</p>
              </article>
              <article class="rounded-lg border p-4">
                <h2 class="text-muted-foreground text-sm">{{ text('carPlate') }}</h2>
                <p class="mt-1 font-mono font-semibold">{{ vehicle.carPlate }}</p>
              </article>
              <article class="rounded-lg border p-4">
                <h2 class="text-muted-foreground text-sm">{{ text('color') }}</h2>
                <p class="mt-1 font-medium">{{ vehicle.color || '-' }}</p>
              </article>
              <article class="rounded-lg border p-4">
                <h2 class="text-muted-foreground text-sm">{{ text('produnctionYear') }}</h2>
                <p class="mt-1 font-medium">{{ vehicle.produnctionYear ?? '-' }}</p>
              </article>
              <article class="rounded-lg border p-4">
                <h2 class="text-muted-foreground text-sm">{{ text('capacity') }}</h2>
                <p class="mt-1 font-medium">{{ vehicle.capacity ?? '-' }}</p>
              </article>
              @for (field of documentFields; track field) {
                @if (vehicle[field]; as image) {
                  <article class="rounded-lg border p-4 sm:col-span-2">
                    <h2 class="text-muted-foreground mb-3 text-sm">{{ documentLabel(field) }}</h2>
                    <a
                      [href]="image"
                      target="_blank"
                      rel="noopener noreferrer"
                      [attr.aria-label]="documentLabel(field)"
                    >
                      <img
                        class="max-h-72 max-w-full rounded-md border object-contain"
                        [src]="image"
                        alt=""
                        loading="lazy"
                        referrerpolicy="no-referrer"
                      />
                    </a>
                  </article>
                }
              }
            </section>
          }
          @if (store.mutationError()) {
            <p class="text-destructive mt-4" role="alert">{{ text('deleteFailed') }}</p>
          }
        }
        @default {
          <p role="alert">{{ invalidId() ? text('notFound') : text('denied') }}</p>
        }
      }
      <lib-confirm-dialog
        [(open)]="deleteOpen"
        [title]="text('deleteTitle')"
        [description]="text('deleteDescription')"
        [confirmLabel]="text('deleteCar')"
        [cancelLabel]="text('keepEditing')"
        [busy]="store.mutating()"
        (confirmed)="remove()"
      />
    </main>
  `,
})
export class VehicleDetailPage {
  protected readonly store = inject(VehiclesStore)
  protected readonly language = inject(VEHICLE_LANGUAGE)
  protected readonly canManage = inject(VEHICLE_MANAGE)
  private readonly api = inject(VehiclesApi)
  private readonly drivers = inject(DriversApi)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  private readonly recordId = computed(() => this.readId(this.params().get('id')))
  protected readonly invalidId = computed(() => this.recordId() === null)
  protected readonly record = this.store.detail
  protected readonly deleteOpen = signal(false)
  protected readonly documentFields = CAR_DOCUMENT_FIELDS
  protected readonly driverName = signal<string | null>(null)
  protected readonly driverError = signal(false)
  protected readonly typeName = computed(
    () =>
      this.store.types()?.find(type => type.id === this.record()?.vehicleTypeId)?.model ??
      `${vehicleText(this.language(), 'vehicleType')} ${this.record()?.vehicleTypeId ?? ''}`,
  )
  private driverLookupId: number | null = null
  private driverRead?: Subscription

  constructor() {
    effect(() => {
      this.api.companyId()
      this.sessionVersion()
      const id = this.recordId()
      untracked(() => {
        this.driverRead?.unsubscribe()
        this.driverRead = undefined
        this.driverLookupId = null
        this.driverName.set(null)
        this.driverError.set(false)
        this.store.clearMutation()
        this.store.loadTypes()
        if (id) this.store.loadDetail(id)
        else this.store.clearDetail()
      })
    })
    effect(() => {
      const detail = this.store.detail()
      if (
        !detail ||
        this.store.detailStatus() !== 'ready' ||
        this.driverLookupId === detail.driverId
      )
        return
      this.driverLookupId = detail.driverId
      untracked(() => this.loadDriver(detail.driverId))
    })
    effect(() => {
      if (!this.store.deleteOutcome()) return
      untracked(
        () =>
          void this.router.navigate(['..'], {
            relativeTo: this.route,
            queryParamsHandling: 'preserve',
          }),
      )
    })
  }

  protected text(key: keyof typeof VEHICLE_TEXT) {
    return vehicleText(this.language(), key)
  }
  protected documentLabel(field: (typeof CAR_DOCUMENT_FIELDS)[number]) {
    return this.text(field)
  }
  protected reload() {
    const id = this.recordId()
    if (id) this.store.loadDetail(id)
  }
  protected remove() {
    const id = this.recordId()
    if (id && this.canManage()) this.store.delete(id)
  }

  private loadDriver(id: number) {
    this.driverName.set(null)
    this.driverError.set(false)
    this.driverRead = this.drivers.detail(driverId(id)).subscribe({
      next: driver => {
        if (!driver || driver.driver.id !== id) {
          this.driverError.set(true)
          return
        }
        this.driverName.set(
          [driver.person.firstName, driver.person.lastName].filter(Boolean).join(' ') || null,
        )
      },
      error: () => this.driverError.set(true),
    })
  }

  private readId(value: string | null): VehicleId | null {
    if (!value || !/^[1-9]\d*$/.test(value)) return null
    try {
      return carId(Number(value))
    } catch {
      return null
    }
  }
  private sessionVersion() {
    return this.session.version()
  }
}
