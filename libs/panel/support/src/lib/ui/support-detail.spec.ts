import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { SupportApi, SupportStore, supportCompanyId } from '@org/transport-support-data-access'
import { BehaviorSubject, of } from 'rxjs'
import { SUPPORT_CAN_REPLY, SUPPORT_LANGUAGE } from '../support.routes'
import { SupportDetailPage } from './support-detail'

describe('SupportDetailPage', () => {
  it('loads details/messages by numeric request ID and sends append-only staff replies', async () => {
    const routeParams = new BehaviorSubject(convertToParamMap({ id: '18' }))
    const loadDetail = vi.fn()
    const loadMessages = vi.fn()
    const sendMessage = vi.fn(() => of(undefined))
    const store = {
      detailStatus: signal('ready'),
      detail: signal({
        id: 18,
        supportTypeId: 2,
        supportTypeName: 'User ticket',
        companyId: 4,
        personId: 21,
        mobileNumber: '123456789',
        requestDate: '2026-11-14',
        subject: 'Broken app',
        isAnswered: false,
        caseFile: [],
      }),
      messagesStatus: signal('ready'),
      messages: signal([{ body: 'Need help', isAnswer: false }]),
      loadDetail,
      loadMessages,
      sendMessage,
    }
    await TestBed.configureTestingModule({
      imports: [SupportDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: routeParams.asObservable(),
            snapshot: { paramMap: routeParams.value },
          },
        },
        { provide: SupportStore, useValue: store },
        { provide: SupportApi, useValue: { companyId: signal(supportCompanyId(4)) } },
        { provide: SUPPORT_LANGUAGE, useValue: signal<'en' | 'fa'>('en') },
        { provide: SUPPORT_CAN_REPLY, useValue: signal(true) },
      ],
    }).compileComponents()
    const fixture = TestBed.createComponent(SupportDetailPage)
    fixture.detectChanges()
    await fixture.whenStable()
    expect(loadDetail).toHaveBeenCalledWith(18)
    expect(loadMessages).toHaveBeenCalledWith(18)
    expect(fixture.nativeElement.textContent).toContain('timestamps and ordering are not provided')
    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(1)

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement
    textarea.value = 'Please restart the app.'
    textarea.dispatchEvent(new Event('input'))
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await fixture.whenStable()
    expect(sendMessage).toHaveBeenCalledWith(18, 'Please restart the app.')
    expect(loadMessages).toHaveBeenCalledTimes(2)
    fixture.destroy()
  })
})
