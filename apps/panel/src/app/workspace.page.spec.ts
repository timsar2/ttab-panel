import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { SessionStore } from '@org/auth-data-access'
import { WorkspacePage } from './workspace.page'

describe('WorkspacePage', () => {
  it('composes the shared layout and clears the session before leaving', async () => {
    const logout = vi.fn().mockResolvedValue(undefined)
    TestBed.configureTestingModule({
      imports: [WorkspacePage],
      providers: [
        provideRouter([]),
        {
          provide: SessionStore,
          useValue: {
            user: signal({
              id: 'fixture-user',
              firstName: 'Example',
              lastName: 'User',
            }),
            logout,
          },
        },
      ],
    })
    const router = TestBed.inject(Router)
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true)
    const fixture = TestBed.createComponent(WorkspacePage)
    await fixture.whenStable()
    const element = fixture.nativeElement as HTMLElement
    expect(element.querySelector('lib-app-layout')).not.toBeNull()
    expect(element.textContent).toContain('Example User')
    element.querySelector('button')?.click()
    expect(logout).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/login')
  })
})
