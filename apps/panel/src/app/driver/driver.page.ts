import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'

/** App-owned router host; the rendered driver pages are owned by `@org/panel-drivers`. */
@Component({
  selector: 'app-driver-page',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full min-w-0' },
  template: '<router-outlet />',
})
export class DriverPage {}
