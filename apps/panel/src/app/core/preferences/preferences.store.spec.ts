import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Directionality } from '@angular/cdk/bidi';
import { AppDirectionality } from './app-directionality';
import { PreferencesStore } from './preferences.store';

describe('PreferencesStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useClass: AppDirectionality }],
    });
  });

  afterEach(() => {
    const document = TestBed.inject(DOCUMENT);
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'fa';
    document.documentElement.classList.remove('dark');
  });

  it('defaults to Persian RTL and light mode', () => {
    const store = TestBed.inject(PreferencesStore);
    expect(store.direction()).toBe('rtl');
    expect(store.language()).toBe('fa');
    expect(store.isRtl()).toBe(true);
    expect(store.theme()).toBe('light');
  });

  it('synchronizes direction and language with the document', () => {
    const store = TestBed.inject(PreferencesStore);
    const root = TestBed.inject(DOCUMENT).documentElement;
    store.toggleDirection();
    expect(root.dir).toBe('ltr');
    expect(root.lang).toBe('en');
    store.setDirection('rtl');
    expect(root.dir).toBe('rtl');
    expect(root.lang).toBe('fa');
  });

  it('synchronizes the Spartan dark selector', () => {
    const store = TestBed.inject(PreferencesStore);
    const root = TestBed.inject(DOCUMENT).documentElement;
    store.toggleTheme();
    expect(store.theme()).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
    store.setTheme('light');
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('notifies CDK overlays when direction changes', () => {
    const directionality = TestBed.inject(Directionality);
    const changed = vi.fn();
    directionality.change.subscribe(changed);
    TestBed.tick();
    TestBed.inject(PreferencesStore).setDirection('ltr');
    TestBed.tick();
    expect(directionality.value).toBe('ltr');
    expect(changed).toHaveBeenCalledExactlyOnceWith('ltr');
  });

  it('starts fresh for a new application injector', () => {
    TestBed.inject(PreferencesStore).setDirection('ltr');
    TestBed.inject(PreferencesStore).setTheme('dark');
    TestBed.resetTestingModule();
    expect(TestBed.inject(PreferencesStore).direction()).toBe('rtl');
    expect(TestBed.inject(PreferencesStore).theme()).toBe('light');
  });
});
