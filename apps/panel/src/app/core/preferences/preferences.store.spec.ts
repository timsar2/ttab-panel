import { DOCUMENT } from '@angular/common'
import { TestBed } from '@angular/core/testing'
import { Directionality } from '@angular/cdk/bidi'
import { AppDirectionality } from './app-directionality'
import { PreferencesStore } from './preferences.store'

describe('PreferencesStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useClass: AppDirectionality }],
    })
  })

  afterEach(() => {
    const document = TestBed.inject(DOCUMENT)
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'fa'
    document.documentElement.classList.remove('dark')
  })

  it('defaults to Persian RTL', () => {
    const store = TestBed.inject(PreferencesStore)
    expect(store.direction()).toBe('rtl')
    expect(store.language()).toBe('fa')
    expect(store.isRtl()).toBe(true)
  })

  it('synchronizes direction and language with the document', () => {
    const store = TestBed.inject(PreferencesStore)
    const root = TestBed.inject(DOCUMENT).documentElement
    store.toggleDirection()
    expect(root.dir).toBe('ltr')
    expect(root.lang).toBe('en')
    store.setDirection('rtl')
    expect(root.dir).toBe('rtl')
    expect(root.lang).toBe('fa')
  })

  it('does not overwrite the shared theme when synchronizing direction', () => {
    const store = TestBed.inject(PreferencesStore)
    const root = TestBed.inject(DOCUMENT).documentElement
    root.classList.add('dark')
    store.toggleDirection()
    expect(root.classList.contains('dark')).toBe(true)
  })

  it('notifies CDK overlays when direction changes', () => {
    const directionality = TestBed.inject(Directionality)
    const changed = vi.fn()
    directionality.change.subscribe(changed)
    TestBed.tick()
    TestBed.inject(PreferencesStore).setDirection('ltr')
    TestBed.tick()
    expect(directionality.value).toBe('ltr')
    expect(changed).toHaveBeenCalledExactlyOnceWith('ltr')
  })

  it('starts fresh for a new application injector', () => {
    TestBed.inject(PreferencesStore).setDirection('ltr')
    TestBed.resetTestingModule()
    expect(TestBed.inject(PreferencesStore).direction()).toBe('rtl')
  })

  it('exposes the live writable signal required by current CDK overlays', () => {
    const directionality = TestBed.inject(Directionality)
    const preferences = TestBed.inject(PreferencesStore)
    expect(directionality.valueSignal()).toBe('rtl')
    preferences.setDirection('ltr')
    expect(directionality.valueSignal()).toBe('ltr')
    expect(directionality.value).toBe('ltr')
    TestBed.tick()
    directionality.valueSignal.set('rtl')
    TestBed.tick()
    expect(preferences.direction()).toBe('rtl')
    expect(TestBed.inject(DOCUMENT).documentElement.dir).toBe('rtl')
  })
})
