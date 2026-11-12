import { ChangeDetectionStrategy, Component, PLATFORM_ID, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { FileUploadControl, UploadSelection } from '../index'

class ControlledReader {
  static instances: ControlledReader[] = []
  readyState = 0
  result: string | ArrayBuffer | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  readonly readAsDataURL = vi.fn(() => {
    this.readyState = 1
  })
  readonly abort = vi.fn(() => {
    this.readyState = 2
    this.onabort?.()
  })
  constructor() {
    ControlledReader.instances.push(this)
  }
  complete(result: string) {
    this.result = result
    this.readyState = 2
    this.onload?.()
  }
}

@Component({
  imports: [FileUploadControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-file-upload
      [(value)]="image"
      id="logo"
      label="Logo"
      [allowedTypes]="imageTypes()"
      [maxBytes]="limit()"
      [policyDescription]="policyDescription()"
      [existingName]="existingName()"
      [disabled]="locked()"
      [resetKey]="contextKey()"
      [allowRemove]="removal()"
    />
    <lib-file-upload
      [(value)]="document"
      id="document"
      label="Document"
      [allowedTypes]="documentTypes"
      [maxBytes]="20"
      [allowRemove]="true"
    />
  `,
})
class Consumer {
  readonly image = signal<UploadSelection>({ kind: 'keep' })
  readonly document = signal<UploadSelection>({ kind: 'keep' })
  readonly imageTypes = signal<readonly { mime: string; extensions: readonly string[] }[]>([
    { mime: 'image/png', extensions: ['.png'] },
  ])
  readonly documentTypes = [{ mime: 'application/pdf', extensions: ['.pdf'] }] as const
  readonly existingName = signal<string | null>('existing.png')
  readonly limit = signal(10)
  readonly policyDescription = signal<string | null>(null)
  readonly locked = signal(false)
  readonly removal = signal(false)
  readonly contextKey = signal<string | number>(0)
}

describe('FileUploadControl consumers', () => {
  const NativeURL = URL
  const createUrl = vi.fn<(...args: [Blob]) => string>()
  const revokeUrl = vi.fn()
  beforeEach(() => {
    ControlledReader.instances = []
    createUrl.mockReset()
    let urlSequence = 0
    createUrl.mockImplementation(() => `blob:local-${++urlSequence}`)
    revokeUrl.mockClear()
    vi.stubGlobal('FileReader', ControlledReader)
    vi.stubGlobal(
      'URL',
      class extends NativeURL {
        static override createObjectURL = createUrl
        static override revokeObjectURL = revokeUrl
      },
    )
  })
  afterEach(() => {
    TestBed.resetTestingModule()
    vi.unstubAllGlobals()
  })

  async function setup(server = false) {
    TestBed.configureTestingModule({
      imports: [Consumer],
      providers: server ? [{ provide: PLATFORM_ID, useValue: 'server' }] : [],
    })
    const fixture = TestBed.createComponent(Consumer)
    await fixture.whenStable()
    const root: HTMLElement = fixture.nativeElement
    const imageInput = root.querySelector('#logo') as HTMLInputElement
    const documentInput = root.querySelector('#document') as HTMLInputElement
    const choose = async (file: File, input = imageInput) => {
      Object.defineProperty(input, 'files', { configurable: true, value: [file] })
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await fixture.whenStable()
    }
    const imageRoot = root.querySelector('lib-file-upload') as HTMLElement
    const button = (text: string) =>
      Array.from(imageRoot.querySelectorAll('button')).find(button =>
        button.textContent?.includes(text),
      ) as HTMLButtonElement
    return {
      fixture,
      consumer: fixture.componentInstance,
      root,
      imageRoot,
      imageInput,
      documentInput,
      choose,
      button,
    }
  }

  it('supports a readable policy description without changing file constraints or default hints', async () => {
    const { fixture, consumer, imageRoot, imageInput, choose } = await setup()
    const policy = imageRoot.querySelector('#logo-policy')
    expect(policy?.textContent).toContain('image/png,.png')
    expect(policy?.textContent).toContain('10 bytes')
    consumer.policyDescription.set('PNG images. Up to 10 bytes.')
    await fixture.whenStable()
    expect(policy?.textContent?.trim()).toBe('PNG images. Up to 10 bytes.')
    expect(imageInput.accept).toBe('image/png,.png')
    expect(imageInput.getAttribute('aria-describedby')).toContain('logo-policy')
    await choose(new File(['too large for this input'], 'large.png', { type: 'image/png' }))
    expect(consumer.image().kind).toBe('invalid')
    expect(ControlledReader.instances).toHaveLength(0)
    consumer.policyDescription.set(null)
    await fixture.whenStable()
    expect(policy?.textContent).toContain('10 bytes')
  })
  const png = (name = 'logo.PNG', contents = 'image') =>
    new File([contents], name, { type: 'image/png' })

  it('supports image and document policies with accessible labels, status and minimum targets', async () => {
    const { root, imageInput, documentInput, imageRoot } = await setup()
    expect(imageInput.accept).toBe('image/png,.png')
    expect(documentInput.accept).toBe('application/pdf,.pdf')
    expect(root.querySelector('label[for="logo"]')?.textContent).toContain('Logo')
    expect(imageInput.getAttribute('aria-label')).toBe('Logo')
    expect(imageInput.getAttribute('aria-describedby')).toBe('logo-policy logo-status')
    expect(root.querySelector('#logo-status')?.textContent).toContain(
      'Keeping existing file: existing.png',
    )
    expect(imageRoot.querySelector('button')).toBeNull()
    for (const control of root.querySelectorAll('input, button')) {
      expect(control.classList.contains('min-h-11')).toBe(true)
    }
  })

  it.each([
    ['wrong MIME', () => new File(['abc'], 'logo.png', { type: 'application/pdf' })],
    ['missing MIME', () => new File(['abc'], 'logo.png')],
    ['wrong extension', () => new File(['abc'], 'logo.pdf', { type: 'image/png' })],
    ['missing extension', () => new File(['abc'], 'logo', { type: 'image/png' })],
    ['oversized file', () => png('logo.png', '01234567890')],
    ['empty file', () => png('logo.png', '')],
  ])('rejects %s before reading or creating previews', async (_name, makeFile) => {
    const { choose, consumer, imageInput, root } = await setup()
    await choose(makeFile())
    expect(consumer.image().kind).toBe('invalid')
    expect(ControlledReader.instances).toHaveLength(0)
    expect(createUrl).not.toHaveBeenCalled()
    expect(imageInput.value).toBe('')
    expect(imageInput.getAttribute('aria-invalid')).toBe('true')
    expect(imageInput.getAttribute('aria-describedby')).toContain('logo-error')
    expect(root.querySelector('#logo-error')?.textContent).toBeTruthy()
  })

  it.each([0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'fails closed for invalid maxBytes %s',
    async limit => {
      const { fixture, consumer, choose } = await setup()
      consumer.limit.set(limit)
      await fixture.whenStable()
      await choose(png())
      expect(consumer.image().kind).toBe('invalid')
      expect(ControlledReader.instances).toHaveLength(0)
    },
  )

  it('publishes reading then exact replacement data and previews only the accepted local image', async () => {
    const { fixture, consumer, choose, imageRoot, imageInput } = await setup()
    const file = png('logo.PNG', '0123456789')
    await choose(file)
    expect(consumer.image()).toEqual({ kind: 'reading' })
    expect(imageRoot.textContent).toContain('Reading file...')
    ControlledReader.instances[0].complete('data:image/png;base64,aW1hZ2U=')
    await fixture.whenStable()
    expect(consumer.image()).toEqual({
      kind: 'replace',
      file: {
        name: 'logo.PNG',
        mime: 'image/png',
        size: 10,
        extension: '.png',
        dataUrl: 'data:image/png;base64,aW1hZ2U=',
      },
    })
    expect(createUrl).toHaveBeenCalledWith(file)
    expect(imageRoot.querySelector('img')?.getAttribute('src')).toBe('blob:local-1')
    expect(imageRoot.querySelector('img')?.alt).toBe('Logo preview')
    expect(imageInput.value).toBe('')
  })

  it('shows a configured document as file info and a download, never as an image or embed', async () => {
    const { fixture, consumer, choose, documentInput, root } = await setup()
    const file = new File(['pdf'], 'document.PDF', { type: 'application/pdf' })
    await choose(file, documentInput)
    ControlledReader.instances[0].complete('data:application/pdf;base64,cGRm')
    await fixture.whenStable()
    expect(consumer.document()).toEqual({
      kind: 'replace',
      file: {
        name: 'document.PDF',
        mime: 'application/pdf',
        size: 3,
        extension: '.pdf',
        dataUrl: 'data:application/pdf;base64,cGRm',
      },
    })
    const link = root.querySelector('a') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('blob:local-1')
    expect(link.download).toBe('document.PDF')
    expect(link.classList.contains('min-h-11')).toBe(true)
    expect(root.textContent).toContain('document.PDF')
    expect(root.querySelector('img, iframe, embed, object')).toBeNull()
  })

  it('aborts superseded reads and ignores late completions after a parent context reset', async () => {
    const { fixture, consumer, choose } = await setup()
    await choose(png('first.png'))
    const first = ControlledReader.instances[0]
    const lateFirst = first.onload
    await choose(png('second.png'))
    expect(first.abort).toHaveBeenCalledOnce()
    first.result = 'data:image/png;base64,b2xk'
    lateFirst?.()
    expect(consumer.image().kind).toBe('reading')
    expect(createUrl).not.toHaveBeenCalled()
    const second = ControlledReader.instances[1]
    const lateSecond = second.onload
    consumer.contextKey.set('another-company')
    await fixture.whenStable()
    second.result = 'data:image/png;base64,b2xk'
    lateSecond?.()
    expect(createUrl).not.toHaveBeenCalled()
    await fixture.whenStable()
    expect(second.abort).toHaveBeenCalledOnce()
    expect(consumer.image()).toEqual({ kind: 'keep' })
  })

  it('revokes previews on replacement, reset/keep, external keep and destruction; same file can be reselected', async () => {
    const { fixture, consumer, choose, button, imageRoot } = await setup()
    const file = png()
    await choose(file)
    ControlledReader.instances[0].complete('data:image/png;base64,YQ==')
    await fixture.whenStable()
    await choose(file)
    expect(revokeUrl).toHaveBeenCalledWith('blob:local-1')
    ControlledReader.instances[1].complete('data:image/png;base64,YQ==')
    await fixture.whenStable()
    button('Keep existing').click()
    await fixture.whenStable()
    expect(revokeUrl).toHaveBeenCalledWith('blob:local-2')
    expect(consumer.image()).toEqual({ kind: 'keep' })
    expect(imageRoot.querySelector('img')).toBeNull()
    await choose(file)
    ControlledReader.instances[2].complete('data:image/png;base64,YQ==')
    await fixture.whenStable()
    consumer.image.set({ kind: 'keep' })
    await fixture.whenStable()
    expect(revokeUrl).toHaveBeenCalledWith('blob:local-3')
    await choose(file)
    ControlledReader.instances[3].complete('data:image/png;base64,YQ==')
    await fixture.whenStable()
    fixture.destroy()
    expect(revokeUrl).toHaveBeenCalledWith('blob:local-4')
    expect(revokeUrl).toHaveBeenCalledTimes(4)
  })

  it('resets and cleans previews when key, policy, size limit or existing context changes', async () => {
    const { fixture, consumer, choose } = await setup()
    const changes = [
      () => consumer.contextKey.set(1),
      () => consumer.existingName.set('other.png'),
      () => consumer.limit.set(11),
      () => consumer.imageTypes.set([{ mime: 'image/png', extensions: ['.PNG'] }]),
    ]
    for (const change of changes) {
      await choose(png())
      ControlledReader.instances[ControlledReader.instances.length - 1].complete(
        'data:image/png;base64,YQ==',
      )
      await fixture.whenStable()
      change()
      await fixture.whenStable()
      expect(consumer.image()).toEqual({ kind: 'keep' })
    }
    expect(revokeUrl).toHaveBeenCalledTimes(4)
  })

  it('discards a pending read on Keep and ignores completion after external keep or destroy', async () => {
    const { fixture, consumer, choose, button } = await setup()
    await choose(png())
    const first = ControlledReader.instances[0]
    button('Keep existing').click()
    await fixture.whenStable()
    expect(first.abort).toHaveBeenCalledOnce()
    expect(consumer.image().kind).toBe('keep')
    await choose(png())
    const second = ControlledReader.instances[1]
    const late = second.onload
    consumer.image.set({ kind: 'keep' })
    await fixture.whenStable()
    second.result = 'data:image/png;base64,YQ=='
    late?.()
    await fixture.whenStable()
    expect(second.abort).toHaveBeenCalledOnce()
    expect(consumer.image().kind).toBe('keep')
    await choose(png())
    const third = ControlledReader.instances[2]
    const afterDestroy = third.onload
    fixture.destroy()
    third.result = 'data:image/png;base64,YQ=='
    afterDestroy?.()
    expect(third.abort).toHaveBeenCalledOnce()
    expect(createUrl).not.toHaveBeenCalled()
  })

  it('rejects a stale completion immediately when a child reset input or model changes, before cleanup effects', async () => {
    TestBed.configureTestingModule({ imports: [FileUploadControl] })
    const fixture = TestBed.createComponent(FileUploadControl)
    fixture.componentRef.setInput('id', 'direct-file')
    fixture.componentRef.setInput('label', 'Direct file')
    fixture.componentRef.setInput('allowedTypes', [{ mime: 'image/png', extensions: ['.png'] }])
    fixture.componentRef.setInput('maxBytes', 10)
    await fixture.whenStable()
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement
    for (const reset of [
      () => fixture.componentRef.setInput('resetKey', 'next-record'),
      () => fixture.componentInstance.value.set({ kind: 'keep' }),
    ]) {
      Object.defineProperty(input, 'files', { configurable: true, value: [png()] })
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await fixture.whenStable()
      const reader = ControlledReader.instances[ControlledReader.instances.length - 1]
      const late = reader.onload
      reset()
      reader.result = 'data:image/png;base64,YQ=='
      late?.()
      expect(createUrl).not.toHaveBeenCalled()
      await fixture.whenStable()
      expect(reader.abort).toHaveBeenCalledOnce()
      expect(fixture.componentInstance.value()).toEqual({ kind: 'keep' })
    }
  })

  it('emits removal only when explicitly allowed and locks input/reset/remove while disabled', async () => {
    const { fixture, consumer, choose, button, imageInput } = await setup()
    expect(button('Remove')).toBeUndefined()
    consumer.removal.set(true)
    await fixture.whenStable()
    button('Remove').click()
    await fixture.whenStable()
    expect(consumer.image()).toEqual({ kind: 'remove' })
    consumer.locked.set(true)
    await fixture.whenStable()
    expect(imageInput.disabled).toBe(true)
    expect(button('Remove').disabled).toBe(true)
    expect(button('Keep existing').disabled).toBe(true)
    button('Keep existing').click()
    await choose(png())
    expect(consumer.image()).toEqual({ kind: 'remove' })
    expect(ControlledReader.instances).toHaveLength(0)
    consumer.locked.set(false)
    await fixture.whenStable()
    button('Keep existing').click()
    await fixture.whenStable()
    expect(consumer.image()).toEqual({ kind: 'keep' })
  })

  it('reports read errors and permits retry without leaving a preview', async () => {
    const { fixture, consumer, choose } = await setup()
    await choose(png())
    ControlledReader.instances[0].onerror?.()
    await fixture.whenStable()
    expect(consumer.image().kind).toBe('invalid')
    expect(createUrl).not.toHaveBeenCalled()
    await choose(png())
    ControlledReader.instances[1].complete('data:image/png;base64,YQ==')
    await fixture.whenStable()
    expect(consumer.image().kind).toBe('replace')
  })

  it('supports repeated MIME policies while enforcing the matching filename extension', async () => {
    const { fixture, consumer, choose } = await setup()
    consumer.imageTypes.set([
      { mime: 'image/png', extensions: ['.other'] },
      { mime: 'image/png', extensions: ['.PNG'] },
      { mime: 'application/pdf', extensions: ['.pdf'] },
    ])
    await fixture.whenStable()
    await choose(png())
    expect(consumer.image().kind).toBe('reading')
    await choose(new File(['abc'], 'wrong.pdf', { type: 'image/png' }))
    expect(consumer.image().kind).toBe('invalid')
    expect(ControlledReader.instances[0].abort).toHaveBeenCalledOnce()
  })

  it('rejects malformed read results and remains usable without local object URL support', async () => {
    const { fixture, consumer, choose, imageRoot } = await setup()
    await choose(png())
    ControlledReader.instances[0].complete('not-a-data-url')
    await fixture.whenStable()
    expect(consumer.image().kind).toBe('invalid')
    expect(createUrl).not.toHaveBeenCalled()
    createUrl.mockImplementationOnce(() => {
      throw new Error('No local preview support')
    })
    await choose(png())
    ControlledReader.instances[1].complete('data:image/png;base64,YQ==')
    await fixture.whenStable()
    expect(consumer.image().kind).toBe('replace')
    expect(imageRoot.querySelector('img')).toBeNull()
    expect(imageRoot.textContent).toContain('logo.PNG')
  })

  it('revokes a replacement preview on Remove and preserves it when the file picker is canceled', async () => {
    const { fixture, consumer, choose, imageInput, button } = await setup()
    consumer.removal.set(true)
    await fixture.whenStable()
    await choose(png())
    ControlledReader.instances[0].complete('data:image/png;base64,YQ==')
    await fixture.whenStable()
    const replacement = consumer.image()
    Object.defineProperty(imageInput, 'files', { configurable: true, value: [] })
    imageInput.dispatchEvent(new Event('change', { bubbles: true }))
    await fixture.whenStable()
    expect(consumer.image()).toBe(replacement)
    expect(revokeUrl).not.toHaveBeenCalled()
    button('Remove').click()
    await fixture.whenStable()
    expect(consumer.image()).toEqual({ kind: 'remove' })
    expect(revokeUrl).toHaveBeenCalledWith('blob:local-1')
  })

  it('does not access browser file-reading or object-URL APIs in a server context', async () => {
    const { consumer, choose, imageInput } = await setup(true)
    expect(imageInput.disabled).toBe(true)
    await choose(png())
    expect(consumer.image()).toEqual({ kind: 'keep' })
    expect(ControlledReader.instances).toHaveLength(0)
    expect(createUrl).not.toHaveBeenCalled()
  })
})
