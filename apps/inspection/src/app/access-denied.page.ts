import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { PreferencesStore } from '@org/platform'
import { HlmButton } from '@spartan-ng/helm/button'

@Component({
  selector: 'app-inspection-access-denied',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButton],
  host: { class: 'grid min-h-screen place-items-center p-6 text-center' },
  template: `
    <main class="max-w-lg">
      <p class="text-muted-foreground text-sm">{{ isRtl() ? 'بازرسی' : 'Inspection' }}</p>
      <h1 class="mt-2 text-2xl font-semibold">
        {{ isRtl() ? 'دسترسی مجاز نیست' : 'Access denied' }}
      </h1>
      <p class="text-muted-foreground mt-3">
        {{
          isRtl()
            ? 'برای این برنامه، نقش بازرس لازم است.'
            : 'The Inspector role is required to use this app.'
        }}
      </p>
      <a hlmBtn class="mt-6 min-h-11" routerLink="/workspace">
        {{ isRtl() ? 'بازگشت به فضای کاری' : 'Return to workspace' }}
      </a>
    </main>
  `,
})
export class AccessDeniedPage {
  private readonly preferences = inject(PreferencesStore)
  protected readonly isRtl = this.preferences.isRtl
}
