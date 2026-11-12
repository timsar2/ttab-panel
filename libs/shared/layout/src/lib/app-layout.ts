import { Directionality } from '@angular/cdk/bidi'
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { NgIcon } from '@ng-icons/core'
import {
  HlmSidebar,
  HlmSidebarContent,
  HlmSidebarMenu,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
  HlmSidebarService,
  HlmSidebarTrigger,
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
    HlmSidebarMenu,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
    HlmSidebarTrigger,
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
    <div class="theme-shell">
      <hlm-sidebar
        class="theme-sidebar"
        [side]="direction.valueSignal() === 'rtl' ? 'right' : 'left'"
        [collapsible]="sidebar.isMobile() ? 'offcanvas' : 'none'"
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
      <div class="theme-content-column">
        <header>
          <button
            hlmSidebarTrigger
            class="theme-menu-trigger"
            type="button"
            [srOnlyText]="navigationLabel()"
            [attr.aria-label]="navigationLabel()"
            [attr.aria-expanded]="sidebar.openMobile()"
          ></button>
          <ng-content select="[layoutHeader]" />
        </header>
        <main><ng-content /></main>
      </div>
    </div>
  `,
  styleUrl: './app-layout.css',
})
export class AppLayout {
  readonly items = input<readonly LayoutNavItem[]>([])
  readonly navigationLabel = input('Navigation')
  protected readonly sidebar = inject(HlmSidebarService)
  protected readonly direction = inject(Directionality)
}
