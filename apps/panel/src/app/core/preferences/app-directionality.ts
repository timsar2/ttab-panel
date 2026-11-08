import { Direction, Directionality } from '@angular/cdk/bidi'
import { DestroyRef, EventEmitter, Injectable, effect, inject, linkedSignal } from '@angular/core'
import { PreferencesStore } from './preferences.store'

/** Keep CDK/Spartan overlays in sync, not only the document's CSS direction. */
@Injectable()
export class AppDirectionality implements Pick<Directionality, 'value' | 'change' | 'valueSignal'> {
  private readonly preferences = inject(PreferencesStore)
  readonly change = new EventEmitter<Direction>()
  readonly valueSignal = linkedSignal(() => this.preferences.direction())

  get value(): Direction {
    return this.valueSignal()
  }

  constructor() {
    let previous = this.value
    effect(() => {
      const direction = this.value
      if (direction !== this.preferences.direction()) {
        this.preferences.setDirection(direction)
      }
      if (direction !== previous) {
        previous = direction
        this.change.emit(direction)
      }
    })
    inject(DestroyRef).onDestroy(() => this.change.complete())
  }
}
