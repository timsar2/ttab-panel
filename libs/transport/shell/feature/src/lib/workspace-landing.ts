import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { AppLayout } from '@org/layout'
import { HlmButton } from '@spartan-ng/helm/button'
import { HlmCardImports } from '@spartan-ng/helm/card'
import { WORKSPACE_CONFIG } from './workspace.routes'

export interface WorkspaceText {
  readonly navigation: string
  readonly workspace: string
  readonly administration: string
  readonly signOut: string
  readonly heading: string
  readonly description: string
  readonly chooseCompany: string
}
const defaultText: WorkspaceText = {
  navigation: 'Navigation',
  workspace: 'Workspace',
  administration: 'Administration',
  signOut: 'Sign out',
  heading: 'You are signed in',
  description: 'Choose a company to open its workspace.',
  chooseCompany: 'Choose a company',
}

@Component({
  selector: 'lib-workspace-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppLayout, RouterLink, HlmButton, HlmCardImports],
  template: `
    <lib-app-layout [items]="navigation()" [navigationLabel]="text().navigation">
      <span layoutBrand class="truncate font-semibold">{{ config.brand }}</span>
      <nav layoutNavigation [attr.aria-label]="text().navigation">
        <a
          class="theme-nav-link"
          [routerLink]="['/' + config.path]"
          aria-current="page"
          [attr.aria-label]="text().workspace"
        >
          <span aria-hidden="true">{{ config.brand.slice(0, 1) }}</span>
          <span data-nav-label>{{ text().workspace }}</span>
        </a>
      </nav>
      <div layoutHeader class="flex w-full min-w-0 items-center justify-between gap-3">
        <span class="truncate font-semibold">{{ text().administration }}</span>
        <button hlmBtn variant="outline" class="min-h-11" type="button" (click)="logout()">
          {{ text().signOut }}
        </button>
      </div>
      <section hlmCard>
        <div hlmCardHeader>
          <h1 hlmCardTitle>{{ text().heading }}</h1>
          <p hlmCardDescription>{{ displayName() }}</p>
        </div>
        <div hlmCardContent class="flex flex-col items-start gap-4">
          <p>{{ text().description }}</p>
          <a hlmBtn class="min-h-11" [routerLink]="config.companiesCommands">{{
            text().chooseCompany
          }}</a>
        </div>
      </section>
    </lib-app-layout>
  `,
})
export class WorkspaceLanding {
  protected readonly config = inject(WORKSPACE_CONFIG)
  private readonly session = inject(SessionStore)
  private readonly router = inject(Router)
  protected readonly text = this.config.text?.() ?? computed(() => defaultText)
  protected readonly navigation = this.config.navigation?.() ?? computed(() => [])
  protected readonly displayName = computed(() => {
    const user = this.session.user()
    return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.id || ''
  })

  constructor() {
    effect(() => {
      if (!this.session.user()) void this.router.navigateByUrl(this.config.loginUrl)
    })
  }

  protected logout() {
    void this.session.logout()
    void this.router.navigateByUrl(this.config.loginUrl)
  }
}
