import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  Signal,
  computed,
  inject,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { AppLayout, LayoutNavItem } from '@org/layout'
import { PreferencesStore } from '@org/platform'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb'
import { filter } from 'rxjs'

export const PANEL_ADMIN_NAVIGATION = new InjectionToken<Signal<readonly LayoutNavItem[]>>(
  'PANEL_ADMIN_NAVIGATION',
)

@Component({
  selector: 'app-company-admin-shell',
  imports: [AppLayout, RouterLink, RouterOutlet, HlmButton, HlmBreadcrumbImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-app-layout [items]="navigation()" [navigationLabel]="rtl() ? 'ناوبری' : 'Navigation'">
      <span layoutBrand class="truncate font-semibold">Panel</span>
      <div layoutHeader class="flex w-full min-w-0 items-center justify-between gap-3">
        <div class="min-w-0">
          <span class="block truncate font-semibold">{{
            rtl() ? 'مدیریت حمل‌ونقل' : 'Transport management'
          }}</span>
          <span class="text-muted-foreground block truncate text-sm">{{ displayName() }}</span>
        </div>
        <button hlmBtn variant="outline" class="min-h-11" type="button" (click)="logout()">
          {{ rtl() ? 'خروج' : 'Sign out' }}
        </button>
      </div>
      <nav
        hlmBreadcrumb
        class="theme-breadcrumb mb-4"
        [attr.aria-label]="rtl() ? 'مسیر راهنما' : 'Breadcrumbs'"
      >
        <ol hlmBreadcrumbList>
          <li hlmBreadcrumbItem>
            <a hlmBreadcrumbLink routerLink="/companies">{{ rtl() ? 'شرکت‌ها' : 'Companies' }}</a>
          </li>
          <li hlmBreadcrumbSeparator></li>
          <li hlmBreadcrumbItem>
            @if (pageBreadcrumb()) {
              <a hlmBreadcrumbLink routerLink="/companies">{{ rtl() ? 'شرکت‌ها' : 'Companies' }}</a>
            } @else {
              <span hlmBreadcrumbPage>{{ rtl() ? 'شرکت‌ها' : 'Companies' }}</span>
            }
          </li>
          @if (pageBreadcrumb(); as breadcrumb) {
            <li hlmBreadcrumbSeparator></li>
            <li hlmBreadcrumbItem>
              <span hlmBreadcrumbPage>{{ breadcrumbLabel(breadcrumb) }}</span>
            </li>
          }
        </ol>
      </nav>
      <router-outlet />
    </lib-app-layout>
  `,
})
export class CompanyAdminShell {
  protected readonly navigation = inject(PANEL_ADMIN_NAVIGATION)
  private readonly preferences = inject(PreferencesStore)
  private readonly session = inject(SessionStore)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly navigationEnd = toSignal(
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)),
  )
  protected readonly rtl = this.preferences.isRtl
  protected readonly displayName = computed(() => {
    const user = this.session.user()
    return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.id || ''
  })
  protected readonly pageBreadcrumb = computed(() => {
    this.navigationEnd()
    return this.route.snapshot.firstChild?.data['breadcrumb'] as string | undefined
  })

  protected breadcrumbLabel(key: string) {
    if (key === 'Create company') return this.rtl() ? 'افزودن شرکت' : key
    if (key === 'Edit company') return this.rtl() ? 'ویرایش شرکت' : key
    return key
  }

  protected logout() {
    void this.session.logout()
    void this.router.navigateByUrl('/login')
  }
}
