import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { Router, RouterLink, RouterOutlet } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { AppLayout, LayoutNavItem } from '@org/layout'
import { PreferencesStore } from '@org/platform'
import { HlmButton } from '@spartan-ng/helm/button'

@Component({
  selector: 'app-inspector-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppLayout, RouterLink, RouterOutlet, HlmButton],
  template: `
    <lib-app-layout
      [items]="items()"
      [navigationLabel]="isRtl() ? 'ناوبری بازرسی' : 'Inspection navigation'"
      [toggleNavigationLabel]="isRtl() ? 'تغییر ناوبری' : 'Toggle navigation'"
    >
      <a
        layoutBrand
        class="inline-flex min-h-12 items-center px-4 font-semibold"
        routerLink="/inspections"
      >
        {{ isRtl() ? 'بازرسی' : 'Inspection' }}
      </a>
      <div layoutHeader class="flex w-full min-w-0 items-center justify-between gap-3">
        <div class="min-w-0">
          <span class="block truncate font-semibold">{{ isRtl() ? 'بازرسی' : 'Inspection' }}</span>
          <span class="text-muted-foreground block truncate text-sm">{{ displayName() }}</span>
        </div>
        <button hlmBtn variant="outline" class="min-h-11" type="button" (click)="logout()">
          {{ isRtl() ? 'خروج' : 'Sign out' }}
        </button>
      </div>
      <router-outlet />
    </lib-app-layout>
  `,
})
export class InspectorShell {
  private readonly preferences = inject(PreferencesStore)
  private readonly session = inject(SessionStore)
  private readonly router = inject(Router)
  protected readonly isRtl = this.preferences.isRtl
  protected readonly displayName = computed(() => {
    const user = this.session.user()
    return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.id || ''
  })
  protected readonly items = computed<readonly LayoutNavItem[]>(() => [
    {
      id: 'inspections',
      label: this.isRtl() ? 'بازرسی‌ها' : 'Inspections',
      commands: ['/inspections'],
      exact: true,
    },
    {
      id: 'new-inspection',
      label: this.isRtl() ? 'ثبت بازرسی' : 'Register inspection',
      commands: ['/inspections', 'new'],
      exact: true,
    },
  ])

  protected async logout(): Promise<void> {
    await this.session.logout()
    await this.router.navigateByUrl('/login')
  }
}
