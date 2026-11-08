import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { describe, expect, it } from 'vitest'
import { AppLayout } from './app-layout'

@Component({
  imports: [AppLayout],
  template: `<lib-app-layout
    ><div layoutHeader>Account</div>
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
    expect(element.querySelector('header')?.textContent).toBe('Account')
    expect(element.querySelector('aside nav')?.textContent).toBe('Routes')
    expect(element.querySelector('main section')?.textContent).toBe('Workspace')
    expect(element.querySelector('main')?.textContent).not.toContain('Account')
  })
})
