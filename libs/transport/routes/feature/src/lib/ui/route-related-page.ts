import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { HlmButton } from '@spartan-ng/helm/button'
import { ROUTE_LANGUAGE } from '../route.routes'
import { routeText } from '../route-text'

@Component({
  selector: 'lib-route-related-page',
  imports: [HlmButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 p-4 md:p-8' },
  template: `
    <main [attr.dir]="language() === 'fa' ? 'rtl' : 'ltr'">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-muted-foreground mb-1 text-sm">{{ routeText(language(), 'routes') }}</p>
          <h1 class="text-2xl font-semibold">{{ routeText(language(), 'lines') }}</h1>
        </div>
        <a hlmBtn variant="outline" class="min-h-11" [routerLink]="['../..']">{{
          routeText(language(), 'back')
        }}</a>
      </header>
      <p class="rounded-md border p-4" role="status">{{ routeText(language(), 'linePending') }}</p>
    </main>
  `,
})
export class RouteRelatedPage {
  protected readonly language = inject(ROUTE_LANGUAGE)
  protected routeText = routeText
}
