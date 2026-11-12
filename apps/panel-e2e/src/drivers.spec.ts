import { expect, test } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

test('driver list, detail and editor load under authorized company management', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (
      message.type() === 'error' &&
      !/^Failed to load resource: the server responded with a status of (401|503) /.test(
        message.text(),
      )
    )
      errors.push(message.text())
  })
  await mockAuthentication(page)
  const searchBodies: unknown[] = []
  const driverDetails: number[] = []
  const personDetails: number[] = []
  await page.route('**/api/v1/drivers**', route => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname.endsWith('/search')) {
      const body = route.request().postDataJSON()
      searchBodies.push(body)
      return route.fulfill({
        json: {
          code: '2000',
          massage: null,
          result: {
            list: [
              {
                id: 23,
                fullName: body.fullName ? `${body.fullName} Driver` : 'Sam Driver',
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
    const segments = pathname.split('/')
    const id = Number(segments[segments.length - 1])
    driverDetails.push(id)
    return route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id,
          driverLicenceLevelId: 2,
          nationalCardFrontImage: null,
          nationalCardBehindImage: null,
          drivingLicenceImage: null,
          driverSmartCardImage: null,
        },
      },
    })
  })
  await page.route('**/api/users/**', route => {
    const segments = new URL(route.request().url()).pathname.split('/')
    const id = Number(segments[segments.length - 1])
    personDetails.push(id)
    return route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id,
          firstName: 'Sam',
          lastName: 'Driver',
          email: 'sam@example.test',
          nationalId: '0012345678',
          provinceName: 'Tehran',
          cityName: 'Tehran',
          cityId: 1,
          address: 'Main Street',
          postalCode: '0012345678',
          lat: 35.7,
          lng: 51.4,
          mobileNumber: '09120000023',
          phoneNumber: null,
          profileImage: null,
        },
      },
    })
  })
  await page.route('**/api/v1/companys/2', route =>
    route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id: 2,
          name: 'Private driver company',
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
  await page.goto('/login')
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/workspace$/)
  await page.goto('/client/2/drivers')
  await expect(page.getByRole('region', { name: 'Drivers' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Sam Driver', exact: true })).toBeVisible()
  await expect.poll(() => searchBodies.length).toBe(1)
  expect(searchBodies[0]).toEqual({
    companyId: 2,
    fullName: null,
    nationalId: null,
    pageNumber: 1,
    pageSize: 10,
  })
  const search = page.getByRole('combobox', { name: 'نام یا کد ملی راننده', exact: true })
  const desktopSearch = await search.boundingBox()
  expect(desktopSearch?.width).toBeGreaterThan(0)
  expect(desktopSearch?.width).toBeLessThanOrEqual(512)
  await search.fill('Sample')
  await expect(page).toHaveURL(/Sample/)
  await expect(page.getByRole('cell', { name: 'Sample Driver', exact: true })).toBeVisible()
  for (const direction of ['rtl', 'ltr']) {
    await page.evaluate(dir => document.documentElement.setAttribute('dir', dir), direction)
    await page.setViewportSize({ width: 375, height: 812 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const mobileSearch = await search.boundingBox()
    expect(mobileSearch?.width).toBeGreaterThanOrEqual(300)
    expect(mobileSearch?.height).toBeGreaterThanOrEqual(44)
  }
  const reload = await page.reload()
  expect(reload).not.toBeNull()
  expect(await reload?.text()).not.toContain('Private driver company')
  await expect(page.getByRole('region', { name: 'Drivers' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Sample Driver', exact: true })).toBeVisible()
  for (const path of ['new', '3', '3/edit', 'add', 'detail/3']) {
    await page.goto('/client/2/drivers/' + path)
    if (path === 'new' || path === 'add') {
      await expect(page.getByRole('heading', { name: 'Add driver', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Start with a person' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Register a new person' })).toBeVisible()
    } else if (path === '3/edit') {
      await expect(page.getByRole('heading', { name: 'Edit driver', exact: true })).toBeVisible()
      await expect(page.locator('input[type=file]').first()).toBeAttached()
      await expect(page.getByRole('heading', { name: 'Sam Driver' })).toBeVisible()
    } else {
      await expect(page.getByRole('heading', { name: 'Driver details', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Sam Driver' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Edit driver' })).toBeVisible()
    }
  }
  await page.getByRole('button', { name: 'خروج', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/client/2/drivers/3/edit')
  await expect(page).toHaveURL(/\/login/)
  expect(searchBodies).toHaveLength(3)
  expect(searchBodies[1]).toMatchObject({ companyId: 2, fullName: 'Sample', pageNumber: 1 })
  expect(driverDetails).toEqual([3, 3, 3])
  expect(personDetails).toEqual([3, 3, 3])
  expect(errors).toEqual([])
})

test('company operators can search only their claimed company and cannot open driver records', async ({
  page,
}) => {
  await mockAuthentication(page, ['Oprator', 'Client'])
  const searches: unknown[] = []
  let detailRequests = 0
  await page.route('**/api/v1/companys/1', route =>
    route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id: 1,
          name: 'Operator company',
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
  await page.route('**/api/v1/drivers**', route => {
    const pathname = new URL(route.request().url()).pathname
    if (!pathname.endsWith('/search')) {
      detailRequests++
      return route.fulfill({ status: 403, json: {} })
    }
    const body = route.request().postDataJSON()
    searches.push(body)
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
            currentPage: 1,
            pageSize: 10,
            totalCount: 1,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        },
      },
    })
  })
  await page.goto('/login')
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/workspace$/)
  await page.goto('/client/1/drivers')
  await expect(page.getByRole('cell', { name: 'Sam Driver', exact: true })).toBeVisible()
  expect(searches).toEqual([
    { companyId: 1, fullName: null, nationalId: null, pageNumber: 1, pageSize: 10 },
  ])
  await expect(page.getByRole('link', { name: 'Sam Driver', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Add driver', exact: true })).toHaveCount(0)
  await page.goto('/client/1/drivers/23')
  await expect(page.getByRole('alert')).toContainText('Admin or Manager')
  expect(detailRequests).toBe(0)
})
