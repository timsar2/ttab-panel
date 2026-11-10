import {
  CompanyDetail,
  CompanyLogoUpload,
  companyCoordinate,
  companyDraft,
  companyLogoUpload,
  companyWrite,
} from '../index'

const detail: CompanyDetail = {
  id: 2,
  name: 'Company',
  companyTypeId: 1,
  companyTypeName: 'Type',
  cityId: 7,
  provinceId: 3,
  address: null,
  postalCode: null,
  lat: 0,
  lng: 0,
  mobileNumber: null,
  phoneNumber: null,
  faxNumber: null,
  description: null,
  companyLogo: 'existing.png',
}

describe('company write adapters', () => {
  it('round-trips full edit detail without losing zero or leaking read fields', () => {
    const result = companyWrite(companyDraft(detail), detail)
    expect(result.coordinate).toEqual({ lat: 0, lng: 0, srid: 4326 })
    expect(result.companyLogo).toBeNull()
    expect(result).not.toHaveProperty('provinceId')
    expect(result).not.toHaveProperty('companyTypeName')
    expect(result).not.toHaveProperty('companyLogoPath')
  })
  it('uses null optional create values without inventing a zero company/city or location', () => {
    const result = companyWrite({ ...companyDraft(null), name: ' New ', companyTypeId: '1' }, null)
    expect(result).toMatchObject({
      id: null,
      name: 'New',
      cityId: null,
      coordinate: null,
      companyLogo: null,
    })
  })
  it('fails closed on unconfirmed city or coordinate clearing', () => {
    expect(() => companyWrite({ ...companyDraft(detail), cityId: '' }, detail)).toThrow(
      'Clearing an existing city',
    )
    expect(() =>
      companyWrite({ ...companyDraft(detail), latitude: '', longitude: '' }, detail),
    ).toThrow('Clearing existing coordinates')
    expect(() => companyWrite({ ...companyDraft(detail), longitude: '' }, detail)).toThrow(
      'decimal coordinate',
    )
  })
  it.each(['NaN', 'Infinity', '0x10', '1e2', '1,2', '', '91'])(
    'rejects malformed or out-of-range latitude %s',
    value => {
      expect(() => companyCoordinate(value, -90, 90)).toThrow()
    },
  )
  it('accepts decimal boundaries, negatives, and exact zero without timezone/map assumptions', () => {
    expect(companyCoordinate('0', -90, 90)).toBe(0)
    expect(companyCoordinate('-90', -90, 90)).toBe(-90)
    expect(companyCoordinate('180', -180, 180)).toBe(180)
  })
  it.each([
    { mime: 'image/png', extension: '.PNG' },
    { mime: 'image/jpeg', extension: '.jpg' },
    { mime: 'image/jpeg', extension: '.JPEG' },
    { mime: 'image/webp', extension: '.webp' },
  ])('adapts a supported $extension replacement as the backend image data URL contract', file => {
    const upload = companyLogoUpload({ ...file, dataUrl: `data:${file.mime};base64,AA==` })
    const body = companyWrite(companyDraft(detail), detail, upload)
    expect(body.companyLogo).toEqual({
      extension: file.extension.toLowerCase(),
      data: `data:${file.mime};base64,AA==`,
      deleteCurrentImage: false,
    })
    expect(body.companyLogo).not.toHaveProperty('name')
    expect(body.companyLogo?.data).not.toContain('existing.png')
  })
  it.each([
    { mime: 'image/png', extension: '.png', dataUrl: 'AA==' },
    { mime: 'image/png', extension: '.png', dataUrl: 'data:image/png;base64,' },
    { mime: 'image/png', extension: '.png', dataUrl: 'data:image/png;base64,?bad?' },
    { mime: 'image/jpeg', extension: '.png', dataUrl: 'data:image/jpeg;base64,AA==' },
    { mime: 'image/svg+xml', extension: '.svg', dataUrl: 'data:image/svg+xml;base64,AA==' },
    { mime: 'image/png', extension: 'png', dataUrl: 'data:image/png;base64,AA==' },
  ])('rejects unsupported or malformed media payload $extension/$dataUrl', file => {
    expect(() => companyLogoUpload(file)).toThrow()
  })
  it('fails closed for runtime delete-only uploads even if a caller bypasses the static type', () => {
    const upload = {
      extension: '.png',
      data: 'data:image/png;base64,AA==',
      deleteCurrentImage: true,
    } as unknown as CompanyLogoUpload
    expect(() => companyWrite(companyDraft(detail), detail, upload)).toThrow(
      'Logo removal is not supported',
    )
  })
})
