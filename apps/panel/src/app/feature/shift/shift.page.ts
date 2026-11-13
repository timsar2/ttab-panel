import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'

/** App-owned route host; Shift screens are composed by the reusable panel library. */
@Component({
  selector: 'app-shift-page',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full min-w-0' },
  template: '<router-outlet />',
})
export class ShiftPage {}
