import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'lib-app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header><ng-content select="[layoutHeader]" /></header>
    <div class="workspace">
      <aside><ng-content select="[layoutNavigation]" /></aside>
      <main><ng-content /></main>
    </div>
  `,
  styleUrl: './app-layout.css',
})
export class AppLayout {}
