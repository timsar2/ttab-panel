import { TransportError } from './transport-adapters'

export interface TransportImageUpload {
  readonly extension: string
  readonly data: string
  readonly deleteCurrentImage: false
}

/** The shared backend FileType.Image and LocalFileStorageService contract. */
export const TRANSPORT_IMAGE_FILE_TYPES = [
  { mime: 'image/jpeg', extensions: ['.jpg', '.jpeg'] },
  { mime: 'image/png', extensions: ['.png'] },
  { mime: 'image/webp', extensions: ['.webp'] },
] as const

export function transportImageUpload(file: {
  mime: string
  extension: string
  dataUrl: string
}): TransportImageUpload {
  const extension = file.extension.toLowerCase()
  const type = TRANSPORT_IMAGE_FILE_TYPES.find(type =>
    type.extensions.some(value => value === extension),
  )
  const prefix = `data:${file.mime};base64,`
  if (
    !type ||
    type.mime !== file.mime ||
    !file.dataUrl.startsWith(prefix) ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      file.dataUrl.slice(prefix.length),
    ) ||
    !file.dataUrl.slice(prefix.length)
  ) {
    throw new TransportError('validation', 0, 'Choose a supported image with valid image data.')
  }
  return { extension, data: file.dataUrl, deleteCurrentImage: false }
}
