import { Directionality } from '@angular/cdk/bidi'
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { NgIcon } from '@ng-icons/core'
import {
  HlmSidebar,
  HlmSidebarContent,
  HlmSidebarInset,
  HlmSidebarMenu,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
  HlmSidebarService,
  HlmSidebarTrigger,
  HlmSidebarWrapper,
  provideHlmSidebarConfig,
} from '@spartan-ng/helm/sidebar'

export interface LayoutNavItem {
  readonly id: string
  readonly label: string
  readonly icon?: string
  readonly group?: string
  readonly commands?: (string | number)[]
  readonly exact?: boolean
  readonly hint?: string
}

@Component({
  selector: 'lib-app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmSidebar,
    HlmSidebarContent,
    HlmSidebarInset,
    HlmSidebarMenu,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
    HlmSidebarTrigger,
    HlmSidebarWrapper,
    RouterLink,
    RouterLinkActive,
    NgIcon,
  ],
  providers: [
    HlmSidebarService,
    provideHlmSidebarConfig({
      mobileBreakpoint: '767px',
      closeMobileSidebarOnMenuButtonClick: true,
    }),
  ],
  template: `
    <div
      hlmSidebarWrapper
      class="theme-shell"
      [sidebarWidth]="sidebarWidth()"
      [sidebarWidthIcon]="sidebarWidthIcon()"
    >
      <hlm-sidebar
        id="app-navigation"
        class="theme-sidebar"
        [side]="direction.valueSignal() === 'rtl' ? 'right' : 'left'"
        [collapsible]="sidebar.isMobile() ? 'offcanvas' : 'icon'"
        sidebarWidthMobile="min(21.563rem, calc(100vw - 2rem))"
        [srOnlySheetTitle]="navigationLabel()"
        [srOnlySheetDescription]="navigationLabel()"
      >
        <div class="theme-brand"><ng-content select="[layoutBrand]" /></div>
        <div hlmSidebarContent class="theme-navigation">
          @if (items().length) {
            <nav [attr.aria-label]="navigationLabel()">
              <ul hlmSidebarMenu>
                @for (item of items(); track item.id; let index = $index) {
                  @if (item.group && (index === 0 || item.group !== items()[index - 1].group)) {
                    <li class="theme-menu-heading" aria-hidden="true">{{ item.group }}</li>
                  }
                  <li hlmSidebarMenuItem>
                    @if (item.commands; as commands) {
                      <a
                        hlmSidebarMenuButton
                        size="lg"
                        class="theme-nav-link"
                        [routerLink]="commands"
                        routerLinkActive
                        #active="routerLinkActive"
                        [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                        [isActive]="active.isActive"
                        ariaCurrentWhenActive="page"
                        [attr.aria-label]="item.label"
                        [attr.title]="item.label"
                      >
                        @if (item.icon) {
                          <ng-icon [svg]="item.icon" size="20" aria-hidden="true" />
                        }
                        <span data-nav-label>{{ item.label }}</span>
                      </a>
                    } @else {
                      <button
                        hlmSidebarMenuButton
                        size="lg"
                        class="theme-nav-link"
                        type="button"
                        disabled
                        [attr.aria-label]="item.label + (item.hint ? ': ' + item.hint : '')"
                        [attr.title]="item.hint ?? item.label"
                      >
                        @if (item.icon) {
                          <ng-icon [svg]="item.icon" size="20" aria-hidden="true" />
                        }
                        <span data-nav-label>{{ item.label }}</span>
                      </button>
                    }
                  </li>
                }
              </ul>
            </nav>
          }
          @if (!items().length) {
            <ng-content select="[layoutNavigation]" />
          }
        </div>
      </hlm-sidebar>
      <main hlmSidebarInset class="theme-content-column">
        <header>
          <button
            hlmSidebarTrigger
            class="theme-menu-trigger bg-background border-border hover:bg-accent rounded-md border"
            type="button"
            [srOnlyText]="navigationLabel()"
            [attr.aria-label]="toggleNavigationLabel()"
            [attr.aria-expanded]="sidebar.isMobile() ? sidebar.openMobile() : sidebar.open()"
            aria-controls="app-navigation"
            [attr.title]="toggleNavigationLabel()"
          ></button>
          <ng-content select="[layoutHeader]" />
        </header>
        <section class="theme-page-content"><ng-content /></section>
      </main>
    </div>
  `,
  styleUrl: './app-layout.css',
})
export class AppLayout {
  readonly items = input<readonly LayoutNavItem[]>([])
  readonly navigationLabel = input('Navigation')
  readonly toggleNavigationLabel = input('Toggle navigation')
  readonly sidebarWidth = input('var(--app-layout-sidebar-width, 21.563rem)')
  readonly sidebarWidthIcon = input('var(--app-layout-sidebar-width-icon, 5.7rem)')
  protected readonly sidebar = inject(HlmSidebarService)
  protected readonly direction = inject(Directionality)
}
