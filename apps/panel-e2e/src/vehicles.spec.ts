import { expect, test } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

test('vehicle route entry fetches company list, car types, and driver autocomplete data', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource'))
      errors.push(message.text())
  })
  await mockAuthentication(page)

  const vehicleSearchBodies: unknown[] = []
  const driverSearchBodies: unknown[] = []
  const typeReads: string[] = []
  let vehicleDetailReads = 0
  let driverDetailReads = 0
  let personDetailReads = 0
  await page.route('**/api/v1/companys/2', route =>
    route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id: 2,
          name: 'Vehicle test company',
          companyTypeId: null,
          companyTypeName: null,
          cityId: null,
          provinceId: null,
          address: null,
          postalCode: null,
          lat: 0,
          lng: 0,
          mobileNumber: null,
          phoneNumber: null,
          faxNumber: null,
          description: null,
          companyLogo: null,
        },
      },
    }),
  )
  await page.route('**/api/v1/vehicle**', route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/search')) {
      const body = route.request().postDataJSON()
      vehicleSearchBodies.push(body)
      return route.fulfill({
        json: {
          code: '2000',
          massage: null,
          result: {
            list: [
              {
                id: 7,
                driverId: 23,
                fullName: 'Sam Driver',
                carTypeName: 'Bus',
                carImage: null,
                carPlate: '12345678',
                produnctionYear: 2018,
                capacity: 2,
                companyName: 'Vehicle test company',
                companyTypeName: 'Client',
              },
            ],
            pagination: {
              currentPage: body.pageNumber,
              pageSize: body.pageSize,
              totalCount: 1,
              totalPages: 1,
              hasPreviousPage: false,
              hasNextPage: false,
            },
          },
        },
      })
    }
    if (url.pathname.endsWith('/types') && route.request().method() === 'GET') {
      typeReads.push(url.pathname)
      return route.fulfill({
        json: { code: '2000', massage: null, result: [{ id: 4, model: 'Bus' }] },
      })
    }
    if (url.pathname.endsWith('/7') && route.request().method() === 'GET') {
      vehicleDetailReads++
      return route.fulfill({
        json: {
          code: '2000',
          massage: null,
          result: {
            id: 7,
            driverId: 23,
            vehicleTypeId: 4,
            carPlate: '12345678',
            color: 'White',
            produnctionYear: 2018,
            capacity: 2,
            carImage: null,
            carSmartCardImage: null,
            carInsuranceImage: null,
            carCardImage: null,
          },
        },
      })
    }
    return route.fulfill({ status: 500, json: {} })
  })
  await page.route('**/api/v1/drivers**', route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/search')) {
      const body = route.request().postDataJSON()
      driverSearchBodies.push(body)
      return route.fulfill({
        json: {
          code: '2000',
          massage: null,
          result: {
            list: [
              {
                id: 23,
                fullName: 'Sam Driver',
                nationalId: '0012345678',
                mobileNumber: '09120000023',
                profileImage: null,
                driverLicenceLevelName: '2',
              },
            ],
            pagination: {
              currentPage: body.pageNumber,
              pageSize: body.pageSize,
              totalCount: 1,
              totalPages: 1,
              hasPreviousPage: false,
              hasNextPage: false,
            },
          },
        },
      })
    }
    driverDetailReads++
    return route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id: 23,
          driverLicenceLevelId: 2,
          nationalCardFrontImage: null,
          nationalCardBehindImage: null,
          drivingLicenceImage: null,
          driverSmartCardImage: null,
        },
      },
    })
  })
  await page.route('**/api/users/23', route => {
    personDetailReads++
    return route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id: 23,
          firstName: 'Sam',
          lastName: 'Driver',
          email: null,
          nationalId: '0012345678',
          provinceName: null,
          cityName: null,
          cityId: null,
          address: null,
          postalCode: null,
          lat: null,
          lng: null,
          mobileNumber: '09120000023',
          phoneNumber: null,
          profileImage: null,
        },
      },
    })
  })

  await page.goto('/login')
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/workspace$/)

  await page.goto('/client/2/vehicles')
  await expect(page.getByRole('heading', { name: /Vehicles|خودروها/ })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Sam Driver', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: '12345678', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Add vehicle|افزودن خودرو/ })).toBeVisible()
  expect(vehicleSearchBodies).toEqual([{ companyId: 2, pageNumber: 1, pageSize: 10 }])

  await page.goto('/client/2/vehicles/new')
  await expect(page.getByRole('heading', { name: /Create vehicle|ثبت خودرو/ })).toBeVisible()
  await expect(page.locator('#vehicle-driver')).toBeVisible()
  await expect(page.locator('#vehicle-type')).toBeVisible()
  await expect(page.locator('#vehicle-plate')).toBeVisible()
  await expect(page.locator('#vehicle-type option', { hasText: 'Bus' })).toHaveCount(1)
  expect(typeReads).toEqual(['/api/v1/vehicle/types'])

  await page.locator('#vehicle-driver').fill('Sam')
  await expect(page.getByRole('option', { name: /Sam Driver/ })).toBeVisible()
  expect(driverSearchBodies).toEqual([
    { companyId: 2, fullName: 'Sam', nationalId: '', pageNumber: 1, pageSize: 10 },
  ])

  await page.goto('/client/2/vehicles/7/edit')
  await expect(page.getByRole('heading', { name: /Edit vehicle|ویرایش خودرو/ })).toBeVisible()
  await expect(page.locator('#vehicle-plate')).toHaveValue('12345678')
  await expect(page.locator('#vehicle-type option', { hasText: 'Bus' })).toHaveCount(1)
  expect(typeReads).toEqual(['/api/v1/vehicle/types', '/api/v1/vehicle/types'])
  expect(vehicleDetailReads).toBe(1)
  expect(driverDetailReads).toBe(1)
  expect(personDetailReads).toBe(1)
  expect(errors).toEqual([])
})
