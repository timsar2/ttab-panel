import {
  DRIVER_DOCUMENT_FIELDS,
  DRIVER_MAX_BODY_BYTES,
  DriverDraft,
  decodeDriverDetail,
  decodeDriverRow,
  driverCompanyId,
  driverId,
  driverWrite,
} from '../index'

const detail = {
  id: 7,
  driverLicenceLevelId: 2,
  nationalCardFrontImage: '/media/front.png',
  nationalCardBehindImage: null,
  drivingLicenceImage: '/media/licence.png',
  driverSmartCardImage: null,
}
const upload = {
  extension: '.png',
  data: 'data:image/png;base64,YQ==',
  deleteCurrentImage: false,
} as const

describe('source-backed driver adapters', () => {
  it('uses business IDs and short company IDs, rejecting authenticated Identity strings', () => {
    expect(driverId(7)).toBe(7)
    expect(driverCompanyId(32767)).toBe(32767)
    for (const value of [0, -1, 1.5, '7', 'identity-guid', NaN])
      expect(() => driverId(value)).toThrow()
    expect(() => driverCompanyId(32768)).toThrow()
  })
  it('hydrates every licence/document field without interpreting licence meanings', () => {
    expect(decodeDriverDetail(detail)).toEqual(detail)
    expect(decodeDriverDetail({ ...detail, driverLicenceLevelId: 3 }).driverLicenceLevelId).toBe(3)
    expect(() => decodeDriverDetail({ id: 7, driverLicenceLevelId: 2 })).toThrow()
    expect(() => decodeDriverDetail({ ...detail, driverLicenceLevelId: '2' })).toThrow()
    expect(() => decodeDriverDetail({ ...detail, nationalCardFrontImage: {} })).toThrow()
  })
  it('preserves phone/national ID strings and rejects malformed rows', () => {
    const row = {
      id: 7,
      fullName: null,
      nationalId: '0012345678',
      mobileNumber: '09120000000',
      profileImage: null,
      driverLicenceLevelName: '2',
    }
    expect(decodeDriverRow(row)).toEqual(row)
    expect(() => decodeDriverRow({ ...row, mobileNumber: 9120000000 })).toThrow()
    expect(() => decodeDriverRow({ ...row, driverLicenceLevelName: null })).toThrow()
  })
  it('sends a minimal Person-backed upsert and omits every preserved document', () => {
    expect(driverWrite(driverCompanyId(2), driverId(7), { driverLicenceLevelId: 1 })).toEqual({
      id: 7,
      companyId: 2,
      driverLicenceLevelId: 1,
    })
  })
  it.each(DRIVER_DOCUMENT_FIELDS)(
    'replaces %s without forwarding previews or remove intent',
    field => {
      expect(
        driverWrite(driverCompanyId(2), driverId(7), { driverLicenceLevelId: 2, [field]: upload }),
      ).toEqual({
        id: 7,
        companyId: 2,
        driverLicenceLevelId: 2,
        [field]: upload,
      })
      for (const invalid of [
        null,
        '',
        '/media/existing.png',
        { ...upload, deleteCurrentImage: true },
        { ...upload, extension: '.svg' },
        { ...upload, data: '/media/existing.png' },
        {},
      ]) {
        expect(() =>
          driverWrite(driverCompanyId(2), driverId(7), {
            driverLicenceLevelId: 2,
            [field]: invalid,
          } as DriverDraft),
        ).toThrow()
      }
    },
  )
  it('rejects unknown licence values and counts aggregate encoded JSON, not individual file sizes', () => {
    expect(() =>
      driverWrite(driverCompanyId(2), driverId(7), {
        driverLicenceLevelId: 0,
      } as unknown as DriverDraft),
    ).toThrow()
    const image = { ...upload, data: `data:image/png;base64,${'YWFh'.repeat(70000)}` }
    expect(new TextEncoder().encode(JSON.stringify(image)).byteLength).toBeLessThan(
      DRIVER_MAX_BODY_BYTES,
    )
    expect(() =>
      driverWrite(driverCompanyId(2), driverId(7), {
        driverLicenceLevelId: 1,
        nationalCardFrontImage: image,
        nationalCardBehindImage: image,
        drivingLicenceImage: image,
        driverSmartCardImage: image,
      }),
    ).toThrow(/1 MiB/)
  })
})
