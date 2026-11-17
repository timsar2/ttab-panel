import { HttpClient } from '@angular/common/http'
import { computed, effect, inject, Injectable, Injector, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { SessionStore } from '@org/auth-data-access'
import { normalizeTransportError, unwrapTransport } from '@org/transport-http'
import { filter, firstValueFrom, map, Subscription, take } from 'rxjs'
import { decodeShiftTime, ShiftTime } from './scheduling.models'

@Injectable({ providedIn: 'root' })
export class ShiftTimesStore {
  private readonly http = inject(HttpClient)
  private readonly session = inject(SessionStore)
  private readonly injector = inject(Injector)
  private readonly activeCompanyId = computed(() => this.session.user()?.companyId ?? null)
  private subscription?: Subscription
  private companyId: number | null | undefined

  readonly times = signal<readonly ShiftTime[]>([])
  readonly byId = computed(() => new Map(this.times().map(item => [item.id, item])))
  readonly byName = computed(
    () => new Map(this.times().map(item => [normalizeShiftTimeName(item.name), item])),
  )
  readonly loaded = signal(false)
  readonly loading = signal(false)
  readonly error = signal<string | null>(null)

  constructor() {
    effect(onCleanup => {
      const companyId = this.activeCompanyId()
      if (companyId === this.companyId) return

      this.companyId = companyId
      this.subscription?.unsubscribe()
      this.times.set([])
      this.error.set(null)
      this.loaded.set(false)
      this.loading.set(companyId !== null)

      if (companyId === null) return

      const subscription = this.http
        .post<unknown>('/api/v1/shiftTimes', { companyId })
        .pipe(
          map(response =>
            unwrapTransport(response, result => {
              if (!Array.isArray(result)) throw new Error('Invalid shift-time list response.')
              return result.map(decodeShiftTime)
            }),
          ),
        )
        .subscribe({
          next: times => {
            if (this.companyId !== companyId) return
            this.times.set(times)
            this.loading.set(false)
            this.loaded.set(true)
          },
          error: error => {
            if (this.companyId !== companyId) return
            this.error.set(normalizeTransportError(error).message)
            this.loading.set(false)
            this.loaded.set(true)
          },
        })
      this.subscription = subscription
      onCleanup(() => subscription.unsubscribe())
    })
  }

  async ensureLoaded(): Promise<void> {
    const companyId = this.activeCompanyId()
    if (companyId === null) throw new Error('Company scope is unavailable for shift times.')

    const ready = computed(() => this.companyId === companyId && this.loaded())
    await firstValueFrom(
      toObservable(ready, { injector: this.injector }).pipe(filter(Boolean), take(1)),
    )
    if (this.error()) throw new Error(this.error() as string)
  }

  findByName(name: string | null | undefined): ShiftTime | undefined {
    if (!name) return undefined
    return this.byName().get(normalizeShiftTimeName(name))
  }
}

function normalizeShiftTimeName(name: string): string {
  return name.trim().replace(/^سرویس\s+/, '')
}
