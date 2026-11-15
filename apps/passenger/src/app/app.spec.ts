import { TestBed } from '@angular/core/testing'
import { provideRouter, type Route } from '@angular/router'
import { App } from './app'
import { appRoutes } from './app.routes'

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes)],
    }).compileComponents()
  })

  it('provides the application router outlet', async () => {
    const fixture = TestBed.createComponent(App)
    await fixture.whenStable()
    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector('router-outlet')).not.toBeNull()
  })

  it('mounts the passenger login page directly at /login', async () => {
    const loginRoute = appRoutes.find(route => route.path === 'login')
    const childRoutes = (await loginRoute?.loadChildren?.(loginRoute as Route, [])) as Route[]

    expect(childRoutes).toEqual(expect.arrayContaining([expect.objectContaining({ path: '' })]))
  })
})
