import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import {
  InspectionSearch,
  InspectionStore,
  InspectionVisitRow,
  inspectionStatusLabel,
} from '@org/transport-inspection-data-access'
import { PreferencesStore } from '@org/platform'
import { HlmButton } from '@spartan-ng/helm/button'

@Component({
  selector: 'lib-inspector-inspection-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButton],
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">{{ isRtl() ? 'بازرسی‌های من' : 'My inspections' }}</h1>
        <p class="text-muted-foreground mt-2">
          {{
            isRtl()
              ? 'فهرست بازدیدهای ثبت‌شده توسط حساب بازرس شما.'
              : 'Visits submitted by your Inspector account.'
          }}
        </p>
      </div>
      <a hlmBtn class="min-h-11" routerLink="/inspections/new">
        {{ isRtl() ? 'ثبت بازرسی' : 'Register inspection' }}
      </a>
    </header>

    @if (store.listStatus() === 'loading' || store.listStatus() === 'idle') {
      <p role="status" class="text-muted-foreground py-8">
        {{ isRtl() ? 'در حال بارگذاری بازرسی‌ها…' : 'Loading inspections…' }}
      </p>
    } @else if (store.listStatus() === 'denied') {
      <p role="alert" class="py-8">
        {{
          isRtl()
            ? 'دسترسی به فهرست بازرسی‌ها مجاز نیست.'
            : 'You are not authorized to view inspections.'
        }}
      </p>
    } @else if (store.listStatus() === 'error') {
      <div role="alert" class="flex flex-wrap items-center gap-3 py-8">
        <p>
          {{ isRtl() ? 'بارگذاری فهرست بازرسی‌ها ناموفق بود.' : 'Could not load inspections.' }}
        </p>
        <button hlmBtn variant="outline" class="min-h-11" (click)="reload()">
          {{ isRtl() ? 'تلاش دوباره' : 'Retry' }}
        </button>
      </div>
    } @else if (!rows().length) {
      <section class="rounded-xl border p-6" role="status">
        <p>
          {{
            isRtl() ? 'هنوز بازدیدی ثبت نکرده‌اید.' : 'You have not submitted any inspections yet.'
          }}
        </p>
      </section>
    } @else {
      <div class="overflow-x-auto rounded-xl border">
        <table class="w-full min-w-[42rem] text-start text-sm">
          <caption class="sr-only">
            {{
              isRtl() ? 'فهرست بازرسی‌های من' : 'My inspections'
            }}
          </caption>
          <thead class="bg-muted/50">
            <tr>
              <th scope="col" class="px-4 py-3">{{ isRtl() ? 'تاریخ' : 'Date' }}</th>
              <th scope="col" class="px-4 py-3">{{ isRtl() ? 'راننده' : 'Driver' }}</th>
              <th scope="col" class="px-4 py-3">{{ isRtl() ? 'خودرو' : 'Vehicle' }}</th>
              <th scope="col" class="px-4 py-3">{{ isRtl() ? 'وضعیت' : 'Status' }}</th>
              <th scope="col" class="px-4 py-3">{{ isRtl() ? 'جزئیات' : 'Details' }}</th>
            </tr>
          </thead>
          <tbody>
            @for (visit of rows(); track visit.id) {
              <tr class="border-t">
                <td class="px-4 py-3" dir="ltr">{{ visit.inspectionDate }}</td>
                <td class="px-4 py-3">{{ visit.driverName || '#' + visit.driverId }}</td>
                <td class="px-4 py-3 whitespace-nowrap [unicode-bidi:isolate-override]" dir="ltr">
                  {{ visit.carPlate || '#' + visit.vehicleId }}
                </td>
                <td class="px-4 py-3">
                  <span
                    class="bg-muted text-muted-foreground inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                  >
                    {{ statusLabel(visit.statusTypeName ?? visit.statusTypeId) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <a
                    class="inline-flex min-h-11 items-center underline underline-offset-4"
                    [routerLink]="['/', 'inspections', visit.id]"
                  >
                    {{ isRtl() ? 'مشاهده' : 'View' }}
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <nav
        class="mt-4 flex items-center justify-between gap-3"
        [attr.aria-label]="isRtl() ? 'صفحه‌بندی بازرسی‌ها' : 'Inspection pagination'"
      >
        <button
          hlmBtn
          variant="outline"
          class="min-h-11"
          [disabled]="store.listStatus() === 'loading' || search().pageNumber <= 1"
          (click)="changePage(search().pageNumber - 1)"
        >
          {{ isRtl() ? 'صفحه قبل' : 'Previous' }}
        </button>
        <span aria-live="polite">{{ isRtl() ? 'صفحه' : 'Page' }} {{ search().pageNumber }}</span>
        <button
          hlmBtn
          variant="outline"
          class="min-h-11"
          [disabled]="store.listStatus() === 'loading' || !store.hasNext()"
          (click)="changePage(search().pageNumber + 1)"
        >
          {{ isRtl() ? 'صفحه بعد' : 'Next' }}
        </button>
      </nav>
    }
  `,
})
export class InspectorInspectionListPage {
  protected readonly preferences = inject(PreferencesStore)
  protected readonly isRtl = this.preferences.isRtl
  protected readonly store = inject(InspectionStore)
  protected readonly rows = computed<readonly InspectionVisitRow[]>(() => this.store.visits() ?? [])
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  })
  protected readonly search = computed<InspectionSearch>(() => {
    const raw = Number(this.params().get('page'))
    const pageNumber = Number.isSafeInteger(raw) && raw > 0 && raw <= 32767 ? raw : 1
    return { pageNumber, pageSize: 25, orderBy: 'InspectionDate DESC' }
  })

  constructor() {
    effect(() => {
      const query = this.search()
      untracked(() => this.store.load(query))
    })
  }

  protected reload() {
    this.store.load(this.search())
  }

  protected statusLabel(value: string | number | null): string {
    return inspectionStatusLabel(value, this.isRtl() ? 'fa' : 'en')
  }

  protected changePage(pageNumber: number) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 32767) return
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: pageNumber },
      queryParamsHandling: 'merge',
    })
  }
}
