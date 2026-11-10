import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core'
import { HlmAlertDialog, HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog'

@Component({
  selector: 'lib-confirm-dialog',
  imports: [HlmAlertDialogImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-alert-dialog
      #dialog
      [state]="open() ? 'open' : 'closed'"
      (stateChanged)="onStateChanged($event)"
    >
      <div hlmAlertDialogContent *hlmAlertDialogPortal>
        <div hlmAlertDialogHeader>
          <h2 hlmAlertDialogTitle>{{ title() }}</h2>
          <p hlmAlertDialogDescription>{{ description() }}</p>
        </div>
        <div hlmAlertDialogFooter>
          <button hlmAlertDialogCancel class="min-h-11 min-w-11" type="button">
            {{ cancelLabel() }}
          </button>
          <button
            hlmAlertDialogAction
            class="min-h-11 min-w-11"
            type="button"
            [disabled]="busy()"
            (click)="confirm(dialog)"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </hlm-alert-dialog>
  `,
})
export class ConfirmDialog {
  readonly open = model(false)
  readonly title = input.required<string>()
  readonly description = input.required<string>()
  readonly confirmLabel = input('Confirm')
  readonly cancelLabel = input('Cancel')
  readonly busy = input(false)
  readonly confirmed = output<void>()
  readonly canceled = output<void>()

  protected confirm(dialog: HlmAlertDialog): void {
    if (!this.open() || this.busy()) return
    // Settle before closing: the primitive emits 'closed' synchronously.
    this.open.set(false)
    dialog.close()
    this.confirmed.emit()
  }

  protected onStateChanged(state: 'open' | 'closed'): void {
    if (state !== 'closed' || !this.open()) return
    this.open.set(false)
    this.canceled.emit()
  }
}
