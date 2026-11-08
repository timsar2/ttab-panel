import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'lib-app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="theme-shell">
      <aside class="theme-sidebar">
        <div class="theme-brand"><ng-content select="[layoutBrand]" /></div>
        <div class="theme-navigation"><ng-content select="[layoutNavigation]" /></div>
      </aside>
      <div class="theme-content-column">
        <header><ng-content select="[layoutHeader]" /></header>
        <main><ng-content /></main>
      </div>
    </div>
  `,
  styleUrl: './app-layout.css',
})
export class AppLayout {}
