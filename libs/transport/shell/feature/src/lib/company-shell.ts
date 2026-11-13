import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
} from '@angular/core'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { AppLayout } from '@org/layout'
import { CompanyContextStore } from '@org/transport-company-data-access'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmCardImports } from '@spartan-ng/helm/card'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb'
import { filter } from 'rxjs'
import { COMPANY_SHELL_CONFIG } from './company-shell.routes'

@Component({
  selector: 'lib-company-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppLayout,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    HlmButton,
    HlmCardImports,
    HlmAlertImports,
    HlmBreadcrumbImports,
  ],
  template: `
    <lib-app-layout [items]="navigationItems()" [navigationLabel]="labels().navigation">
      <span layoutBrand class="truncate font-semibold">{{ config.brand }}</span>
      <nav layoutNavigation [attr.aria-label]="labels().navigation">
        <a
          class="theme-nav-link min-h-11"
          [attr.aria-label]="labels().switchCompany"
          [routerLink]="config.companiesCommands"
        >
          <span aria-hidden="true">{{ labels().companies.slice(0, 1) }}</span
          ><span data-nav-label>{{ labels().switchCompany }}</span>
        </a>
        @if (context.status() === 'ready') {
          @for (link of links(); track link.path) {
            <a
              class="theme-nav-link min-h-11"
              [routerLink]="[link.path]"
              [attr.aria-label]="link.label"
              routerLinkActive="bg-accent"
              ariaCurrentWhenActive="page"
              ><span aria-hidden="true">{{ link.label.slice(0, 1) }}</span
              ><span data-nav-label>{{ link.label }}</span></a
            >
          }
        }
      </nav>
      <div layoutHeader class="flex w-full min-w-0 items-center justify-between gap-3">
        <div class="min-w-0">
          <span class="block truncate font-semibold">{{
            context.company()?.name ?? labels().workspace
          }}</span>
          <span
            class="text-muted-foreground block truncate text-sm"
            [attr.aria-label]="labels().account"
            >{{ displayName() }}</span
          >
        </div>
        <button hlmBtn variant="outline" class="min-h-11" type="button" (click)="logout()">
          {{ labels().signOut }}
        </button>
      </div>
      @if (context.status() === 'ready') {
        <nav hlmBreadcrumb class="theme-breadcrumb mb-4" [aria-label]="labels().breadcrumbs">
          <ol hlmBreadcrumbList>
            <li hlmBreadcrumbItem>
              <a hlmBreadcrumbLink [routerLink]="config.companiesCommands">{{
                labels().companies
              }}</a>
            </li>
            <li hlmBreadcrumbSeparator></li>
            <li hlmBreadcrumbItem>
              @if (breadcrumbs().length) {
                <a hlmBreadcrumbLink [routerLink]="['.']">{{ context.company()?.name }}</a>
              } @else {
                <span hlmBreadcrumbPage>{{ context.company()?.name }}</span>
              }
            </li>
            @for (crumb of breadcrumbs(); track $index; let last = $last) {
              <li hlmBreadcrumbSeparator></li>
              <li hlmBreadcrumbItem>
                <a
                  hlmBreadcrumbLink
                  [routerLink]="crumb.url"
                  [attr.aria-current]="last ? 'page' : null"
                  >{{ crumb.label }}</a
                >
              </li>
            }
          </ol>
        </nav>
        <!-- <section hlmCard>
          <div hlmCardHeader>
            <h1 hlmCardTitle>{{ context.company()?.name }}</h1>
            <p hlmCardDescription>{{ labels().workspace }}</p>
          </div>
          <div hlmCardContent>
            <dl class="grid gap-3 md:grid-cols-2">
              <div>
                <dt class="text-muted-foreground">Company ID</dt>
                <dd>{{ context.company()?.id }}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Type</dt>
                <dd>{{ context.company()?.companyTypeName ?? '-' }}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Address</dt>
                <dd>{{ context.company()?.address ?? '-' }}</dd>
              </div>
            </dl>
          </div>
        </section> -->
        <router-outlet />
      } @else if (context.status() === 'loading') {
        <p role="status">Loading company...</p>
      } @else {
        <section hlmAlert role="alert">
          <h1 hlmAlertTitle>{{ statusTitle() }}</h1>
          <p hlmAlertDescription>{{ statusDescription() }}</p>
          <a
            hlmBtn
            variant="outline"
            class="mt-3 min-h-11"
            [routerLink]="config.companiesCommands"
            >{{ labels().chooseCompany }}</a
          >
        </section>
      }
    </lib-app-layout>
  `,
})
export class CompanyShell {
  protected readonly config = inject(COMPANY_SHELL_CONFIG)
  protected readonly context = inject(CompanyContextStore)
  protected readonly navigationItems = this.config.navigation?.() ?? computed(() => [])
  private readonly translations =
    this.config.translations?.() ??
    computed<Readonly<Record<string, string | undefined>>>(() => ({}))
  private readonly session = inject(SessionStore)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly navigation = toSignal(
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)),
  )
  protected readonly labels = computed(() => {
    const translations = this.translations()
    return {
      navigation: translations['Company navigation'] ?? 'Company navigation',
      companies: translations['Companies'] ?? 'Companies',
      chooseCompany: translations['Choose a company'] ?? 'Choose a company',
      switchCompany: translations['Switch company'] ?? 'Switch company',
      workspace: translations['Company workspace'] ?? 'Company workspace',
      signOut: translations['Sign out'] ?? 'Sign out',
      breadcrumbs: translations['Breadcrumbs'] ?? 'Breadcrumbs',
      account: translations['Signed-in account'] ?? 'Signed-in account',
      ...this.config.labels,
    }
  })
  protected readonly displayName = computed(() => {
    const user = this.session.user()
    return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.id || ''
  })
  protected readonly breadcrumbs = computed(() => {
    this.navigation()
    const labels: { label: string; url: string }[] = []
    const url = this.route.snapshot.url.map(segment => segment.path)
    let child = this.route.snapshot.firstChild
    while (child) {
      url.push(...child.url.map(segment => segment.path))
      const key = child.data['breadcrumb']
      if (typeof key === 'string' && key.trim()) {
        const crumb = { label: this.translations()[key] ?? key, url: '/' + url.join('/') }
        if (labels.length && labels[labels.length - 1].label === crumb.label)
          labels[labels.length - 1] = crumb
        else labels.push(crumb)
      }
      child = child.firstChild
    }
    return labels
  })
  protected readonly links = computed(
    () =>
      this.config.links?.filter(
        link => !link.visibleWhen || link.visibleWhen(this.session.user()?.roles ?? []),
      ) ?? [],
  )
  protected readonly statusTitle = computed(
    () =>
      ({
        idle: 'Choose a company',
        invalid: 'Invalid company URL',
        missing: 'Company not found',
        denied: 'Company access denied',
        error: 'Unable to load company',
        loading: 'Loading company',
        ready: 'Company workspace',
      })[this.context.status()],
  )
  protected readonly statusDescription = computed(() =>
    this.context.status() === 'error'
      ? (this.context.error()?.message ?? 'The request could not be completed.')
      : 'Choose a company you can access, or verify the company URL.',
  )

  constructor() {
    const destroyRef = inject(DestroyRef)
    destroyRef.onDestroy(() => this.context.clear())
    this.router.events.pipe(takeUntilDestroyed(destroyRef)).subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.context.activate(this.route.snapshot.paramMap.get(this.config.companyParam))
      }
    })
    effect(() => {
      if (!this.session.user()) {
        this.context.clear()
        void this.router.navigateByUrl(this.config.loginUrl)
      }
    })
  }

  protected logout() {
    this.context.clear()
    void this.session.logout()
    void this.router.navigateByUrl(this.config.loginUrl)
  }
}
