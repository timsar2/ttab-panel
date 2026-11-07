import { Direction, Directionality } from '@angular/cdk/bidi';
import {
  DestroyRef,
  EventEmitter,
  Injectable,
  effect,
  inject,
} from '@angular/core';
import { PreferencesStore } from './preferences.store';

/** Keep CDK/Spartan overlays in sync, not only the document's CSS direction. */
@Injectable()
export class AppDirectionality implements Pick<
  Directionality,
  'value' | 'change'
> {
  private readonly preferences = inject(PreferencesStore);
  readonly change = new EventEmitter<Direction>();

  get value(): Direction {
    return this.preferences.direction();
  }

  constructor() {
    let previous = this.value;
    effect(() => {
      const direction = this.value;
      if (direction !== previous) {
        previous = direction;
        this.change.emit(direction);
      }
    });
    inject(DestroyRef).onDestroy(() => this.change.complete());
  }
}
