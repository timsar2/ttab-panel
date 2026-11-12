import { expect, test } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

test('driver list loads scoped server results and keeps detail routes protected', async ({
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
  let privateRequests = 0
  await page.route('**/api/v1/drivers**', route => {
    if (new URL(route.request().url()).pathname.endsWith('/search')) {
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
    privateRequests++
    return route.fulfill({ status: 403, json: {} })
  })
  await page.route('**/api/users**', route => {
    privateRequests++
    return route.fulfill({ status: 500, json: {} })
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
  await expect(page.getByRole('heading', { name: 'Drivers', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Sam Driver', exact: true })).toBeVisible()
  await expect.poll(() => searchBodies.length).toBe(1)
  expect(searchBodies[0]).toEqual({
    companyId: 2,
    fullName: null,
    nationalId: null,
    pageNumber: 1,
    pageSize: 10,
  })
  const search = page.getByRole('combobox', { name: 'Driver name or national ID', exact: true })
  await search.fill('Sample')
  await expect(page).toHaveURL(/Sample/)
  await expect(page.getByRole('cell', { name: 'Sample Driver', exact: true })).toBeVisible()
  for (const direction of ['rtl', 'ltr']) {
    await page.evaluate(dir => document.documentElement.setAttribute('dir', dir), direction)
    await page.setViewportSize({ width: 375, height: 812 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await search.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  }
  const reload = await page.reload()
  expect(reload).not.toBeNull()
  expect(await reload?.text()).not.toContain('Private driver company')
  await expect(page.getByRole('heading', { name: 'Drivers', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Sample Driver', exact: true })).toBeVisible()
  for (const path of ['new', '3', '3/edit', 'add', 'detail/3']) {
    await page.goto('/client/2/drivers/' + path)
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.locator('input[type=file]')).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/client/2/drivers/3/edit')
  await expect(page).toHaveURL(/\/login/)
  expect(searchBodies).toHaveLength(3)
  expect(searchBodies[1]).toMatchObject({ companyId: 2, fullName: 'Sample', pageNumber: 1 })
  expect(privateRequests).toBe(0)
  expect(errors).toEqual([])
})
