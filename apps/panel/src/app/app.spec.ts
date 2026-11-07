import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appRoutes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes)],
    }).compileComponents();
  });

  it('renders only the application route outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('app-nx-welcome')).toBeNull();
  });

  it.each(['/', '/login', '/unknown'])(
    'routes %s to the login page',
    async (url) => {
      const harness = await RouterTestingHarness.create(url);
      expect(
        harness.routeNativeElement?.querySelector(
          'input[autocomplete="username"]',
        ),
      ).not.toBeNull();
      expect(
        harness.routeNativeElement?.querySelector(
          'input[autocomplete="current-password"]',
        ),
      ).not.toBeNull();
    },
  );
});
