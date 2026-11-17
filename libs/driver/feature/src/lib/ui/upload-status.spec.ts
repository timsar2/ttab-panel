import { uploadStatusLabel } from './upload-status'

describe('uploadStatusLabel', () => {
  it('returns the upload status in the selected language', () => {
    expect(uploadStatusLabel(true)).toBe('در حال آپلود...')
    expect(uploadStatusLabel(false)).toBe('Uploading...')
  })
})
