import { TestBed } from '@angular/core/testing'
import { Routes } from '@angular/router'
import { PLATFORM_APP_OPTIONS, providePlatformApp } from './platform-app'

const routes: Routes = [{ path: 'login' }]

describe('providePlatformApp', () => {
  it('applies common auth defaults and consumer identity', async () => {
    await TestBed.configureTestingModule({
      providers: providePlatformApp({ id: 'driver', brandName: 'Driver', routes }),
    }).compileComponents()

    const config = TestBed.inject(PLATFORM_APP_OPTIONS)

    expect(config.auth).toMatchObject({
      apiUrl: '/api',
      mode: 'cookie',
      tenant: 'root',
      loginUrl: '/login',
      afterLoginUrl: '/workspace',
    })
    expect(config.brandName).toBe('Driver')
    expect(config.themeStorageKey).toBe('driver.theme.v1')
  })

  it('allows an app to override deployment auth paths without rebuilding providers', async () => {
    await TestBed.configureTestingModule({
      providers: providePlatformApp({
        id: 'passenger',
        brandName: 'Passenger',
        routes,
        auth: { loginUrl: '/sign-in', afterLoginUrl: '/trips' },
      }),
    }).compileComponents()

    expect(TestBed.inject(PLATFORM_APP_OPTIONS).auth).toMatchObject({
      loginUrl: '/sign-in',
      afterLoginUrl: '/trips',
    })
  })
})
