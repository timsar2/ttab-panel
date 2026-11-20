import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { PreferencesStore, ThemePanel } from '@org/platform'

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
