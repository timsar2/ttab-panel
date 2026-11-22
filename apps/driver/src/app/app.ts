import { Component } from '@angular/core'
import { RouterModule } from '@angular/router'
import { HlmToasterImports } from '@spartan-ng/helm/sonner'

@Component({
  imports: [RouterModule, HlmToasterImports],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'driver'
}
