import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { describe, expect, it } from 'vitest'
import { AuthLayout } from './auth-layout'

@Component({
  imports: [AuthLayout],
  template: `<lib-auth-layout dir="rtl"
    ><a authHeader href="/">Example</a><button authActions>Language</button>
    <aside authBrand>Brand</aside>
    <section>Form</section>
    <span authFooter>Footer</span></lib-auth-layout
  >`,
})
class Host {}

describe('AuthLayout', () => {
  it('projects independent header, actions, brand, content and footer slots', async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
    }).compileComponents()
    const fixture = TestBed.createComponent(Host)
    await fixture.whenStable()
    const element: HTMLElement = fixture.nativeElement
    expect(element.querySelector('header a')?.textContent).toBe('Example')
    expect(element.querySelector('header button')?.textContent).toBe('Language')
    expect(element.querySelector('main .brand-slot aside')?.textContent).toBe('Brand')
    expect(element.querySelector('main .content-slot section')?.textContent).toBe('Form')
    expect(element.querySelector('footer')?.textContent).toBe('Footer')
    expect(element.querySelector('lib-auth-layout')?.getAttribute('dir')).toBe('rtl')
    expect(element.querySelector('main')?.textContent).not.toContain('Footer')
  })
})
