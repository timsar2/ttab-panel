import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'

/** App-owned outlet host; reusable vehicle pages live in `@org/transport-vehicles-feature`. */
@Component({
  selector: 'app-vehicles-page',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full min-w-0' },
  template: '<router-outlet />',
})
export class VehiclesPageHost {}
