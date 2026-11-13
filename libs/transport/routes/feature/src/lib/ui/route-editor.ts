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
import { FormField, disabled, form, required, submit, validate } from '@angular/forms/signals'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import {
  RouteId,
  RoutesApi,
  RoutesStore,
  isTimeValue,
  routeId,
  timeInputValue,
} from '@org/transport-routes-data-access'
import { ConfirmDialog } from '@org/ui-forms'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmFieldImports } from '@spartan-ng/helm/field'
import { ROUTE_FEATURE, ROUTE_LANGUAGE, ROUTE_MANAGE } from '../route.routes'
import { ROUTE_TEXT, routeText } from '../route-text'

interface RouteFormModel {
  name: string
  departureTime: string
}

const blankRoute: RouteFormModel = { name: '', departureTime: '08:00' }

@Component({
  selector: 'lib-route-editor',
  imports: [ConfirmDialog, FormField, HlmButton, HlmFieldImports, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-muted-foreground mb-1 text-sm">{{ text('routes') }}</p>
          <h1 class="text-2xl font-semibold">
            {{ isNew() ? text('addRoute') : text('editRoute') }}
          </h1>
        </div>
        <div class="flex gap-2">
          <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['..']">{{ text('back') }}</a>
          @if (!isNew()) {
            <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['stations']">{{
              text('stations')
            }}</a>
            <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['lines']">{{
              text('lines')
            }}</a>
          }
        </div>
      </header>

      @if (invalidId()) {
        <p role="alert">{{ text('notFound') }}</p>
      } @else if (!hasCompany()) {
        <p role="alert" class="rounded-md border p-4">{{ deniedMessage() }}</p>
      } @else if (!isNew() && store.detailStatus() === 'loading') {
        <p role="status">{{ text('detailLoading') }}</p>
      } @else if (!isNew() && store.detailStatus() === 'denied') {
        <p role="alert">{{ deniedMessage() }}</p>
      } @else if (!isNew() && store.detailStatus() === 'missing') {
        <p role="alert">{{ text('notFound') }}</p>
      } @else if (!isNew() && store.detailStatus() === 'error') {
        <p role="alert">{{ text('failed') }}</p>
        <button hlmBtn variant="outline" type="button" (click)="reload()">
          {{ text('retry') }}
        </button>
      } @else {
        @if (store.saveError()) {
          <p role="alert" class="text-destructive mb-4">{{ saveErrorMessage() }}</p>
        }
        @if (store.saveOutcome() === 'unconfirmed') {
          <p role="alert" class="border-destructive/40 bg-destructive/5 mb-4 rounded-md border p-4">
            {{ text('saveUnconfirmed') }}
          </p>
        }
        @if (!isNew() && !editing()) {
          <dl class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-lg border p-4">
              <dt class="text-muted-foreground text-sm">{{ text('routeName') }}</dt>
              <dd class="mt-1 font-medium">{{ store.route()?.name }}</dd>
            </div>
            <div class="rounded-lg border p-4">
              <dt class="text-muted-foreground text-sm">{{ text('departureTime') }}</dt>
              <dd class="mt-1 font-medium">{{ store.route()?.departureTime }}</dd>
            </div>
          </dl>
        } @else {
          <form class="grid max-w-2xl gap-5" (submit)="save($event)">
            <div hlmField>
              <label hlmFieldLabel for="route-name">{{ text('routeName') }}</label>
              <input
                class="min-h-11 w-full"
                id="route-name"
                type="text"
                [formField]="routeForm.name"
              />
              @if (routeForm.name().touched() && routeForm.name().invalid()) {
                <p class="text-destructive text-sm">
                  {{ language() === 'fa' ? 'نام مسیر الزامی است.' : 'Route name is required.' }}
                </p>
              }
            </div>
            <div hlmField>
              <label hlmFieldLabel for="route-departure">{{ text('departureTime') }}</label>
              <input
                class="min-h-11 w-full"
                id="route-departure"
                type="time"
                step="1"
                [formField]="routeForm.departureTime"
              />
              @if (routeForm.departureTime().touched() && routeForm.departureTime().invalid()) {
                <p class="text-destructive text-sm">
                  {{
                    language() === 'fa' ? 'زمان معتبر وارد کنید.' : 'Enter a valid departure time.'
                  }}
                </p>
              }
              <p class="text-muted-foreground text-xs">
                {{
                  language() === 'fa'
                    ? 'این زمان، زمان حرکت از ایستگاه اول است و با زمان شیفت متفاوت است.'
                    : 'This is the first-station departure, distinct from Shift Time.'
                }}
              </p>
            </div>
            @if (canManage()) {
              <div class="flex flex-wrap gap-2">
                <button
                  hlmBtn
                  class="min-h-11"
                  type="submit"
                  [disabled]="store.saving() || routeForm().invalid()"
                >
                  {{ store.saving() ? text('detailLoading') : text('save') }}
                </button>
                <button hlmBtn variant="outline" class="min-h-11" type="button" (click)="cancel()">
                  {{ language() === 'fa' ? 'انصراف' : 'Cancel' }}
                </button>
              </div>
            }
          </form>
        }
        @if (!isNew() && !editing() && canManage()) {
          <button hlmBtn class="mt-5 min-h-11" type="button" (click)="startEditing()">
            {{ text('editRoute') }}
          </button>
        }
      }
      <lib-confirm-dialog
        [(open)]="leaveOpen"
        [title]="language() === 'fa' ? 'تغییرات کنار گذاشته شود؟' : 'Discard route changes?'"
        [description]="
          language() === 'fa'
            ? 'تغییرات ذخیره‌نشده مسیر از بین می‌روند.'
            : 'Unsaved Route edits will be lost.'
        "
        [confirmLabel]="language() === 'fa' ? 'صرف‌نظر' : 'Discard changes'"
        [cancelLabel]="language() === 'fa' ? 'ادامه ویرایش' : 'Keep editing'"
        [busy]="store.saving()"
        (confirmed)="finishLeave(true)"
        (canceled)="finishLeave(false)"
      />
    </main>
  `,
})
export class RouteEditor {
  protected readonly config = inject(ROUTE_FEATURE)
  protected readonly language = inject(ROUTE_LANGUAGE)
  protected readonly canManage = inject(ROUTE_MANAGE)
  protected readonly store = inject(RoutesStore)
  private readonly api = inject(RoutesApi)
  private readonly session = inject(SessionStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  protected readonly id = computed(() => this.readId(this.params().get('id')))
  protected readonly isNew = computed(() => this.params().get('id') === null)
  protected readonly invalidId = computed(() => !this.isNew() && this.id() === null)
  protected readonly draft = signal<RouteFormModel>({ ...blankRoute })
  protected readonly routeForm = form(this.draft, schema => {
    disabled(schema.name, () => this.store.saving() || !this.canManage())
    disabled(schema.departureTime, () => this.store.saving() || !this.canManage())
    required(schema.name, { message: 'Route name is required.' })
    required(schema.departureTime, { message: 'Departure time is required.' })
    validate(schema.departureTime, ({ value }) =>
      isTimeValue(value())
        ? null
        : {
            kind: 'invalidTime',
            message: 'Enter a valid first-station departure time.',
          },
    )
  })
  protected readonly editing = signal(false)
  protected readonly leaveOpen = signal(false)
  protected readonly hasCompany = computed(
    () => this.session.user() !== null && this.api.companyId() !== null,
  )
  protected readonly deniedMessage = computed(
    () => this.config.deniedMessage?.[this.language()] ?? this.text('denied'),
  )
  private readonly loadedRouteId = signal<RouteId | null | undefined>(undefined)
  private loadedScopeKey = ''
  private readonly submitted = signal(false)
  private saved = false
  private pendingLeave: Promise<boolean> | null = null
  private resolveLeave: ((discard: boolean) => void) | null = null

  constructor() {
    effect(() => {
      this.api.companyId()
      const companyId = this.api.companyId()
      const version = this.session.version()
      const id = this.id()
      const isNew = this.isNew()
      const scopeKey = `${companyId ?? ''}:${version}`
      if (
        this.loadedRouteId() === id &&
        this.loadedRouteId() !== undefined &&
        this.loadedScopeKey === scopeKey
      )
        return
      this.loadedRouteId.set(id)
      this.loadedScopeKey = scopeKey
      untracked(() => {
        this.saved = false
        this.submitted.set(false)
        this.editing.set(isNew)
        this.store.clearSaveStatus()
        if (id) this.store.loadDetail(id)
        else {
          this.store.clearDetail()
          this.draft.set({ ...blankRoute })
        }
      })
    })
    effect(() => {
      const route = this.store.route()
      if (!route || this.store.detailStatus() !== 'ready' || route.id !== this.id()) return
      untracked(() => {
        this.draft.set({ name: route.name, departureTime: timeInputValue(route.departureTime) })
        this.editing.set(false)
      })
    })
    effect(() => {
      const submitted = this.submitted()
      const outcome = this.store.saveOutcome()
      const savedId = this.store.savedId()
      if (!submitted) return
      if (outcome === 'confirmed' && savedId !== null) {
        untracked(() => {
          this.saved = true
          this.submitted.set(false)
          void this.router.navigate(['detail', savedId], {
            relativeTo: this.route.parent,
            queryParamsHandling: 'preserve',
          })
        })
      } else if (outcome === 'unconfirmed' || (this.store.saveError() && !this.store.saving())) {
        untracked(() => this.submitted.set(false))
      }
    })
  }

  protected text(key: keyof typeof ROUTE_TEXT) {
    return routeText(this.language(), key)
  }
  protected saveErrorMessage() {
    const error = this.store.saveError()
    return error?.code === 'routes-access-denied' || error?.status === 401 || error?.status === 403
      ? this.deniedMessage()
      : this.text('saveFailed')
  }
  protected startEditing() {
    this.editing.set(true)
    this.routeForm.name().value.set(this.store.route()?.name ?? '')
    this.routeForm
      .departureTime()
      .value.set(timeInputValue(this.store.route()?.departureTime ?? ''))
  }
  protected save(event: Event) {
    event.preventDefault()
    if (!this.canManage() || this.store.saving()) return
    void submit(this.routeForm, async () => {
      const companyId = this.api.companyId()
      if (companyId === null) return
      const id = this.id()
      this.submitted.set(true)
      if (!this.store.save(id, { companyId, ...this.draft() })) this.submitted.set(false)
    })
  }
  protected cancel() {
    const route = this.store.route()
    if (route) {
      this.draft.set({ name: route.name, departureTime: timeInputValue(route.departureTime) })
      this.editing.set(false)
    } else {
      void this.router.navigate(['..'], { relativeTo: this.route, queryParamsHandling: 'preserve' })
    }
  }
  protected reload() {
    const id = this.id()
    if (id) this.store.loadDetail(id)
  }
  confirmLeave() {
    if (this.saved || !this.routeForm().dirty() || this.store.saving()) return true
    if (this.pendingLeave) return this.pendingLeave
    this.leaveOpen.set(true)
    this.pendingLeave = new Promise(resolve => {
      this.resolveLeave = resolve
    })
    return this.pendingLeave
  }
  protected finishLeave(discard: boolean) {
    this.leaveOpen.set(false)
    const resolve = this.resolveLeave
    this.resolveLeave = null
    this.pendingLeave = null
    resolve?.(discard)
  }
  private readId(value: string | null): RouteId | null {
    if (!value || !/^[1-9]\d*$/.test(value)) return null
    try {
      return routeId(Number(value))
    } catch {
      return null
    }
  }
}
