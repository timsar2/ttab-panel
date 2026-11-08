import { Directive, computed, inject, input } from '@angular/core'
import { FormField } from '@angular/forms/signals'
import { HlmInput } from '@spartan-ng/helm/input'

// Composing host bindings gate Brain's invalid styling on field interaction.
@Directive({
  selector: 'input[libSignalInput]',
  hostDirectives: [HlmInput],
  host: {
    '[id]': 'id()',
    '[attr.aria-invalid]': 'invalidState()',
    '[attr.data-invalid]': 'invalidState()',
    '[attr.data-matches-spartan-invalid]': 'invalidState()',
  },
})
export class SignalInput {
  readonly id = input.required<string>()
  private readonly field = inject(FormField)
  readonly invalidState = computed(() => {
    const state = this.field.state()
    if (!state.invalid()) return null
    // Explicit false updates this binding whenever disabled controls become
    // invalid again, overriding Brain's ungated host binding on each transition.
    return state.touched() ? 'true' : 'false'
  })
}
