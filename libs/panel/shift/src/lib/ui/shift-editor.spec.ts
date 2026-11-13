import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import {
  ShiftGroup,
  ShiftTime,
  ShiftType,
  SchedulingApi,
} from '@org/transport-scheduling-data-access'
import { of } from 'rxjs'
import { ShiftEditor } from './shift-editor'
import { SHIFT_FEATURE, SHIFT_LANGUAGE, SHIFT_MANAGE } from '../shift.routes'

describe('ShiftEditor', () => {
  it('opens the group form and renders Shift Type options fetched from the API', async () => {
    const groups: readonly ShiftGroup[] = []
    const types: readonly ShiftType[] = [{ id: 3, name: 'Production' }]
    const times: readonly ShiftTime[] = [{ id: 5, name: 'Morning', shiftTime: '07:00:00' }]
    const language = signal<'en' | 'fa'>('en')
    const api = {
      companyId: signal<number | null>(12),
      listGroups: vi.fn(() => of(groups)),
      listTypes: vi.fn(() => of(types)),
      listShiftTimes: vi.fn(() => of(times)),
      detail: vi.fn(() => of(null)),
      saveGroup: vi.fn(),
      saveShift: vi.fn(),
    }
    TestBed.configureTestingModule({
      imports: [ShiftEditor],
      providers: [
        provideRouter([]),
        { provide: SchedulingApi, useValue: api },
        { provide: SHIFT_FEATURE, useValue: { deniedMessage: 'Denied' } },
        { provide: SHIFT_MANAGE, useValue: signal(true) },
        { provide: SHIFT_LANGUAGE, useValue: language },
      ],
    })
    const fixture = TestBed.createComponent(ShiftEditor)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    const addGroup = fixture.nativeElement.querySelector(
      '[aria-label="Create shift group"]',
    ) as HTMLButtonElement
    expect(addGroup).toBeTruthy()
    addGroup.click()
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(api.listTypes).toHaveBeenCalledOnce()
    expect(document.body.textContent).toContain('Create shift group')
    expect(document.body.querySelector('#group-type option[value="3"]')?.textContent).toContain(
      'Production',
    )

    language.set('fa')
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(document.body.textContent).toContain('ایجاد گروه شیفت')
    expect(document.body.textContent).toContain('نوع شیفت')
  })
})
