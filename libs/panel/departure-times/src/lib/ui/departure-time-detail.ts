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
import {
  DEPARTURE_TIME_FEATURE,
  DEPARTURE_TIME_LANGUAGE,
  DEPARTURE_TIME_UPDATE,
} from '../departure-time.routes'
import { departureTimeText, DepartureTimeTextKey } from '../departure-time-text'

@Component({
  selector: 'lib-departure-time-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButton],
  providers: [DepartureTimesStore],
  host: {
    class: 'block min-w-0 p-4 md:p-8',
    '[attr.dir]': "language() === 'fa' ? 'rtl' : 'ltr'",
  },
  template: `
    <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">{{ t('details') }}</h1>
      @if (canUpdate()) {
        <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['edit']">{{ t('edit') }}</a>
      }
    </header>
    @switch (store.detailStatus()) {
      @case ('loading') {
        <p role="status">{{ t('loading') }}</p>
      }
      @case ('ready') {
        @if (store.detail(); as time) {
          <dl class="grid max-w-2xl gap-4 sm:grid-cols-2">
            <div>
              <dt class="font-medium">{{ t('name') }}</dt>
              <dd>{{ time.name }}</dd>
            </div>
            <div>
              <dt class="font-medium">{{ t('time') }}</dt>
              <dd>{{ time.shiftTime }}</dd>
            </div>
          </dl>
        }
      }
      @case ('missing') {
        <p role="alert">{{ t('notFound') }}</p>
      }
      @case ('denied') {
        <p role="alert">
          {{ config.deniedMessage?.[language()] ?? t('accessDenied') }}
        </p>
      }
      @case ('error') {
        <p role="alert">{{ t('detailFailed') }}</p>
      }
      @default {
        <p role="alert">{{ t('invalidUrl') }}</p>
      }
    }
    <a class="mt-6 inline-flex min-h-11 items-center" [routerLink]="['../']">{{ t('back') }}</a>
  `,
})
export class DepartureTimeDetail {
  protected readonly config = inject(DEPARTURE_TIME_FEATURE)
  protected readonly language = inject(DEPARTURE_TIME_LANGUAGE)
  protected readonly canUpdate = inject(DEPARTURE_TIME_UPDATE)
  protected readonly store = inject(DepartureTimesStore)
  private readonly route = inject(ActivatedRoute)
  private readonly id = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  })
  private readonly validId = signal<DepartureTimeId | null>(null)

  protected t(key: DepartureTimeTextKey) {
    return departureTimeText(this.language(), key)
  }

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
