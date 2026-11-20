import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop'
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
import { FormField, disabled, form, required } from '@angular/forms/signals'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { SessionStore } from '@org/auth-data-access'
import {
  RouteId,
  RouteStation,
  RoutesApi,
  RoutesStore,
  StationDraft,
  routeId,
} from '@org/transport-routes-data-access'
import {
  generateNeshanRouteGeoJson,
  NeshanLiveLocation,
  NeshanMapComponent,
  NeshanMapPoint,
} from '@org/shared-maps'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { ROUTE_FEATURE, ROUTE_LANGUAGE, ROUTE_MANAGE } from '../route.routes'
import { routeText } from '../route-text'

interface StationFormModel {
  id: number | null
  name: string
  address: string
  cityId: string
  lat: string
  lng: string
  orderNo: number
}

const emptyStation: StationFormModel = {
  id: null,
  name: '',
  address: '',
  cityId: '',
  lat: '',
  lng: '',
  orderNo: 1,
}

@Component({
  selector: 'lib-station-editor',
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    FormField,
    HlmButton,
    HlmFieldImports,
    NeshanMapComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-muted-foreground mb-1 text-sm">{{ routeText(language(), 'stations') }}</p>
          <h1 class="text-2xl font-semibold">
            {{
              isNew()
                ? language() === 'fa'
                  ? 'افزودن ایستگاه'
                  : 'Add station'
                : language() === 'fa'
                  ? 'ویرایش ایستگاه'
                  : 'Edit station'
            }}
          </h1>
        </div>
        <a hlmBtn variant="outline" class="min-h-11" [routerLink]="stationListLink()">{{
          routeText(language(), 'back')
        }}</a>
      </header>

      @if (invalidRoute() || invalidStation()) {
        <p role="alert">{{ routeText(language(), 'notFound') }}</p>
      } @else if (!hasScope()) {
        <p role="alert" class="rounded-md border p-4">{{ deniedMessage() }}</p>
      } @else if (loadingDetail()) {
        <p role="status">
          {{ language() === 'fa' ? 'در حال دریافت اطلاعات ایستگاه...' : 'Loading station...' }}
        </p>
      } @else {
        @if (error()) {
          <p role="alert" class="text-destructive mb-4">{{ error() }}</p>
        }
        <form
          class="bg-card grid max-w-3xl gap-5 rounded-xl border p-5 shadow-sm"
          (submit)="save($event)"
        >
          <div class="grid gap-5 sm:grid-cols-2">
            <div hlmField>
              <label hlmFieldLabel for="station-name">{{
                language() === 'fa' ? 'نام ایستگاه' : 'Station name'
              }}</label>
              <input class="min-h-11 w-full" id="station-name" [formField]="stationForm.name" />
              @if (stationForm.name().touched() && stationForm.name().invalid()) {
                <p class="text-destructive text-sm">
                  {{
                    language() === 'fa' ? 'نام ایستگاه الزامی است.' : 'Station name is required.'
                  }}
                </p>
              }
            </div>
            <div hlmField>
              <label hlmFieldLabel for="station-address">{{
                language() === 'fa' ? 'آدرس' : 'Address'
              }}</label>
              <input
                class="min-h-11 w-full"
                id="station-address"
                [formField]="stationForm.address"
              />
            </div>
            <div hlmField>
              <label hlmFieldLabel for="station-city">{{
                language() === 'fa' ? 'شناسه شهر' : 'City ID'
              }}</label>
              <input
                class="min-h-11 w-full"
                id="station-city"
                type="number"
                [formField]="stationForm.cityId"
              />
            </div>
            <div hlmField class="sm:col-span-2">
              <label hlmFieldLabel for="station-coordinate">{{
                language() === 'fa' ? 'موقعیت مکانی' : 'Station location'
              }}</label>
              <div class="flex gap-2">
                <input
                  class="bg-muted min-h-11 w-full"
                  id="station-coordinate"
                  type="text"
                  disabled
                  [value]="coordinateText()"
                  [placeholder]="
                    language() === 'fa'
                      ? 'برای انتخاب موقعیت نقشه را باز کنید'
                      : 'Open the map to select a location'
                  "
                />
                <button
                  hlmBtn
                  variant="outline"
                  type="button"
                  class="min-h-11 min-w-11"
                  [attr.aria-label]="
                    language() === 'fa' ? 'انتخاب موقعیت روی نقشه' : 'Select location on map'
                  "
                  (click)="openMap()"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    class="size-5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                  >
                    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </button>
              </div>
            </div>
            <div hlmField>
              <label hlmFieldLabel for="station-order">{{
                language() === 'fa' ? 'شماره ایستگاه' : 'Station order'
              }}</label>
              <input
                class="min-h-11 w-full"
                id="station-order"
                type="number"
                [formField]="stationForm.orderNo"
              />
            </div>
          </div>

          <section class="rounded-lg border p-4" aria-labelledby="station-order-heading">
            <div class="mb-3">
              <h2 id="station-order-heading" class="font-semibold">
                {{ language() === 'fa' ? 'ترتیب ایستگاه‌های مسیر' : 'Route station order' }}
              </h2>
              <p class="text-muted-foreground mt-1 text-sm">
                {{
                  language() === 'fa'
                    ? 'ایستگاه‌ها را بکشید و جابه‌جا کنید یا از دکمه‌های بالا و پایین استفاده کنید.'
                    : 'Drag stations to reorder them, or use the move up/down buttons.'
                }}
              </p>
            </div>
            <ol cdkDropList class="grid gap-2" (cdkDropListDropped)="drop($event)">
              @for (station of orderedStations(); track station.id; let i = $index) {
                <li
                  cdkDrag
                  class="bg-muted/40 flex min-h-12 items-center gap-2 rounded-md border p-2"
                  [class.border-primary]="station.id === currentStationKey()"
                >
                  <button
                    cdkDragHandle
                    type="button"
                    class="text-muted-foreground min-h-10 min-w-10 cursor-grab rounded border"
                    [attr.aria-label]="
                      language() === 'fa' ? 'گرفتن برای جابه‌جایی' : 'Drag to reorder'
                    "
                  >
                    ⠿
                  </button>
                  <span
                    class="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm"
                    >{{ i + 1 }}</span
                  >
                  <span class="min-w-0 flex-1 break-words">{{
                    station.id === currentStationKey()
                      ? stationForm.name().value() || station.name
                      : station.name
                  }}</span>
                  <button
                    hlmBtn
                    variant="outline"
                    type="button"
                    class="min-h-10 min-w-10 px-2"
                    [disabled]="i === 0"
                    [attr.aria-label]="language() === 'fa' ? 'انتقال به بالا' : 'Move up'"
                    (click)="move(i, -1)"
                  >
                    ↑
                  </button>
                  <button
                    hlmBtn
                    variant="outline"
                    type="button"
                    class="min-h-10 min-w-10 px-2"
                    [disabled]="i === orderedStations().length - 1"
                    [attr.aria-label]="language() === 'fa' ? 'انتقال به پایین' : 'Move down'"
                    (click)="move(i, 1)"
                  >
                    ↓
                  </button>
                </li>
              } @empty {
                <li role="status" class="text-muted-foreground">
                  {{
                    language() === 'fa'
                      ? 'هنوز ایستگاهی ثبت نشده است.'
                      : 'No stations have been added yet.'
                  }}
                </li>
              }
            </ol>
            @if (store.mapStatus() === 'loading') {
              <p class="text-muted-foreground mt-3 text-sm" role="status">
                {{
                  language() === 'fa'
                    ? 'در حال دریافت ترتیب ایستگاه‌ها...'
                    : 'Loading station order...'
                }}
              </p>
            } @else if (store.mapStatus() === 'error' || store.mapStatus() === 'denied') {
              <p class="text-destructive mt-3 text-sm" role="alert">
                {{
                  language() === 'fa'
                    ? 'ترتیب ایستگاه‌ها دریافت نشد؛ ذخیره غیرفعال است.'
                    : 'Station order could not be loaded; saving is disabled.'
                }}
              </p>
              <button
                hlmBtn
                variant="outline"
                type="button"
                class="mt-2 min-h-10"
                (click)="reloadStations()"
              >
                {{ routeText(language(), 'retry') }}
              </button>
            }
          </section>
          @if (canManage()) {
            <div class="flex flex-wrap gap-2">
              <button
                hlmBtn
                type="submit"
                class="min-h-11"
                [disabled]="saving() || stationForm().invalid() || store.mapStatus() !== 'ready'"
              >
                {{
                  saving()
                    ? language() === 'fa'
                      ? 'در حال ذخیره...'
                      : 'Saving...'
                    : language() === 'fa'
                      ? 'ذخیره ایستگاه و مسیر'
                      : 'Save station and route'
                }}
              </button>
              <a hlmBtn variant="outline" class="min-h-11" [routerLink]="stationListLink()">{{
                language() === 'fa' ? 'انصراف' : 'Cancel'
              }}</a>
            </div>
          }
        </form>
      }
      @if (mapOpen()) {
        <div class="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6">
          <button
            type="button"
            class="bg-background/80 absolute inset-0 size-full"
            [attr.aria-label]="language() === 'fa' ? 'بستن نقشه' : 'Close map'"
            (click)="closeMap()"
          ></button>
          <section
            role="dialog"
            aria-modal="true"
            [attr.aria-label]="
              language() === 'fa'
                ? 'انتخاب موقعیت ایستگاه روی نقشه'
                : 'Select station location on map'
            "
            class="bg-background relative z-10 flex h-[min(92dvh,52rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-2xl"
          >
            <header class="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <div>
                <h2 class="font-semibold">
                  {{ language() === 'fa' ? 'انتخاب موقعیت ایستگاه' : 'Choose station location' }}
                </h2>
                <p class="text-muted-foreground mt-1 text-sm">
                  {{
                    language() === 'fa'
                      ? 'روی نقشه کلیک کنید تا مختصات انتخاب شود.'
                      : 'Click the map to choose coordinates.'
                  }}
                </p>
              </div>
              <button hlmBtn variant="outline" type="button" class="min-h-11" (click)="closeMap()">
                {{ language() === 'fa' ? 'بستن' : 'Close' }}
              </button>
            </header>
            <div class="min-h-0 flex-1 p-3">
              <lib-neshan-map
                class="block h-full"
                [apiKey]="config.neshanMapApiKey ?? null"
                [serviceApiKey]="config.neshanServiceApiKey ?? null"
                [language]="language()"
                [selectLocation]="true"
                [fitContainer]="true"
                [liveLocation]="mapLocation()"
                [followLive]="true"
                (locationSelect)="pickLocation($event)"
              />
            </div>
            <footer class="flex flex-wrap items-center justify-between gap-3 border-t p-4">
              <span class="text-muted-foreground text-sm" aria-live="polite">{{
                mapLocation()
                  ? mapCoordinateText()
                  : language() === 'fa'
                    ? 'موقعیتی انتخاب نشده است'
                    : 'No location selected'
              }}</span>
              <div class="flex gap-2">
                <button
                  hlmBtn
                  variant="outline"
                  type="button"
                  class="min-h-11"
                  (click)="closeMap()"
                >
                  {{ language() === 'fa' ? 'انصراف' : 'Cancel' }}
                </button>
                <button
                  hlmBtn
                  type="button"
                  class="min-h-11"
                  [disabled]="!mapLocation()"
                  (click)="applyMapLocation()"
                >
                  {{ language() === 'fa' ? 'ثبت موقعیت' : 'Use location' }}
                </button>
              </div>
            </footer>
          </section>
        </div>
      }
    </main>
  `,
})
export class StationEditor {
  protected readonly language = inject(ROUTE_LANGUAGE)
  protected readonly canManage = inject(ROUTE_MANAGE)
  protected readonly store = inject(RoutesStore)
  private readonly api = inject(RoutesApi)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly config = inject(ROUTE_FEATURE)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly directionId = computed(() => this.readId(this.params().get('id')))
  private readonly stationId = computed(() => this.readStationId(this.params().get('stationId')))
  protected readonly isNew = computed(() => this.params().get('stationId') === null)
  protected readonly invalidRoute = computed(() => this.directionId() === null)
  protected readonly invalidStation = computed(() => !this.isNew() && this.stationId() === null)
  protected readonly loadingDetail = signal(false)
  protected readonly saving = signal(false)
  protected readonly error = signal('')
  protected readonly mapOpen = signal(false)
  protected readonly mapLocation = signal<NeshanLiveLocation | null>(null)
  protected readonly coordinateText = computed(() => {
    const { lat, lng } = this.draft()
    return lat !== '' && lng !== '' ? `${lat}, ${lng}` : ''
  })
  protected readonly mapCoordinateText = computed(() => {
    const point = this.mapLocation()
    return point ? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}` : ''
  })
  protected readonly orderedStations = signal<RouteStation[]>([])
  protected readonly draft = signal<StationFormModel>({ ...emptyStation })
  protected readonly stationForm = form(this.draft, schema => {
    disabled(schema, () => this.saving() || !this.canManage())
    disabled(schema.orderNo, () => true)
    required(schema.name)
  })
  protected readonly currentStationKey = computed(() => this.stationId() ?? -1)
  protected readonly stationListLink = computed(() => [
    '/client',
    this.api.companyId(),
    'direction',
    'detail',
    this.directionId(),
    'stations',
  ])
  protected readonly hasScope = computed(
    () => !!this.session.user() && this.api.companyId() !== null,
  )
  protected readonly deniedMessage = computed(
    () => this.config.deniedMessage?.[this.language()] ?? routeText(this.language(), 'denied'),
  )
  private loadedKey = ''

  constructor() {
    effect(() => {
      const directionId = this.directionId()
      const stationId = this.stationId()
      const companyId = this.api.companyId()
      const version = this.session.version()
      const key = `${companyId ?? ''}:${version}:${directionId ?? ''}:${stationId ?? 'new'}`
      if (!directionId || !this.hasScope() || key === this.loadedKey) return
      this.loadedKey = key
      this.loadingDetail.set(stationId !== null)
      this.error.set('')
      this.draft.set({ ...emptyStation })
      untracked(() => {
        this.store.loadStations(directionId)
        if (stationId === null) {
          this.loadingDetail.set(false)
          return
        }
        this.api.station(stationId, directionId).subscribe({
          next: station => {
            if (!station) {
              this.error.set(routeText(this.language(), 'notFound'))
              return
            }
            this.draft.set({
              id: station.id,
              name: station.name,
              address: station.address ?? '',
              cityId: station.cityId == null ? '' : String(station.cityId),
              lat: station.lat == null ? '' : String(station.lat),
              lng: station.lng == null ? '' : String(station.lng),
              orderNo: station.orderNo,
            })
          },
          error: () => {
            this.loadingDetail.set(false)
            this.error.set(routeText(this.language(), 'stationsFailed'))
          },
          complete: () => this.loadingDetail.set(false),
        })
      })
    })
    effect(() => {
      const stations = this.store.stations()
      const directionId = this.directionId()
      if (!stations || !directionId) return
      const draft = untracked(this.draft)
      const currentId = this.stationId()
      const rows = [...stations]
      if (currentId === null)
        rows.push({
          id: -1,
          directionId,
          name: draft.name || (this.language() === 'fa' ? 'ایستگاه جدید' : 'New station'),
          address: null,
          orderNo: rows.length + 1,
          provinceName: null,
          cityName: null,
          lat: null,
          lng: null,
        })
      else {
        const row = rows.find(item => item.id === currentId)
        if (row) rows[rows.indexOf(row)] = { ...row, name: draft.name || row.name }
      }
      this.orderedStations.set(rows.sort((a, b) => a.orderNo - b.orderNo))
      const index = rows.findIndex(item => item.id === (currentId ?? -1))
      if (index >= 0 && this.draft().orderNo !== index + 1)
        this.stationForm.orderNo().value.set(index + 1)
    })
  }

  protected routeText = routeText
  protected drop(event: CdkDragDrop<RouteStation[]>) {
    this.reorder(event.previousIndex, event.currentIndex)
  }
  protected move(index: number, delta: number) {
    this.reorder(index, index + delta)
  }
  protected openMap() {
    const draft = this.draft()
    const lat = Number(draft.lat)
    const lng = Number(draft.lng)
    this.mapLocation.set(
      Number.isFinite(lat) && Number.isFinite(lng) && draft.lat !== '' && draft.lng !== ''
        ? { lat, lng }
        : null,
    )
    this.mapOpen.set(true)
  }
  protected pickLocation(coordinate: { readonly lat: number; readonly lng: number }) {
    this.mapLocation.set({ ...coordinate })
  }
  protected applyMapLocation() {
    const location = this.mapLocation()
    if (!location) return
    this.stationForm.lat().value.set(String(location.lat))
    this.stationForm.lng().value.set(String(location.lng))
    this.mapOpen.set(false)
  }
  protected closeMap() {
    this.mapOpen.set(false)
  }
  protected reloadStations() {
    const directionId = this.directionId()
    if (directionId) this.store.loadStations(directionId)
  }
  protected save(event: Event) {
    event.preventDefault()
    const directionId = this.directionId()
    if (
      !directionId ||
      !this.canManage() ||
      this.saving() ||
      this.stationForm().invalid() ||
      this.store.mapStatus() !== 'ready'
    )
      return
    const model = this.draft()
    const lat = model.lat === '' ? null : Number(model.lat)
    const lng = model.lng === '' ? null : Number(model.lng)
    const draft: StationDraft = {
      id: model.id,
      directionId,
      name: model.name.trim(),
      address: model.address.trim(),
      cityId: model.cityId ? Number(model.cityId) : null,
      coordinate: lat === null || lng === null ? null : { lat, lng },
      orderNo: model.orderNo,
    }
    this.saving.set(true)
    this.error.set('')
    void this.saveStationAndRoute(directionId, draft)
  }

  private async saveStationAndRoute(directionId: RouteId, draft: StationDraft) {
    this.saving.set(true)
    this.error.set('')
    try {
      const stations = this.orderedStations().map((station, index) => {
        const current = station.id === (draft.id ?? -1)
        return {
          id: current ? (draft.id ?? station.id) : station.id,
          order: index + 1,
          name: current ? draft.name : station.name,
          lat: current ? (draft.coordinate?.lat ?? null) : station.lat,
          lng: current ? (draft.coordinate?.lng ?? null) : station.lng,
        } satisfies NeshanMapPoint
      })
      const validPoints = stations.filter(point => point.lat !== null && point.lng !== null)
      const routeGeometry =
        validPoints.length >= 2
          ? await generateNeshanRouteGeoJson(
              validPoints,
              this.config.neshanServiceApiKey?.trim() ?? '',
            )
          : null

      await firstValueFrom(this.api.saveStation(directionId, draft))
      const route = await firstValueFrom(this.api.detail(directionId))
      const companyId = this.api.companyId()
      if (!route || companyId === null)
        throw new Error('The direction could not be loaded for its route update.')
      await firstValueFrom(
        this.api.save(directionId, {
          companyId,
          name: route.name,
          departureTime: route.departureTime,
          routeGeometry,
        }),
      )
      this.store.loadStations(directionId)
      this.store.loadDetail(directionId)
      void this.router.navigate(this.stationListLink())
    } catch {
      this.error.set(
        this.language() === 'fa'
          ? 'ذخیره ایستگاه یا به‌روزرسانی مسیر ناموفق بود. وضعیت ایستگاه را پیش از تلاش دوباره بررسی کنید.'
          : 'Saving the station or updating the route failed. Check the station before retrying.',
      )
    } finally {
      this.saving.set(false)
    }
  }

  private reorder(from: number, to: number) {
    if (to < 0 || to >= this.orderedStations().length) return
    const rows = [...this.orderedStations()]
    moveItemInArray(rows, from, to)
    this.orderedStations.set(rows)
    const current = rows.findIndex(item => item.id === this.currentStationKey())
    if (current >= 0) this.stationForm.orderNo().value.set(current + 1)
  }
  private readId(value: string | null): RouteId | null {
    if (!value || !/^[1-9]\d*$/.test(value)) return null
    try {
      return routeId(Number(value))
    } catch {
      return null
    }
  }
  private readStationId(value: string | null): number | null {
    if (!value || !/^[1-9]\d*$/.test(value)) return null
    const id = Number(value)
    return Number.isSafeInteger(id) ? id : null
  }
}
