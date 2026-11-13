import {
  carCompanyId,
  carId,
  carTypeId,
  carTypeWrite,
  decodeCarType,
  decodeVehicleDetail,
  decodeVehicleRow,
  vehicleWrite,
} from './vehicle.models'

describe('vehicle contract adapters', () => {
  it('keeps vehicle, company, and type identifiers distinct', () => {
    expect(carId(7)).toBe(7)
    expect(carCompanyId(12)).toBe(12)
    expect(decodeCarType({ id: 4, model: 'City Bus' })).toEqual({
      id: 4,
      carTypeId: null,
      model: 'City Bus',
    })
    expect(decodeCarType({ id: 4, carTypeId: 21, model: 'City Bus' })).toEqual({
      id: 4,
      carTypeId: 21,
      model: 'City Bus',
    })
    expect(decodeCarType({ carTypeId: 4, model: 'City Bus' })).toEqual({
      id: 4,
      carTypeId: 4,
      model: 'City Bus',
    })
  })

  it('decodes nullable list/detail values without inventing defaults', () => {
    expect(
      decodeVehicleRow({
        id: 7,
        driverId: 3,
        fullName: 'Driver Name',
        carTypeName: 'Bus',
        carImage: null,
        carPlate: '12345678',
        produnctionYear: null,
        capacity: null,
        companyName: 'Company',
        companyTypeName: null,
      }),
    ).toMatchObject({ id: 7, produnctionYear: null, capacity: null, carImage: null })

    expect(
      decodeVehicleDetail({
        id: 7,
        driverId: 3,
        vehicleTypeId: 4,
        carPlate: '12345678',
        color: null,
        produnctionYear: null,
        capacity: null,
        carImage: null,
        carSmartCardImage: null,
        carInsuranceImage: null,
        carCardImage: null,
      }),
    ).toMatchObject({ vehicleTypeId: 4, capacity: null, produnctionYear: null })
  })

  it('maps create/update payloads without inventing a company field', () => {
    const draft = {
      driverId: 3,
      vehicleTypeId: 4,
      carPlate: '12345678',
      color: null,
      produnctionYear: null,
      capacity: null,
    }
    expect(vehicleWrite(null, draft)).toEqual(draft)
    expect(vehicleWrite(carId(7), draft)).toEqual({ id: 7, ...draft })
    expect('companyId' in vehicleWrite(null, draft)).toBe(false)
    expect(() => vehicleWrite(null, { ...draft, carPlate: 'short' })).toThrow()
    expect(carTypeWrite({ model: '  City Bus  ' })).toEqual({ carTypeId: null, model: 'City Bus' })
    expect(carTypeWrite({ carTypeId: carTypeId(21), model: '  City Bus  ' })).toEqual({
      carTypeId: 21,
      model: 'City Bus',
    })
  })

  it('preserves unchanged documents and serializes replacements with the legacy picture shape', () => {
    const draft = {
      driverId: 3,
      vehicleTypeId: 4,
      carPlate: '12345678',
      color: null,
      produnctionYear: null,
      capacity: null,
    }
    const body = vehicleWrite(null, {
      ...draft,
      carImage: {
        name: 'bus.png',
        extension: '.png',
        data: 'data:image/png;base64,YQ==',
        deleteCurrentImage: false,
      },
    })
    expect(body.carImage).toEqual({
      name: 'bus.png',
      extension: '.png',
      data: 'data:image/png;base64,YQ==',
      deleteCurrentImage: false,
    })
    expect(body.carSmartCardImage).toBeUndefined()
    expect(body.carInsuranceImage).toBeUndefined()
    expect(body.carCardImage).toBeUndefined()
    expect(() =>
      vehicleWrite(null, {
        ...draft,
        carImage: {
          name: '',
          extension: '.png',
          data: 'data:image/png;base64,YQ==',
          deleteCurrentImage: false,
        },
      }),
    ).toThrow()
  })
})
