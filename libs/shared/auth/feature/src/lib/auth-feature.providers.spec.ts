import { DOCUMENT } from '@angular/common'
import { TestBed } from '@angular/core/testing'
import { describe, expect, it } from 'vitest'
import { AUTH_APPEARANCE, AUTH_FEATURE_CONFIG, provideAuthFeature } from './auth-feature.providers'

describe('auth feature providers', () => {
  it.each([
    ['', '', false, 'rtl', 'light'],
    ['', 'en', false, 'ltr', 'light'],
    ['ltr', 'fa', true, 'ltr', 'dark'],
    ['rtl', 'en', false, 'rtl', 'light'],
  ] as const)(
    'derives readonly appearance from document dir=%s lang=%s dark=%s',
    (dir, lang, dark, expectedDirection, expectedTheme) => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: DOCUMENT,
            useValue: {
              documentElement: {
                dir,
                lang,
                classList: { contains: () => dark },
              },
            },
          },
        ],
      })
      const appearance = TestBed.inject(AUTH_APPEARANCE)
      expect(appearance.direction()).toBe(expectedDirection)
      expect(appearance.theme()).toBe(expectedTheme)
      expect('set' in appearance.direction).toBe(false)
      expect('set' in appearance.theme).toBe(false)
      expect(appearance.toggleDirection).toBeUndefined()
      expect(appearance.toggleTheme).toBeUndefined()
    },
  )

  it('copies injected brand configuration instead of retaining mutable caller state', () => {
    const config = { brandName: 'Fleet', footer: 'Dispatch' }
    TestBed.configureTestingModule({ providers: [provideAuthFeature(config)] })
    config.brandName = 'Changed'
    expect(TestBed.inject(AUTH_FEATURE_CONFIG)).toEqual({
      brandName: 'Fleet',
      footer: 'Dispatch',
    })
  })
})
