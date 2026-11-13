import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import {
  DepartureTimeId,
  DepartureTimesStore,
  departureTimeId,
} from '@org/transport-departure-times-data-access'
import { HlmButton } from '@spartan-ng/helm/button'
import { DEPARTURE_TIME_FEATURE, DEPARTURE_TIME_MANAGE } from '../departure-time.routes'

@Component({
  selector: 'lib-departure-time-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButton],
  providers: [DepartureTimesStore],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">Departure time details</h1>
      @if (canManage()) {
        <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['edit']">Edit</a>
      }
    </header>
    @switch (store.detailStatus()) {
      @case ('loading') {
        <p role="status">Loading departure time…</p>
      }
      @case ('ready') {
        @if (store.detail(); as time) {
          <dl class="grid max-w-2xl gap-4 sm:grid-cols-2">
            <div>
              <dt class="font-medium">Name</dt>
              <dd>{{ time.name }}</dd>
            </div>
            <div>
              <dt class="font-medium">Time</dt>
              <dd>{{ time.shiftTime }}</dd>
            </div>
          </dl>
        }
      }
      @case ('missing') {
        <p role="alert">Departure time not found.</p>
      }
      @case ('denied') {
        <p role="alert">
          {{ config.deniedMessage ?? 'You do not have access to departure times in this company.' }}
        </p>
      }
      @case ('error') {
        <p role="alert">{{ store.detailError()?.message ?? 'Unable to load departure time.' }}</p>
      }
      @default {
        <p role="alert">Invalid departure-time URL.</p>
      }
    }
    <a class="mt-6 inline-flex min-h-11 items-center" [routerLink]="['../']"
      >Back to departure times</a
    >
  `,
})
export class DepartureTimeDetail {
  protected readonly config = inject(DEPARTURE_TIME_FEATURE)
  protected readonly canManage = inject(DEPARTURE_TIME_MANAGE)
  protected readonly store = inject(DepartureTimesStore)
  private readonly route = inject(ActivatedRoute)
  private readonly id = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  private readonly validId = signal<DepartureTimeId | null>(null)

  constructor() {
    effect(() => {
      const raw = this.id().get('id')
      try {
        this.validId.set(raw === null ? null : departureTimeId(Number(raw)))
      } catch {
        this.validId.set(null)
      }
      const id = this.validId()
      untracked(() => {
        if (id !== null) this.store.loadDetail(id)
        else this.store.clearDetail()
      })
    })
  }
}
