import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { RouterLink, RouterOutlet } from '@angular/router'
import { AppLayout, LayoutNavItem } from '@org/layout'
import { PreferencesStore } from '@org/platform'

@Component({
  selector: 'app-inspector-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppLayout, RouterLink, RouterOutlet],
  template: `
    <lib-app-layout
      [items]="items()"
      [navigationLabel]="isRtl() ? 'ناوبری بازرسی' : 'Inspection navigation'"
      [toggleNavigationLabel]="isRtl() ? 'تغییر ناوبری' : 'Toggle navigation'"
    >
      <a
        layoutBrand
        class="inline-flex min-h-12 items-center px-4 font-semibold"
        routerLink="/inspections/new"
      >
        {{ isRtl() ? 'بازرسی' : 'Inspection' }}
      </a>
      <router-outlet />
    </lib-app-layout>
  `,
})
export class InspectorShell {
  private readonly preferences = inject(PreferencesStore)
  protected readonly isRtl = this.preferences.isRtl
  protected readonly items = computed<readonly LayoutNavItem[]>(() => [
    {
      id: 'new-inspection',
      label: this.isRtl() ? 'ثبت بازرسی' : 'Register inspection',
      commands: ['/inspections', 'new'],
      exact: false,
    },
  ])
}
