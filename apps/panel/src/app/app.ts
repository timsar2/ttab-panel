import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { ThemePanel } from '@org/theme-ui'
import { PreferencesStore } from './core/preferences/preferences.store'

@Component({
  imports: [RouterOutlet, ThemePanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly preferences = inject(PreferencesStore)
}
