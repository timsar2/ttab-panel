import { describe, expect, it } from 'vitest'
import { decodePersonDetail, decodePersonRow, peopleCompanyId, personId } from './person.models'
import type { PeopleCompanyId, PersonId } from './person.models'

const nullableDetail = {
  id: 2,
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

describe('person IDs', () => {
  it('accepts the positive Int32 endpoints without conflating ID brands', () => {
    expect(personId(1)).toBe(1)
    expect(personId(2147483647)).toBe(2147483647)
    expect(peopleCompanyId(2147483647)).toBe(2147483647)
    const person: PersonId = personId(1)
    const company: PeopleCompanyId = peopleCompanyId(1)
    // @ts-expect-error A company identifier is not a person identifier.
    const wrongPerson: PersonId = company
    // @ts-expect-error A person identifier is not a company identifier.
    const wrongCompany: PeopleCompanyId = person
    expect([wrongPerson, wrongCompany]).toEqual([1, 1])
  })

  it.each([
    '1',
    '0001',
    '56ea6bc1-48c2-4f43-8f6a-5c6e2497bb33',
    0,
    -1,
    1.5,
    2147483648,
    Number.MAX_SAFE_INTEGER + 1,
    NaN,
    Infinity,
    null,
    undefined,
    true,
    {},
  ])('rejects invalid business IDs: %s', value => {
    expect(() => personId(value)).toThrow()
    expect(() => peopleCompanyId(value)).toThrow()
  })
})

describe('person response decoders', () => {
  it('accepts explicit nullable fields without retaining private extras', () => {
    expect(
      decodePersonRow({
        id: 1,
        fullName: null,
        nationalId: null,
        profileImage: null,
        password: 'private',
        userId: 'identity',
        birthday: 'date',
      }),
    ).toEqual({ id: 1, fullName: null, nationalId: null, profileImage: null })
    expect(
      decodePersonDetail({
        ...nullableDetail,
        roles: ['Admin'],
        confirmPassword: 'private',
        companyId: 9,
      }),
    ).toEqual({
      id: 2,
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
    })
  })

  it('preserves null, empty and scalar text exactly', () => {
    expect(
      decodePersonRow({ id: 1, fullName: '', nationalId: '00120 ', profileImage: null }),
    ).toEqual({ id: 1, fullName: '', nationalId: '00120 ', profileImage: null })
    const detail = decodePersonDetail({
      id: 1,
      firstName: ' First ',
      lastName: '',
      email: null,
      nationalId: '00123',
      provinceName: 'Province',
      cityName: 'City',
      cityId: 32767,
      address: '  ',
      postalCode: '00012',
      lat: 0,
      lng: 0,
      mobileNumber: '0091',
      phoneNumber: '001',
      profileImage: '/existing.png',
      userId: 'private',
      birthday: 'private',
      password: 'private',
    })
    expect(detail).toEqual({
      id: 1,
      firstName: ' First ',
      lastName: '',
      email: null,
      nationalId: '00123',
      provinceName: 'Province',
      cityName: 'City',
      cityId: 32767,
      address: '  ',
      postalCode: '00012',
      lat: 0,
      lng: 0,
      mobileNumber: '0091',
      phoneNumber: '001',
      profileImage: '/existing.png',
    })
  })

  it('accepts source-backed nullable short cities and independently nullable coordinates', () => {
    expect(
      decodePersonDetail({ ...nullableDetail, cityId: -32768, lat: -90, lng: 180 }),
    ).toMatchObject({ cityId: -32768, lat: -90, lng: 180 })
    expect(decodePersonDetail({ ...nullableDetail, lat: 0 })).toMatchObject({ lat: 0, lng: null })
    expect(decodePersonDetail({ ...nullableDetail, lat: null, lng: -180 })).toMatchObject({
      lat: null,
      lng: -180,
    })
  })

  it('rejects missing and undefined nullable fields rather than converting partial reads into clearing writes', () => {
    for (const key of Object.keys(nullableDetail)) {
      const partial: Record<string, unknown> = { ...nullableDetail }
      delete partial[key]
      expect(() => decodePersonDetail(partial)).toThrow()
      expect(() => decodePersonDetail({ ...nullableDetail, [key]: undefined })).toThrow()
    }
    const row = { id: 1, fullName: null, nationalId: null, profileImage: null }
    for (const key of Object.keys(row)) {
      const partial: Record<string, unknown> = { ...row }
      delete partial[key]
      expect(() => decodePersonRow(partial)).toThrow()
      expect(() => decodePersonRow({ ...row, [key]: undefined })).toThrow()
    }
  })

  it.each([null, [], 'person', 1, {}, { id: '1' }, { id: 0 }])(
    'rejects malformed records: %s',
    value => {
      expect(() => decodePersonRow(value)).toThrow()
      expect(() => decodePersonDetail(value)).toThrow()
    },
  )

  it.each(['fullName', 'nationalId', 'profileImage'])('rejects non-text row %s', key => {
    expect(() =>
      decodePersonRow({ id: 1, fullName: null, nationalId: null, profileImage: null, [key]: 42 }),
    ).toThrow()
  })

  it.each([
    'firstName',
    'lastName',
    'email',
    'nationalId',
    'provinceName',
    'cityName',
    'address',
    'postalCode',
    'mobileNumber',
    'phoneNumber',
    'profileImage',
  ])('rejects non-text detail %s', key => {
    expect(() => decodePersonDetail({ ...nullableDetail, [key]: {} })).toThrow()
  })

  it.each([
    ['cityId', '1'],
    ['cityId', 32768],
    ['cityId', -32769],
    ['cityId', 1.5],
    ['lat', '0'],
    ['lat', NaN],
    ['lat', Infinity],
    ['lat', -90.01],
    ['lat', 90.01],
    ['lng', -180.01],
    ['lng', 180.01],
    ['lng', -Infinity],
  ])('rejects invalid detail %s: %s', (key, value) => {
    expect(() => decodePersonDetail({ ...nullableDetail, [key]: value })).toThrow()
  })
})
