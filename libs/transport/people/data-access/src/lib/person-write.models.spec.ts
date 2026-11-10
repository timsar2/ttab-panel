import { describe, expect, it } from 'vitest'
import { transportImageUpload } from '@org/transport-http'
import type { TransportImageUpload } from '@org/transport-http'
import { decodePersonDetail } from './person.models'
import { personCreate, personDraft, personUpdate } from './person-write.models'
import type { PersonCreateBody, PersonUpdateBody } from './person-write.models'

const nullableDetail = {
  id: 17,
  firstName: null,
  lastName: null,
  email: null,
  nationalId: null,
  provinceName: null,
  cityName: null,
  cityId: null,
  address: null,
  postalCode: null,
  lat: null,
  lng: null,
  mobileNumber: null,
  phoneNumber: null,
  profileImage: null,
}
const original = decodePersonDetail({ ...nullableDetail, profileImage: '/existing/private.png' })

describe('person drafts', () => {
  it('creates a mutable, fully populated blank draft', () => {
    const draft = personDraft(null)
    expect(draft).toEqual({
      firstName: '',
      lastName: '',
      email: '',
      nationalId: '',
      cityId: '',
      address: '',
      postalCode: '',
      latitude: '',
      longitude: '',
      mobileNumber: '',
      phoneNumber: '',
    })
    draft.firstName = 'Edited'
    expect(draft.firstName).toBe('Edited')
  })

  it('maps nulls, zero coordinates and scalar strings without image paths', () => {
    expect(
      personDraft(
        decodePersonDetail({
          ...nullableDetail,
          id: 1,
          firstName: ' First ',
          nationalId: '0001',
          cityId: 12,
          lat: 0,
          lng: 0,
          postalCode: '00012',
          mobileNumber: '0091',
          profileImage: '/private.png',
        }),
      ),
    ).toEqual({
      firstName: ' First ',
      lastName: '',
      email: '',
      nationalId: '0001',
      cityId: '12',
      address: '',
      postalCode: '00012',
      latitude: '0',
      longitude: '0',
      mobileNumber: '0091',
      phoneNumber: '',
    })
  })
})

describe('person write bodies', () => {
  it('returns full distinct whitelists, with create-only mobile and update-only ID', () => {
    const draft = Object.assign(personDraft(null), {
      id: 999,
      companyId: 999,
      userId: 'identity',
      password: 'private',
      confirmPassword: 'private',
      roles: ['Admin'],
      birthday: 'date',
      profileImage: '/injected.png',
      mobileNumber: '00123',
      coordinate: { lat: 99, lng: 999, srid: 1 },
    })
    const common = {
      companyId: 8,
      firstName: null,
      lastName: null,
      email: null,
      nationalId: null,
      cityId: null,
      address: null,
      postalCode: null,
      coordinate: null,
      phoneNumber: null,
      profileImage: null,
    }
    const create: PersonCreateBody = personCreate(8, draft)
    const update: PersonUpdateBody = personUpdate(8, original, draft)
    expect(create).toEqual({ ...common, mobileNumber: '00123' })
    expect(update).toEqual({ ...common, id: 17 })
    // @ts-expect-error Mobile is intentionally absent from the update contract.
    expect(update.mobileNumber).toBeUndefined()
    // @ts-expect-error The server assigns the create ID.
    expect(create.id).toBeUndefined()
  })

  it('preserves whitespace and leading zeros; only exactly empty optional strings become null', () => {
    const draft = Object.assign(personDraft(null), {
      firstName: ' First ',
      lastName: ' ',
      email: ' mail@example.test ',
      nationalId: '0001',
      address: '  Street  ',
      postalCode: '00012',
      mobileNumber: ' 00123 ',
      phoneNumber: ' 0009 ',
    })
    expect(personCreate(1, draft)).toMatchObject({
      firstName: ' First ',
      lastName: ' ',
      email: ' mail@example.test ',
      nationalId: '0001',
      address: '  Street  ',
      postalCode: '00012',
      mobileNumber: ' 00123 ',
      phoneNumber: ' 0009 ',
    })
    expect(personCreate(1, personDraft(null))).toMatchObject({ nationalId: null, mobileNumber: '' })
  })

  it.each(['firstName', 'lastName'] as const)(
    'enforces only the source-backed %s length limit',
    key => {
      const draft = personDraft(null)
      draft[key] = 'a'.repeat(75)
      expect(personCreate(1, draft)[key]).toHaveLength(75)
      draft[key] += 'a'
      expect(() => personCreate(1, draft)).toThrow()
      expect(() => personUpdate(1, original, draft)).toThrow()
    },
  )

  it.each([0, -1, 1.1, 2147483648, NaN, Infinity, '1', null, undefined])(
    'requires explicit valid company scope: %s',
    value => {
      expect(() => personCreate(value as number, personDraft(null))).toThrow()
      expect(() => personUpdate(value as number, original, personDraft(null))).toThrow()
    },
  )

  it('revalidates the original business ID instead of taking any draft ID', () => {
    expect(() =>
      personUpdate(1, { ...original, id: 0 as typeof original.id }, personDraft(null)),
    ).toThrow()
  })

  it('keeps city null rather than inventing a zero and supports the source short range', () => {
    expect(personCreate(1, personDraft(null)).cityId).toBeNull()
    for (const cityId of ['-32768', '32767', '0', '0012']) {
      expect(personCreate(1, { ...personDraft(null), cityId }).cityId).toBe(Number(cityId))
    }
    const withCity = decodePersonDetail({ ...nullableDetail, cityId: 12 })
    expect(personUpdate(1, withCity, { ...personDraft(withCity), cityId: '' }).cityId).toBeNull()
  })

  it.each([' ', ' 1 ', '1.0', '1e2', '0x10', '1x', 'NaN', 'Infinity', '32768', '-32769'])(
    'rejects malformed/non-short city %s',
    cityId => {
      expect(() => personCreate(1, { ...personDraft(null), cityId })).toThrow()
    },
  )

  it('writes complete SRID 4326 coordinates including valid zeros and physical endpoints', () => {
    for (const [latitude, longitude] of [
      ['0', '0'],
      ['-90', '180'],
      ['90', '-180'],
      [' 0 ', ' .5 '],
    ]) {
      expect(personCreate(1, { ...personDraft(null), latitude, longitude }).coordinate).toEqual({
        lat: Number(latitude),
        lng: Number(longitude),
        srid: 4326,
      })
    }
    expect(personCreate(1, personDraft(null)).coordinate).toBeNull()
  })

  it.each([
    ['0', ''],
    ['', '0'],
    [' ', '1'],
    ['NaN', '0'],
    ['Infinity', '0'],
    ['90.01', '0'],
    ['-90.01', '0'],
    ['0', '180.01'],
    ['0', '-180.01'],
    ['0x10', '0'],
    ['1e1', '0'],
    ['no', '0'],
  ])('rejects partial/malformed/out-of-range coordinates %s,%s', (latitude, longitude) => {
    expect(() => personCreate(1, { ...personDraft(null), latitude, longitude })).toThrow()
  })

  it('preserves existing zero coordinates and fails closed on clearing full or partial existing coordinates', () => {
    for (const coordinate of [{ lat: 0, lng: 0 }, { lat: 0 }, { lng: 0 }]) {
      const detail = decodePersonDetail({ ...nullableDetail, ...coordinate })
      expect(() =>
        personUpdate(1, detail, { ...personDraft(detail), latitude: '', longitude: '' }),
      ).toThrow()
    }
    const detail = decodePersonDetail({ ...nullableDetail, lat: 0, lng: 0 })
    expect(personUpdate(1, detail, personDraft(detail)).coordinate).toEqual({
      lat: 0,
      lng: 0,
      srid: 4326,
    })
  })

  it('keeps the current image with null, and replaces only with a validated upload whitelist', () => {
    expect(personUpdate(1, original, personDraft(original)).profileImage).toBeNull()
    expect(personUpdate(1, original, personDraft(original), null).profileImage).toBeNull()
    const image = transportImageUpload({
      extension: '.png',
      mime: 'image/png',
      dataUrl: 'data:image/png;base64,YQ==',
    })
    const input = Object.assign({}, image, {
      name: 'private',
      userId: 'private',
      url: '/private.png',
    })
    expect(personCreate(1, personDraft(null), input).profileImage).toEqual(image)
    expect(personUpdate(1, original, personDraft(original), input).profileImage).toEqual(image)
    expect(input).toHaveProperty('name', 'private')
  })

  it.each([
    { extension: '.png', data: '/existing.png', deleteCurrentImage: false },
    { extension: '.png', data: 'data:image/png;base64,', deleteCurrentImage: false },
    { extension: '.png', data: 'data:image/png;base64,!!!', deleteCurrentImage: false },
    { extension: '.png', data: 'data:image/png;base64,YQ=', deleteCurrentImage: false },
    { extension: '.jpg', data: 'data:image/png;base64,YQ==', deleteCurrentImage: false },
    { extension: 'png', data: 'data:image/png;base64,YQ==', deleteCurrentImage: false },
    { extension: '.svg', data: 'data:image/svg+xml;base64,YQ==', deleteCurrentImage: false },
    { extension: '.png', data: 'data:image/png,YQ==', deleteCurrentImage: false },
    { extension: '.png', data: 'data:image/png;base64,YQ==', deleteCurrentImage: true },
    { extension: '.png', data: 'data:image/png;base64,YQ==' },
    { extension: '.png', data: null, deleteCurrentImage: false },
    '/existing.png',
    {},
  ])('rejects malformed or remove-image payloads: %s', image => {
    expect(() => personCreate(1, personDraft(null), image as TransportImageUpload)).toThrow()
    expect(() =>
      personUpdate(1, original, personDraft(original), image as TransportImageUpload),
    ).toThrow()
  })
})
