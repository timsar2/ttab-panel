import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { Router } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { AppLayout } from '@org/layout'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmCardImports } from '@spartan-ng/helm/card'
import { PreferencesStore } from './core/preferences/preferences.store'

@Component({
  selector: 'app-workspace-page',
  imports: [AppLayout, HlmButton, HlmCardImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-app-layout>
      <div layoutHeader class="flex w-full items-center justify-between gap-4">
        <span class="font-semibold">{{
          preferences.isRtl() ? 'پنل مدیریت' : 'Administration'
        }}</span>
        <button hlmBtn variant="outline" (click)="logout()">
          {{ preferences.isRtl() ? 'خروج' : 'Sign out' }}
        </button>
      </div>
      <section hlmCard>
        <div hlmCardHeader>
          <h1 hlmCardTitle>
            {{ preferences.isRtl() ? 'ورود با موفقیت انجام شد' : 'You are signed in' }}
          </h1>
          <p hlmCardDescription>{{ displayName() }}</p>
        </div>
        <div hlmCardContent>
          <p>
            {{
              preferences.isRtl()
                ? 'احراز هویت فعال است. قابلیت‌های مدیریت شرکت در مرحله بعد منتقل می‌شوند.'
                : 'Authentication is active. Company-management features will be migrated next.'
            }}
          </p>
        </div>
      </section>
    </lib-app-layout>
  `,
})
export class WorkspacePage {
  readonly preferences = inject(PreferencesStore)
  private readonly session = inject(SessionStore)
  private readonly router = inject(Router)
  readonly displayName = computed(() => {
    const user = this.session.user()
    return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.id || ''
  })

  logout(): void {
    void this.session.logout()
    void this.router.navigateByUrl('/login')
  }
}
