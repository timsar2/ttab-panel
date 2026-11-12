import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { SessionStore, provideAuth } from '@org/auth-data-access'
import { createWorkspaceRoutes, WorkspaceText } from '../index'

describe('workspace landing public routes', () => {
  it.each([
    {
      path: 'workspace',
      brand: 'First application',
      loginUrl: '/login',
      companiesCommands: ['/companies'],
    },
    {
      path: 'portal/home',
      brand: 'Fleet application',
      loginUrl: '/sign-in',
      companiesCommands: ['/choose'],
    },
  ])('reuses layout, identity and local-first logout at $path', async config => {
    const logout = vi.fn().mockResolvedValue(undefined)
    const text = signal<WorkspaceText>({
      navigation: 'Navigation',
      workspace: 'Workspace',
      administration: 'Administration',
      signOut: 'Sign out',
      heading: 'You are signed in',
      description: 'Choose a company.',
      chooseCompany: 'Choose a company',
    })
    const user = signal<{ id: string; firstName: string; lastName: string } | null>({
      id: 'fixture',
      firstName: 'Example',
      lastName: 'User',
    })
    TestBed.configureTestingModule({
      providers: [
        provideAuth({ apiUrl: '/api', tenant: 'test' }),
        {
          provide: SessionStore,
          useValue: { user, logout, configured: () => true, isAuthenticated: () => true },
        },
        provideRouter(createWorkspaceRoutes({ ...config, text: () => text })),
      ],
    })
    const harness = await RouterTestingHarness.create(`/${config.path}`)
    expect(harness.routeNativeElement?.querySelector('lib-app-layout')).not.toBeNull()
    expect(harness.routeNativeElement?.textContent).toContain(config.brand)
    expect(harness.routeNativeElement?.textContent).toContain('Example User')
    const link = harness.routeNativeElement?.querySelector('main a')
    expect(link?.getAttribute('href')).toBe(config.companiesCommands[0])
    text.update(value => ({ ...value, heading: 'Localized welcome' }))
    await harness.fixture.whenStable()
    expect(harness.routeNativeElement?.textContent).toContain('Localized welcome')
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true)
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('header [layoutHeader] button')
      ?.click()
    expect(logout).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith(config.loginUrl)
    user.set(null)
    await harness.fixture.whenStable()
    expect(harness.routeNativeElement?.textContent).not.toContain('Example User')
    expect(navigate).toHaveBeenCalledWith(config.loginUrl)
  })
})
