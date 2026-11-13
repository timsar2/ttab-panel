import { expect, test, type Page } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

async function expectAddDriver(page: Page) {
  await expect(page.getByRole('heading', { name: 'افزودن راننده', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'ابتدا شخص را انتخاب کنید' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'ثبت شخص جدید' })).toBeVisible()
}

async function expectDriverDetail(page: Page) {
  await expect(page.getByRole('heading', { name: 'جزئیات راننده', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sam Driver' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'ویرایش راننده' })).toBeVisible()
  const finalBreadcrumb = page.locator('nav[hlmBreadcrumb] a').last()
  await expect(finalBreadcrumb).toHaveText('رانندگان')
  await expect(finalBreadcrumb).toHaveAttribute('href', '/client/2/drivers')
}

async function expectDriverEdit(page: Page) {
  await expect(page.getByRole('heading', { name: 'ویرایش راننده', exact: true })).toBeVisible()
  await expect(page.locator('input[type=file]').first()).toBeAttached()
  await expect(page.getByRole('heading', { name: 'Sam Driver' })).toBeVisible()
  await page.getByRole('button', { name: 'ویرایش اطلاعات شخص', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'بستن ویرایش اطلاعات شخص', exact: true }),
  ).toBeVisible()
  const editText = await page.locator('body').innerText()
  expect(editText).toContain('شخص ثبت‌شده')
  expect(editText).toContain('اطلاعات راننده')
  expect(editText).toContain('جایگزینی مدارک')
  expect(editText).toContain('تلفن همراه در پرونده‌های موجود فقط خواندنی است.')
  expect(editText).toContain('تصویر فعلی روی کارت ملی')
  expect(editText).toContain('با ذخیره، ممکن است نقش راننده به حساب پیوندخورده اختصاص داده شود.')
  expect(editText).not.toContain('Persisted person')
  expect(editText).not.toContain('Person ID')
  expect(editText).not.toContain('City:')
  expect(editText).not.toContain('No file chosen')
  expect(editText).not.toContain('JPEG, PNG or WebP. Up to 160 KiB.')
  expect(editText).not.toContain('Mobile number is read-only')
  expect(editText).not.toContain('Driver information')
  expect(editText).not.toContain('Values are shown as stored')
  expect(editText).not.toContain('Document replacements')
  expect(editText).not.toContain('Current National card front')
  expect(editText).not.toContain('Saving may assign the linked account')
}

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
          nationalCardFrontImage: 'data:image/png;base64,aGVsbG8=',
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
  await expect(page.getByRole('region', { name: 'رانندگان' })).toBeVisible()
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
  await page.setViewportSize({ width: 375, height: 812 })
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const mobileSearch = await page.locator('hlm-autocomplete-input').boundingBox()
  const mobileHostWidth = await search.evaluate(
    input => input.closest('lib-autocomplete-search')?.getBoundingClientRect().width ?? 0,
  )
  expect(mobileSearch?.width).toBeCloseTo(mobileHostWidth, 0)
  expect(mobileSearch?.height).toBeGreaterThanOrEqual(44)
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'ltr'))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(
    (await page.locator('hlm-autocomplete-input').boundingBox())?.height,
  ).toBeGreaterThanOrEqual(44)
  const reload = await page.reload()
  expect(reload).not.toBeNull()
  expect(await reload?.text()).not.toContain('Private driver company')
  await expect(page.getByRole('region', { name: 'رانندگان' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Sample Driver', exact: true })).toBeVisible()
  await page.goto('/client/2/drivers/new')
  await expectAddDriver(page)
  await page.goto('/client/2/drivers/3')
  await expectDriverDetail(page)
  await page.goto('/client/2/drivers/3/edit')
  await expectDriverEdit(page)
  await page.goto('/client/2/drivers/add')
  await expectAddDriver(page)
  await page.goto('/client/2/drivers/detail/3')
  await expectDriverDetail(page)
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
  await expect(page.getByRole('alert')).toContainText('مدیریت رانندگان')
  expect(detailRequests).toBe(0)
})
