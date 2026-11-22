import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { PreferencesStore, ThemePanel } from '@org/platform'
import { HlmToasterImports } from '@spartan-ng/helm/sonner'

@Component({
  imports: [RouterOutlet, ThemePanel, HlmToasterImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly preferences = inject(PreferencesStore)
}
