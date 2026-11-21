import { TestBed } from '@angular/core/testing'
import { BrnCalendarI18nService } from '@spartan-ng/brain/calendar'
import { JalaliDatePicker } from './jalali-date-picker'

describe('JalaliDatePicker', () => {
  it('updates calendar language without reacting to its own configuration write', async () => {
    await TestBed.configureTestingModule({ imports: [JalaliDatePicker] }).compileComponents()
    const fixture = TestBed.createComponent(JalaliDatePicker)
    fixture.detectChanges()
    await fixture.whenStable()

    const calendarI18n = fixture.debugElement.injector.get(BrnCalendarI18nService)
    expect(calendarI18n.config().months()[0]).toBe('فروردین')

    fixture.componentRef.setInput('language', 'en')
    fixture.detectChanges()
    await fixture.whenStable()

    expect(calendarI18n.config().months()[0]).toBe('Farvardin')
    fixture.destroy()
  })
})
