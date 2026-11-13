import { expect, test } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

test('Direction route entry loads company routes, detail, ordered stations, and menu actions', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await mockAuthentication(page)

  const directionSearchBodies: unknown[] = []
  const stationSearchBodies: unknown[] = []
  const lineSearchBodies: unknown[] = []
  const shiftTimeBodies: unknown[] = []
  let routeDetails = 0
  let lineDetails = 0
  await page.route('**/api/v1/companys/2', route =>
    route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id: 2,
          name: 'Route test company',
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
  await page.route('**/api/v1/directions/search', route => {
    directionSearchBodies.push(route.request().postDataJSON())
    return route.fulfill({
      json: {
        code: '2000',
        massage: 'Success',
        result: [
          { name: 'االا', departureTime: '17:51:00', id: 42 },
          { name: 'ابهر بیمارستان امید', departureTime: '07:30:00', id: 2 },
        ],
      },
    })
  })
  await page.route('**/api/v1/directions/42', route => {
    routeDetails++
    return route.fulfill({
      json: {
        code: '2000',
        massage: 'Success',
        result: { id: 42, name: 'االا', departureTime: '17:51:00' },
      },
    })
  })
  await page.route('**/api/v1/stations/search', route => {
    stationSearchBodies.push(route.request().postDataJSON())
    return route.fulfill({
      json: {
        code: '2000',
        massage: 'Success',
        result: [
          {
            id: 8,
            directionId: 42,
            name: 'Second stop',
            address: null,
            orderNo: 2,
            provinceName: null,
            cityName: null,
            lat: 35.8,
            lng: 51.4,
          },
          {
            id: 7,
            directionId: 42,
            name: 'First stop',
            address: null,
            orderNo: 1,
            provinceName: null,
            cityName: null,
            lat: 0,
            lng: 0,
          },
        ],
      },
    })
  })
  await page.route('**/api/v1/lines/search', route => {
    lineSearchBodies.push(route.request().postDataJSON())
    return route.fulfill({
      json: {
        code: '2000',
        massage: 'Success',
        result: {
          list: [
            {
              id: 5,
              directionId: 42,
              directionName: 'االا',
              name: 'اداری ثابت',
              entranceShiftTimeName: 'سرویس صبح',
              returnShiftTimeName: 'سرویس عصر',
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 1,
            pageSize: 10,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        },
      },
    })
  })
  await page.route('**/api/v1/lines/5', route => {
    lineDetails++
    return route.fulfill({
      json: {
        code: '2000',
        massage: 'Success',
        result: {
          id: 5,
          directionId: 42,
          directionName: 'االا',
          name: 'اداری ثابت',
          entranceShiftTimeId: 10,
          returnShiftTimeId: 11,
          entranceShiftTimeName: 'سرویس صبح',
          returnShiftTimeName: 'سرویس عصر',
        },
      },
    })
  })
  await page.route('**/api/v1/shiftTimes', route => {
    shiftTimeBodies.push(route.request().postDataJSON())
    return route.fulfill({
      json: {
        code: '2000',
        massage: 'Success',
        result: [
          { id: 10, companyId: 2, name: 'سرویس صبح', shiftTime: '07:30:00' },
          { id: 11, companyId: 2, name: 'سرویس عصر', shiftTime: '18:30:00' },
        ],
      },
    })
  })

  await page.goto('/login')
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/workspace$/)

  await page.goto('/client/2/direction')
  await expect(page.getByRole('heading', { name: /Routes|مسیرها/ })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'االا', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: '17:51:00', exact: true })).toBeVisible()
  expect(directionSearchBodies).toEqual([{ companyId: 2 }])

  await page.locator('details summary').first().click()
  await expect(page.getByRole('link', { name: /مشاهده و ویرایش|View \/ edit route/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^خطوط$|^Lines$/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /ایستگاه‌ها|Stations/ })).toBeVisible()
  await page.getByRole('link', { name: /^خطوط$|^Lines$/ }).click()
  await expect(page.getByRole('heading', { name: /Lines|خطوط/ })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'اداری ثابت', exact: true })).toBeVisible()
  expect(lineSearchBodies).toEqual([{ companyId: 2, directionId: 42, pageNumber: 1, pageSize: 10 }])

  await page.goto('/client/2/direction/detail/42/lines/detail/5')
  await expect(
    page.getByRole('heading', { name: /View \/ edit Line|مشاهده و ویرایش خط/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: /View \/ edit Line|مشاهده و ویرایش خط/ }).click()
  await expect(page.locator('#line-name')).toHaveValue('اداری ثابت')
  await expect(page.locator('#line-outbound-time option', { hasText: 'سرویس صبح' })).toHaveCount(1)
  expect(lineDetails).toBe(1)
  expect(shiftTimeBodies).toEqual([{ companyId: 2, name: null }])

  await page.goto('/client/2/direction/detail/42/lines/add')
  await expect(page.getByRole('heading', { name: /Add Line|افزودن خط/ })).toBeVisible()
  await expect(page.locator('#line-outbound-time option', { hasText: 'سرویس صبح' })).toHaveCount(1)
  expect(shiftTimeBodies).toEqual([
    { companyId: 2, name: null },
    { companyId: 2, name: null },
  ])

  await page.goto('/client/2/direction')
  await page.getByRole('link', { name: /مشاهده و ویرایش|View \/ edit route/ }).click()
  await expect(
    page.getByRole('heading', { name: /مشاهده و ویرایش|View \/ edit route/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: /مشاهده و ویرایش|View \/ edit route/ }).click()
  await expect(page.getByLabel(/نام مسیر|Route name/)).toHaveValue('االا')
  expect(routeDetails).toBe(1)

  await page.goto('/client/2/direction/detail/42/stations')
  await expect(page.getByRole('heading', { name: /Show on map|نمایش روی نقشه/ })).toBeVisible()
  await expect(page.getByText('First stop', { exact: true })).toBeVisible()
  await expect(page.getByText('Second stop', { exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText(
    /Neshan Web Map API key is not configured|کلید وب نقشه نشان تنظیم نشده است/,
  )
  expect(stationSearchBodies[stationSearchBodies.length - 1]).toEqual({
    companyId: 2,
    directionId: 42,
    name: '',
  })
  expect(errors).toEqual([])
})
