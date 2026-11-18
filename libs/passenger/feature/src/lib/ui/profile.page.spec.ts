import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { PassengerApi } from '../passenger.api'
import { PASSENGER_FEATURE_CONFIG } from '../passenger.routes'
import { PassengerProfilePage } from './profile.page'

describe('PassengerProfilePage', () => {
  let fixture: ComponentFixture<PassengerProfilePage>
  let api: {
    profile: ReturnType<typeof vi.fn>
    provinces: ReturnType<typeof vi.fn>
    updateProfile: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    api = {
      profile: vi.fn().mockResolvedValue({
        id: 901,
        firstName: 'Ava',
        lastName: 'Reed',
        profileImage: 'https://example.test/passenger.jpg',
      }),
      provinces: vi.fn().mockResolvedValue([]),
      updateProfile: vi.fn().mockResolvedValue(undefined),
    }
    await TestBed.configureTestingModule({
      imports: [PassengerProfilePage],
      providers: [
        { provide: PassengerApi, useValue: api },
        {
          provide: PASSENGER_FEATURE_CONFIG,
          useValue: { identity: () => ({}), language: signal<'fa' | 'en'>('en') },
        },
      ],
    }).compileComponents()
    fixture = TestBed.createComponent(PassengerProfilePage)
  })

  it('places the passenger photo above profile fields and makes it open the file picker', async () => {
    fixture.detectChanges()
    await vi.waitFor(() => {
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('.profile-identity')).not.toBeNull()
    })
    await fixture.whenStable()
    fixture.detectChanges()

    const identity = fixture.nativeElement.querySelector('.profile-identity') as HTMLElement
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement
    const photoButton = identity.querySelector('.profile-avatar-trigger') as HTMLButtonElement
    const photo = photoButton.querySelector('img') as HTMLImageElement
    const fileInput = identity.querySelector('input[type="file"]') as HTMLInputElement
    const fields = form.querySelector('.grid') as HTMLElement
    const pickerSpy = vi.spyOn(fileInput, 'click')

    expect(form.firstElementChild).toBe(identity)
    expect(photo.src).toBe('https://example.test/passenger.jpg')
    expect(photoButton.getAttribute('aria-label')).toBe('Change profile photo')
    expect(fileInput.accept).toBe('image/jpeg,image/png,image/webp')
    expect(identity.compareDocumentPosition(fields) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    photoButton.click()
    expect(pickerSpy).toHaveBeenCalledOnce()
    expect(api.profile).toHaveBeenCalled()
  })
})
