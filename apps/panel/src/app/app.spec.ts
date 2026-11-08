import { DeferBlockState, TestBed } from '@angular/core/testing'
import { App } from './app'
import { provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { appRoutes } from './app.routes'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideAuth } from '@org/auth-data-access'
import { provideAuthFeature } from '@org/auth-feature'
import { panelConfig } from './panel.config'
import { provideTheme } from '@org/theme'

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideAuth(panelConfig),
        provideHttpClientTesting(),
        provideAuthFeature({ brandName: panelConfig.brandName }),
        provideTheme({ storageKey: 'panel.test.theme' }),
        provideRouter(appRoutes),
      ],
    }).compileComponents()
  })

  it('renders the route outlet and reusable theme panel', async () => {
    const fixture = TestBed.createComponent(App)
    await fixture.whenStable()
    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector('router-outlet')).not.toBeNull()
    const blocks = await fixture.getDeferBlocks()
    await blocks[0].render(DeferBlockState.Complete)
    await fixture.whenStable()
    expect(compiled.querySelector('lib-theme-panel')).not.toBeNull()
    expect(compiled.querySelector('app-nx-welcome')).toBeNull()
  })

  it.each(['/', '/login', '/unknown', '/workspace', '/auth/login'])(
    'routes %s to the login page',
    async url => {
      const harness = await RouterTestingHarness.create(url)
      expect(
        harness.routeNativeElement?.querySelector('input[autocomplete="username"]'),
      ).not.toBeNull()
      expect(
        harness.routeNativeElement?.querySelector('input[autocomplete="current-password"]'),
      ).not.toBeNull()
    },
  )
})
