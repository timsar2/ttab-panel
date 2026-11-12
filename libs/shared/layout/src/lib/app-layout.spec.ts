import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { describe, expect, it } from 'vitest'
import { AppLayout } from './app-layout'
import { provideRouter } from '@angular/router'

@Component({
  imports: [AppLayout],
  template: `<lib-app-layout
    ><span layoutBrand>Example brand</span>
    <div layoutHeader>Account</div>
    <nav layoutNavigation>Routes</nav>
    <section>Workspace</section></lib-app-layout
  >`,
})
class Host {}

describe('AppLayout', () => {
  it('projects header, navigation and main without owning application state', async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
    }).compileComponents()
    const fixture = TestBed.createComponent(Host)
    await fixture.whenStable()
    const element: HTMLElement = fixture.nativeElement
    expect(element.querySelector('header [layoutHeader]')?.textContent).toBe('Account')
    expect(element.querySelector('hlm-sidebar nav')?.textContent).toBe('Routes')
    expect(element.querySelector('.theme-brand')?.textContent).toBe('Example brand')
    expect(element.querySelector('main section')?.textContent).toBe('Workspace')
    expect(element.querySelector('main')?.textContent).not.toContain('Account')
    expect(element.querySelector('main')?.textContent).not.toContain('Example brand')
  })

  it('renders configured links, groups and disabled future modules without dead routes', async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([])],
    }).compileComponents()
    const fixture = TestBed.createComponent(AppLayout)
    fixture.componentRef.setInput('items', [
      { id: 'home', label: 'Home', group: 'Management', commands: ['/'], exact: true },
      { id: 'future', label: 'Vehicles', group: 'Operations', hint: 'Not implemented yet' },
    ])
    await fixture.whenStable()
    const element: HTMLElement = fixture.nativeElement
    expect(element.querySelector('a[hlmSidebarMenuButton]')?.getAttribute('href')).toBe('/')
    expect(element.querySelector('button[hlmSidebarMenuButton]')?.hasAttribute('disabled')).toBe(
      true,
    )
    expect(
      element.querySelector('button[hlmSidebarMenuButton]')?.getAttribute('aria-label'),
    ).toContain('Not implemented yet')
    expect(element.querySelectorAll('.theme-menu-heading')).toHaveLength(2)
    expect(element.querySelector('.theme-navigation')?.textContent).not.toContain('Routes')
  })
})
