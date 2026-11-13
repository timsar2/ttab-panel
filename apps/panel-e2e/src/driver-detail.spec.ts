import { expect, test, type Page } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

const largeImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='1200' viewBox='0 0 1600 1200'%3E%3Crect width='1600' height='1200' fill='%23f4eee8'/%3E%3C/svg%3E"

async function expectNoHorizontalOverflow(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
}

async function expectAttachmentTextWidth(page: Page) {
  const content = page.locator('[hlmAttachmentContent]')
  await expect(content).toHaveCount(4)
  const widths = await content.evaluateAll(elements =>
    elements.map(element => element.getBoundingClientRect().width),
  )
  for (const width of widths) expect(width).toBeGreaterThan(180)
}

test('driver detail keeps a clear hierarchy, bounded attachments and localized RTL/LTR layouts', async ({
  page,
}, testInfo) => {
  await mockAuthentication(page)
  const unexpectedErrors: string[] = []
  page.on('pageerror', error => unexpectedErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource'))
      unexpectedErrors.push(message.text())
  })

  await page.route('**/api/v1/companys/1', route =>
    route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id: 1,
          name: 'صنایع غذائی کیلوس',
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
  await page.route('**/api/v1/drivers/3', route =>
    route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id: 3,
          driverLicenceLevelId: 1,
          nationalCardFrontImage: largeImage,
          nationalCardBehindImage: largeImage,
          drivingLicenceImage: largeImage,
          driverSmartCardImage: largeImage,
        },
      },
    }),
  )
  await page.route('**/api/users/3', route =>
    route.fulfill({
      json: {
        code: '2000',
        massage: null,
        result: {
          id: 3,
          firstName: 'علی',
          lastName: 'محمودی',
          email: null,
          nationalId: '4410360760',
          provinceName: null,
          cityName: 'ابهر',
          cityId: null,
          address: null,
          postalCode: null,
          lat: null,
          lng: null,
          mobileNumber: '09123423567',
          phoneNumber: null,
          profileImage: null,
        },
      },
    }),
  )

  await page.goto('/login')
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/workspace$/)
  await page.goto('/client/1/drivers/3')

  const driverName = page.getByRole('heading', { name: 'علی محمودی', exact: true })
  await expect(driverName).toBeVisible()
  await expect(driverName).toBeInViewport()
  await page.screenshot({ path: testInfo.outputPath('driver-detail-initial-viewport.png') })
  const companyHeader = await page.locator('.theme-content-column > header').boundingBox()
  const detailHost = await page.locator('lib-driver-detail').boundingBox()
  const contentColumn = await page.locator('.theme-content-column').boundingBox()
  const desktopSidebar = await page
    .locator('#app-navigation [data-slot="sidebar-container"]')
    .boundingBox()
  const sidebarGap = await page.locator('#app-navigation [data-slot="sidebar-gap"]').boundingBox()
  const driverHeadingBox = await driverName.boundingBox()
  const driverHeadingMetrics = await driverName.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(companyHeader).not.toBeNull()
  expect(detailHost).not.toBeNull()
  expect(contentColumn).not.toBeNull()
  expect(desktopSidebar).not.toBeNull()
  expect(sidebarGap).not.toBeNull()
  expect(driverHeadingBox?.y).toBeGreaterThanOrEqual(
    (companyHeader?.y ?? 0) + (companyHeader?.height ?? 0),
  )
  expect(driverHeadingBox?.width).toBeGreaterThan(100)
  expect(driverHeadingMetrics.scrollWidth).toBeLessThanOrEqual(driverHeadingMetrics.clientWidth)
  expect(sidebarGap?.width).toBeGreaterThan(0)
  expect((contentColumn?.x ?? 0) + (contentColumn?.width ?? 0)).toBeLessThanOrEqual(
    desktopSidebar?.x ?? 0,
  )
  expect((detailHost?.x ?? 0) + (detailHost?.width ?? 0)).toBeLessThanOrEqual(
    desktopSidebar?.x ?? 0,
  )
  await expect(page.getByRole('link', { name: 'ویرایش راننده' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'بازگشت به فهرست رانندگان' })).toHaveAttribute(
    'href',
    '/client/1/drivers',
  )
  await expect(page.getByRole('heading', { name: 'مدارک', exact: true })).toBeVisible()
  await expect(page.getByText(/کد ملی: 4410360760/)).toBeVisible()
  await expect(page.getByText('09123423567', { exact: true })).toBeVisible()

  await expect(page.getByRole('link', { name: /حذف راننده/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /حذف راننده/ })).toHaveCount(0)

  const documentImages = page.locator(
    'img[alt*="کارت ملی"], img[alt*="گواهینامه"], img[alt*="کارت هوشمند"]',
  )
  await expect(documentImages).toHaveCount(4)
  await expectAttachmentTextWidth(page)
  const imageMetrics = await documentImages.evaluateAll(images =>
    images.map(image => {
      const element = image as HTMLImageElement
      const style = getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      return { height: bounds.height, maxHeight: style.maxHeight, objectFit: style.objectFit }
    }),
  )
  for (const image of imageMetrics) {
    expect(image.height).toBeLessThanOrEqual(200)
    expect(image.objectFit).toBe('contain')
  }

  const pageText = await page.locator('body').innerText()
  expect(pageText).not.toContain('Driver details')
  expect(pageText).not.toContain('Person / driver ID')
  expect(pageText).not.toContain('National ID')
  expect(pageText).not.toContain('Mobile number')
  expect(pageText).not.toContain('No document on record')
  expect(pageText).toContain('شناسه شخص / راننده')
  expect(pageText).toContain('کد ملی')
  expect(pageText).toContain('تلفن همراه')

  await expectNoHorizontalOverflow(page, 1440, 960)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('driver-detail-desktop.png'), fullPage: true })
  await expect(page).toHaveScreenshot('driver-detail-fa-desktop.png', {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixelRatio: 0.03,
  })
  await expectNoHorizontalOverflow(page, 768, 1024)
  await expectNoHorizontalOverflow(page, 375, 812)
  const mobileHeading = await driverName.boundingBox()
  expect(mobileHeading?.width).toBeGreaterThan(200)
  expect(mobileHeading?.height).toBeLessThan(100)
  await expectNoHorizontalOverflow(page, 320, 740)
  await expectAttachmentTextWidth(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('driver-detail-mobile.png'), fullPage: true })

  await page.getByRole('button', { name: 'شخصی‌سازی پوسته', exact: true }).click()
  await page.getByLabel('زبان').selectOption('en')
  await page.getByRole('dialog').getByRole('button').first().click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.getByRole('heading', { name: 'علی محمودی', level: 1 })).toBeVisible()
  await expect(page.getByText(/National ID: 4410360760/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Drivers', exact: true })).toHaveAttribute(
    'href',
    '/client/1/drivers',
  )
  await expectNoHorizontalOverflow(page, 375, 812)
  await expect(driverName).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page).toHaveScreenshot('driver-detail-en-mobile.png', {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixelRatio: 0.03,
  })

  await page.getByRole('button', { name: 'Customize theme', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Language').selectOption('fa')
  await page.getByRole('dialog').getByRole('button').first().click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'علی محمودی', level: 1 })).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page).toHaveScreenshot('driver-detail-fa-mobile.png', {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixelRatio: 0.03,
  })
  expect(unexpectedErrors).toEqual([])
})
