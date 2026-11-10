import { OverlayContainer } from '@angular/cdk/overlay'
import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { HlmAlertDialog } from '@spartan-ng/helm/alert-dialog'
import { ConfirmDialog } from '../index'

@Component({
  imports: [ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button">Editor action</button>
    <lib-confirm-dialog
      [(open)]="leaveOpen"
      title="Leave editor?"
      description="Your unsaved changes will be lost."
      [busy]="busy()"
      (confirmed)="confirmed = confirmed + 1"
      (canceled)="canceled = canceled + 1"
      (openChange)="changes.push($event)"
    />
    <lib-confirm-dialog
      [(open)]="deleteOpen"
      title="Delete record?"
      description="This action cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Keep record"
      (confirmed)="deleted = deleted + 1"
      (canceled)="kept = kept + 1"
    />
  `,
})
class Consumer {
  readonly leaveOpen = signal(false)
  readonly deleteOpen = signal(false)
  readonly busy = signal(false)
  confirmed = 0
  canceled = 0
  deleted = 0
  kept = 0
  readonly changes: boolean[] = []
}

describe('ConfirmDialog consumers', () => {
  async function setup() {
    TestBed.configureTestingModule({ imports: [Consumer] })
    const fixture = TestBed.createComponent(Consumer)
    await fixture.whenStable()
    const overlay = TestBed.inject(OverlayContainer).getContainerElement()
    const consumer = fixture.componentInstance
    const cancel = () => overlay.querySelector('[hlmAlertDialogCancel]') as HTMLButtonElement
    const confirm = () => overlay.querySelector('[hlmAlertDialogAction]') as HTMLButtonElement
    return { fixture, consumer, overlay, cancel, confirm }
  }

  it('starts closed without notifications and composes an accessible alertdialog with real focus-trap anchors', async () => {
    const { fixture, consumer, overlay, cancel, confirm } = await setup()
    expect(overlay.querySelector('[role="alertdialog"]')).toBeNull()
    expect(consumer.changes).toEqual([])
    expect(consumer.canceled).toBe(0)
    consumer.leaveOpen.set(true)
    await fixture.whenStable()
    const dialog = overlay.querySelector('[role="alertdialog"]') as HTMLElement
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(
      document.getElementById(dialog.getAttribute('aria-labelledby') ?? '')?.textContent,
    ).toContain('Leave editor?')
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toContain('Your unsaved changes will be lost.')
    expect(overlay.querySelectorAll('.cdk-focus-trap-anchor')).toHaveLength(2)
    expect(cancel().textContent?.trim()).toBe('Cancel')
    expect(confirm().textContent?.trim()).toBe('Confirm')
    for (const button of [cancel(), confirm()]) {
      expect(button.type).toBe('button')
      expect(button.classList.contains('min-h-11')).toBe(true)
      expect(button.classList.contains('min-w-11')).toBe(true)
    }
  })

  it('confirms exactly once and notifies the parent of closure without canceling', async () => {
    const { fixture, consumer, overlay, confirm } = await setup()
    consumer.leaveOpen.set(true)
    await fixture.whenStable()
    const action = confirm()
    action.click()
    action.click()
    expect(consumer.leaveOpen()).toBe(false)
    expect(consumer.confirmed).toBe(1)
    expect(consumer.canceled).toBe(0)
    expect(consumer.changes).toEqual([false])
    await fixture.whenStable()
    expect(overlay.querySelector('[role="alertdialog"]')).toBeNull()
    expect(consumer.canceled).toBe(0)
  })

  it('cancels exactly once through the primitive close button and can reopen', async () => {
    const { fixture, consumer, cancel } = await setup()
    consumer.leaveOpen.set(true)
    await fixture.whenStable()
    const action = cancel()
    action.click()
    action.click()
    await fixture.whenStable()
    expect(consumer.leaveOpen()).toBe(false)
    expect(consumer.canceled).toBe(1)
    expect(consumer.confirmed).toBe(0)
    expect(consumer.changes).toEqual([false])
    consumer.leaveOpen.set(true)
    await fixture.whenStable()
    cancel().click()
    await fixture.whenStable()
    expect(consumer.canceled).toBe(2)
    expect(consumer.changes).toEqual([false, false])
  })

  it('maps keyboard Escape and other primitive closes to cancellation', async () => {
    const { fixture, consumer, overlay } = await setup()
    consumer.leaveOpen.set(true)
    await fixture.whenStable()
    const dialog = overlay.querySelector('[role="alertdialog"]') as HTMLElement
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await fixture.whenStable()
    expect(consumer.leaveOpen()).toBe(false)
    expect(consumer.canceled).toBe(1)
    expect(consumer.changes).toEqual([false])
    consumer.leaveOpen.set(true)
    await fixture.whenStable()
    const primitive = fixture.debugElement.query(By.directive(HlmAlertDialog))
      .componentInstance as HlmAlertDialog
    primitive.close()
    await fixture.whenStable()
    expect(consumer.canceled).toBe(2)
    expect(consumer.confirmed).toBe(0)
  })

  it('blocks confirmation while busy but keeps cancellation available', async () => {
    const { fixture, consumer, cancel, confirm } = await setup()
    consumer.busy.set(true)
    consumer.leaveOpen.set(true)
    await fixture.whenStable()
    expect(confirm().disabled).toBe(true)
    expect(cancel().disabled).toBe(false)
    confirm().click()
    expect(consumer.confirmed).toBe(0)
    expect(consumer.leaveOpen()).toBe(true)
    cancel().click()
    await fixture.whenStable()
    expect(consumer.canceled).toBe(1)
    expect(consumer.leaveOpen()).toBe(false)
    consumer.leaveOpen.set(true)
    consumer.busy.set(false)
    await fixture.whenStable()
    expect(confirm().disabled).toBe(false)
    confirm().click()
    await fixture.whenStable()
    expect(consumer.confirmed).toBe(1)
  })

  it('supports alternate destructive-action configuration without leaking outcomes', async () => {
    const { fixture, consumer, overlay, cancel, confirm } = await setup()
    consumer.deleteOpen.set(true)
    await fixture.whenStable()
    expect(overlay.textContent).toContain('Delete record?')
    expect(overlay.textContent).toContain('This action cannot be undone.')
    expect(confirm().textContent?.trim()).toBe('Delete')
    expect(cancel().textContent?.trim()).toBe('Keep record')
    confirm().click()
    await fixture.whenStable()
    expect(consumer.deleted).toBe(1)
    expect(consumer.deleteOpen()).toBe(false)
    expect(consumer.confirmed).toBe(0)
    expect(consumer.canceled).toBe(0)
    expect(consumer.kept).toBe(0)
    consumer.deleteOpen.set(true)
    await fixture.whenStable()
    cancel().click()
    await fixture.whenStable()
    expect(consumer.kept).toBe(1)
  })

  it('accepts parent-controlled closure without synthesizing a user outcome', async () => {
    const { fixture, consumer, overlay } = await setup()
    consumer.leaveOpen.set(true)
    await fixture.whenStable()
    consumer.leaveOpen.set(false)
    await fixture.whenStable()
    expect(overlay.querySelector('[role="alertdialog"]')).toBeNull()
    expect(consumer.confirmed).toBe(0)
    expect(consumer.canceled).toBe(0)
    expect(consumer.changes).toEqual([])
  })
})
