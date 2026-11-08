import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'lib-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-shell">
      <header class="page-header">
        <ng-content select="[authHeader]" />
        <ng-content select="[authActions]" />
      </header>
      <main class="login-main">
        <div class="brand-slot"><ng-content select="[authBrand]" /></div>
        <div class="content-slot"><ng-content /></div>
      </main>
      <footer class="page-footer"><ng-content select="[authFooter]" /></footer>
    </div>
  `,
  styleUrl: './auth-layout.css',
})
export class AuthLayout {}
