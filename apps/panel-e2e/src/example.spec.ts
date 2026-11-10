import { test, expect } from '@playwright/test'
import { credentials, mockAuthentication } from './support/auth-fixture'

test('company editor preserves full DTOs and zero coordinates with dependent lookups and duplicate-save protection', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await mockAuthentication(page)
  const envelope = (result: unknown) => ({ code: '2000', massage: null, result })
  const original = {
    id: 2,
    name: 'Existing company',
    companyTypeId: 1,
    companyTypeName: 'Transport',
    cityId: 7,
    provinceId: 3,
    address: 'Original address',
    postalCode: '01234',
    lat: 0,
    lng: 0,
    mobileNumber: '+98 900 000',
    phoneNumber: '021000',
    faxNumber: null,
    description: 'Original description',
    companyLogo: 'existing.png',
  }
  await page.route('**/api/v1/companys/types', route =>
    route.fulfill({ json: envelope([{ id: 1, name: 'Transport' }]) }),
  )
  await page.route('**/api/states', route =>
    route.fulfill({
      json: envelope([
        { id: 3, name: 'First province' },
        { id: 4, name: 'Second province' },
      ]),
    }),
  )
  const provinceRequests: number[] = []
  await page.route('**/api/states/Cities', route => {
    const province = route.request().postDataJSON().provinceId
    provinceRequests.push(province)
    return route.fulfill({
      json: envelope([
        { id: province === 3 ? 7 : 8, name: province === 3 ? 'First city' : 'Second city' },
      ]),
    })
  })
  await page.route('**/api/v1/companys/2', route => route.fulfill({ json: envelope(original) }))
  await page.route('**/api/v1/companys/search', route =>
    route.fulfill({
      json: envelope({
        list: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          pageSize: 10,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      }),
    }),
  )
  let saves = 0
  let releaseSave: (() => void) | undefined
  const submitted: Record<string, unknown>[] = []
  await page.route('**/api/v1/companys', async route => {
    saves++
    const body = route.request().postDataJSON()
    submitted.push(body)
    expect(route.request().method()).toBe('POST')
    if (body.name === 'Rejected') {
      await route.fulfill({
        status: 400,
        json: {
          errors: {
            Name: ['Server rejected the name'],
            PhoneNumber: ['Server rejected the phone'],
          },
        },
      })
      return
    }
    await new Promise<void>(resolve => {
      releaseSave = resolve
    })
    await route.fulfill({
      json: envelope({
        ...original,
        ...body,
        id: body.id ?? 10,
        companyLogo: body.companyLogo ? 'updated-logo.png' : original.companyLogo,
        lat: body.coordinate?.lat ?? null,
        lng: body.coordinate?.lng ?? null,
        provinceId: body.cityId === 8 ? 4 : 3,
      }),
    })
  })
  await page.goto('/login')
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/workspace$/)
  await page.goto('/companies/2/edit')
  await expect(page.getByRole('textbox', { name: 'Company name', exact: true })).toHaveValue(
    'Existing company',
  )
  await expect(page.getByRole('textbox', { name: 'Latitude', exact: true })).toHaveValue('0')
  await expect(page.getByRole('textbox', { name: 'Longitude', exact: true })).toHaveValue('0')
  await expect(page.getByRole('combobox', { name: 'City', exact: true })).toHaveValue('7')
  for (const direction of ['rtl', 'ltr']) {
    await page.evaluate(dir => document.documentElement.setAttribute('dir', dir), direction)
    await page.setViewportSize({ width: 375, height: 812 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    for (const label of ['Company type', 'Province', 'City']) {
      expect(
        (await page.getByRole('combobox', { name: label, exact: true }).boundingBox())?.height,
      ).toBeGreaterThanOrEqual(44)
    }
    expect(
      (await page.getByRole('textbox', { name: 'Latitude', exact: true }).boundingBox())?.height,
    ).toBeGreaterThanOrEqual(44)
  }
  await page.getByRole('combobox', { name: 'Province', exact: true }).selectOption('4')
  await expect(page.getByRole('combobox', { name: 'City', exact: true })).toHaveValue('')
  await page.getByRole('combobox', { name: 'City', exact: true }).selectOption('8')
  expect(provinceRequests).toContain(4)
  await page.getByRole('link', { name: 'Back to companies', exact: true }).click()
  await expect(
    page.getByRole('alertdialog', { name: 'Discard unsaved changes?', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Tab')
  expect(
    await page.evaluate(
      () => !!document.querySelector('[role=alertdialog]')?.contains(document.activeElement),
    ),
  ).toBe(true)
  await expect
    .poll(
      async () =>
        (await page.getByRole('button', { name: 'Keep editing', exact: true }).boundingBox())
          ?.height ?? 0,
    )
    .toBeGreaterThanOrEqual(44)
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Back to companies', exact: true })).toBeFocused()
  await expect(page).toHaveURL(/\/companies\/2\/edit$/)
  await expect(page.getByRole('combobox', { name: 'City', exact: true })).toHaveValue('8')
  const logo = page.getByLabel('Company logo', { exact: true })
  await expect(
    page.locator('lib-file-upload').getByRole('button', { name: 'Remove', exact: true }),
  ).toHaveCount(0)
  await logo.setInputFiles({
    name: 'unsupported.gif',
    mimeType: 'image/gif',
    buffer: Buffer.from('GIF89a'),
  })
  await expect(page.getByRole('button', { name: 'Save company', exact: true })).toBeDisabled()
  await logo.setInputFiles({
    name: 'too-large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(256 * 1024 + 1),
  })
  await expect(page.getByRole('button', { name: 'Save company', exact: true })).toBeDisabled()
  expect(saves).toBe(0)
  const imageData = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to create the controlled image fixture.')
    context.fillRect(0, 0, 1, 1)
    return canvas.toDataURL('image/png')
  })
  await logo.setInputFiles({
    name: 'replacement.PNG',
    mimeType: 'image/png',
    buffer: Buffer.from(imageData.split(',')[1], 'base64'),
  })
  await expect(page.locator('lib-file-upload img')).toBeVisible()
  await expect(page.locator('lib-file-upload img')).toHaveAttribute('src', /^blob:/)
  await expect(page.getByRole('button', { name: 'Save company', exact: true })).toBeEnabled()
  await page.getByRole('textbox', { name: 'Company name', exact: true }).fill('Rejected')
  await page.getByRole('button', { name: 'Save company', exact: true }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Unable to complete the request' }),
  ).toContainText('Server rejected the phone')
  await expect(page.getByText('Server rejected the name').first()).toBeVisible()
  await page.getByRole('textbox', { name: 'Company name', exact: true }).fill('Updated company')
  await page.getByRole('textbox', { name: 'Phone number', exact: true }).fill('021111')
  await page.getByRole('button', { name: 'Save company', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Saving...', exact: true })).toBeDisabled()
  await page.locator('form').dispatchEvent('submit')
  await expect.poll(() => saves).toBe(2)
  expect(submitted[1]).toMatchObject({
    id: 2,
    name: 'Updated company',
    cityId: 8,
    address: 'Original address',
    postalCode: '01234',
    coordinate: { lat: 0, lng: 0, srid: 4326 },
    companyLogo: { extension: '.png', data: imageData, deleteCurrentImage: false },
    mobileNumber: '+98 900 000',
    phoneNumber: '021111',
  })
  expect(submitted[1]).not.toHaveProperty('provinceId')
  releaseSave?.()
  await expect(page.getByRole('status').filter({ hasText: 'Company saved.' })).toBeVisible()
  await expect(page.locator('lib-file-upload img')).toHaveCount(0)
  await expect(page).toHaveURL(/\/companies\/2\/edit$/)
  await page.getByRole('textbox', { name: 'Company name', exact: true }).fill('Unsaved after save')
  await page.getByRole('link', { name: 'Back to companies', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/companies\/2\/edit$/)
  await page.getByRole('link', { name: 'Back to companies', exact: true }).click()
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(page).toHaveURL(/\/companies$/)
  await page.getByRole('link', { name: 'Create company', exact: true }).click()
  await expect(page).toHaveURL(/\/companies\/new$/)
  await page.getByRole('button', { name: 'Save company', exact: true }).click()
  await expect(page.getByText('Company name is required.', { exact: true })).toBeVisible()
  expect(saves).toBe(2)
  await page.getByRole('textbox', { name: 'Company name', exact: true }).fill('Created company')
  await page.getByRole('combobox', { name: 'Company type', exact: true }).selectOption('1')
  await page.getByRole('combobox', { name: 'Province', exact: true }).selectOption('3')
  await page.getByRole('combobox', { name: 'City', exact: true }).selectOption('7')
  await page.getByRole('textbox', { name: 'Latitude', exact: true }).fill('0')
  await page.getByRole('textbox', { name: 'Longitude', exact: true }).fill('0')
  await page.getByRole('textbox', { name: 'Longitude', exact: true }).press('Enter')
  await expect.poll(() => saves).toBe(3)
  expect(submitted[2]).toMatchObject({
    id: null,
    name: 'Created company',
    companyTypeId: 1,
    cityId: 7,
    coordinate: { lat: 0, lng: 0, srid: 4326 },
    companyLogo: null,
  })
  releaseSave?.()
  await expect(page.getByRole('status').filter({ hasText: 'Company saved.' })).toBeVisible()
  await expect(page).toHaveURL(/\/companies\/new$/)
  await page.goto('/companys/detail/2')
  await expect(page).toHaveURL(/\/companies\/2\/edit$/)
  await expect(page.getByRole('textbox', { name: 'Company name', exact: true })).toHaveValue(
    'Existing company',
  )
  expect(errors).toEqual([])
})

test('company workspace validates direct IDs, restores reload, denies substitution and clears logout', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await mockAuthentication(page)
  let detailReads = 0
  await page.route(/\/api\/v1\/companys\/\d+$/, async route => {
    detailReads++
    const id = Number(new URL(route.request().url()).pathname.split('/').pop())
    if (id === 3) {
      await route.fulfill({ status: 403, json: {} })
      return
    }
    await route.fulfill({
      json: {
        code: '2000',
        massage: 'Success',
        result: {
          id: 1,
          name: 'Private company one',
          companyTypeId: 1,
          companyTypeName: 'Transport',
          cityId: 2,
          provinceId: 1,
          address: 'Company address',
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
    })
  })
  await page.route('**/api/v1/companys/search', route =>
    route.fulfill({
      json: {
        code: '2000',
        massage: 'Success',
        result: {
          list: [
            {
              id: 1,
              name: 'Private company one',
              companyTypeName: 'Transport',
              provinceName: null,
              cityName: null,
              companyLogo: null,
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
    }),
  )
  await page.goto('/login')
  await page.locator('#username').fill(credentials.username)
  await page.locator('#password').fill(credentials.password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/workspace$/)
  await page.goto('/companies')
  await page
    .getByRole('button', { name: 'Open workspace: Private company one', exact: true })
    .click()
  await expect(page).toHaveURL(/\/client\/1$/)
  await expect(
    page.getByRole('heading', { name: 'Private company one', exact: true }),
  ).toBeVisible()
  const htmlResponse = await page.reload()
  await expect(page.getByRole('navigation', { name: 'Breadcrumbs', exact: true })).toContainText(
    'Private company one',
  )
  expect(await htmlResponse?.text()).not.toContain('Private company one')
  await expect(
    page.getByRole('heading', { name: 'Private company one', exact: true }),
  ).toBeVisible()
  await page.setViewportSize({ width: 375, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const logout = page.getByRole('button', { name: 'Sign out', exact: true })
  expect((await logout.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  for (const sidebarStyle of ['full', 'mini', 'compact', 'modern', 'icon-hover']) {
    await page.evaluate(sidebarStyle => {
      const current = JSON.parse(localStorage.getItem('panel.theme.v1') || '{}')
      localStorage.setItem('panel.theme.v1', JSON.stringify({ ...current, sidebarStyle }))
    }, sidebarStyle)
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Private company one', exact: true }),
    ).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-sidebar-style', sidebarStyle)
    for (const direction of ['rtl', 'ltr']) {
      await page.evaluate(dir => document.documentElement.setAttribute('dir', dir), direction)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${sidebarStyle}/${direction}`,
      ).toBe(true)
      const link = page.getByRole('link', { name: 'Switch company', exact: true })
      await link.focus()
      await expect(link).toBeFocused()
      expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    }
  }
  await page.goto('/client/2')
  await expect(page.getByRole('heading', { name: 'Unable to load company' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Private company one', exact: true })).toHaveCount(
    0,
  )
  await page.goto('/client/3')
  await expect(page.getByRole('heading', { name: 'Company access denied' })).toBeVisible()
  const readsBeforeInvalid = detailReads
  await page.goto('/client/0')
  await expect(page.getByRole('heading', { name: 'Invalid company URL' })).toBeVisible()
  expect(detailReads).toBe(readsBeforeInvalid)
  await page.goto('/client/1')
  await expect(
    page.getByRole('heading', { name: 'Private company one', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  const readsBeforeAnonymous = detailReads
  await page.goto('/client/1')
  await expect(page).toHaveURL(/\/login\?returnUrl=/)
  expect(detailReads).toBe(readsBeforeAnonymous)
  await expect(page.getByText('Private company one')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('company table uses server paging and search with keyboard/mobile RTL and LTR', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (
      message.type() === 'error' &&
      !/Failed to load resource|fonts.googleapis/.test(message.text())
    ) {
      errors.push(message.text())
    }
  })
  await mockAuthentication(page)
  const requests: { name: string | null; pageNumber: number; pageSize: number }[] = []
  await page.route('**/api/v1/companys/search', async route => {
    const query = route.request().postDataJSON()
    requests.push(query)
    expect(route.request().headers()['authorization']).toBeUndefined()
    expect(route.request().headers()['x-auth-request']).toBe('1')
    if (query.name === 'denied') {
      await route.fulfill({ status: 403, json: {} })
      return
    }
    if (query.name === 'error') {
      await route.fulfill({ status: 500, json: { exception: 'private database details' } })
      return
    }
    const list =
      query.name === 'empty'
        ? []
        : [
            {
              id: query.pageNumber,
              name: `${query.name ?? 'Company'} page ${query.pageNumber}`,
              companyTypeName: 'Transport',
              provinceName: 'Province',
              cityName: 'City',
              companyLogo: null,
            },
          ]
    await route.fulfill({
      json: {
        code: '2000',
        massage: 'Success',
        result: {
          list,
          pagination: {
            currentPage: query.pageNumber,
            pageSize: query.pageSize,
            totalCount: list.length ? 21 : 0,
            totalPages: list.length ? 3 : 0,
            hasPreviousPage: query.pageNumber > 1,
            hasNextPage: list.length > 0 && query.pageNumber < 3,
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
  await page.goto('/companies')
  await expect(page.getByRole('cell', { name: 'Company page 1', exact: true })).toBeVisible()
  expect(requests[0]).toEqual({ name: null, pageNumber: 1, pageSize: 10 })
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByRole('cell', { name: 'Company page 2', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Company page 1', exact: true })).toHaveCount(0)
  for (const direction of ['rtl', 'ltr']) {
    await page.evaluate(dir => document.documentElement.setAttribute('dir', dir), direction)
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 800 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      const next = page.getByRole('button', { name: 'Next', exact: true })
      expect((await next.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      await page.getByRole('region', { name: 'Companies', exact: true }).focus()
      await expect(page.getByRole('region', { name: 'Companies', exact: true })).toBeFocused()
    }
  }
  const search = page.getByRole('searchbox', { name: 'Company name' })
  await search.fill('Filtered')
  await search.press('Enter')
  await expect(page.getByRole('cell', { name: 'Filtered page 1', exact: true })).toBeVisible()
  expect(requests[requests.length - 1]).toEqual({ name: 'Filtered', pageNumber: 1, pageSize: 10 })
  await search.fill('empty')
  await search.press('Enter')
  await expect(page.getByRole('status')).toContainText('No records found.')
  for (const [name, message] of [
    ['denied', 'You do not have access to company search.'],
    ['error', 'The request could not be completed.'],
  ]) {
    await search.fill(name)
    await search.press('Enter')
    await expect(page.getByRole('cell', { name: 'Filtered page 1', exact: true })).toHaveCount(0)
    await expect(page.getByRole('alert')).toContainText(message)
  }
  await expect(page.getByText('private database details')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('does not accept credentials until hydration owns the form', async ({ page }) => {
  let releaseScripts: () => void = () => undefined
  const scriptsReady = new Promise<void>(resolve => {
    releaseScripts = resolve
  })
  await page.route('**/*.js', async route => {
    await scriptsReady
    await route.continue()
  })
  await page.route('**/api/auth/login', route =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ messages: ['Invalid credentials.'] }),
    }),
  )
  try {
    await page.goto('/login', { waitUntil: 'commit' })
    await expect(page.locator('#username')).toBeDisabled()
    await expect(page.locator('button[type="submit"]')).toBeDisabled()
    releaseScripts()
    await expect(page.locator('#username')).toBeEnabled()
    await page.locator('#username').fill('hydrated@example.test')
    await page.locator('#password').fill('example-password')
    const submitted = page.waitForRequest('**/api/auth/login')
    await page.locator('button[type="submit"]').click()
    expect((await submitted).postDataJSON()).toEqual({
      username: 'hydrated@example.test',
      password: 'example-password',
    })
  } finally {
    releaseScripts()
  }
})

test('defaults to an accessible Persian RTL login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
  expect(await page.evaluate(() => 'Zone' in globalThis)).toBe(false)
  const brand = await page.getByRole('link', { name: 'Panel', exact: true }).boundingBox()
  expect(brand?.height).toBeGreaterThanOrEqual(44)
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('#username')).toHaveAttribute('autocomplete', 'username')
  await expect(page.locator('#password')).toHaveAttribute('type', 'password')
  await expect(page.locator('#username')).not.toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#password')).not.toHaveAttribute('aria-invalid', 'true')
  await page.locator('button[type="submit"]').click()
  await expect(page.locator('#username-error')).toBeVisible()
  await expect(page.locator('#password-error')).toBeVisible()
  await expect(page.locator('#username')).toBeFocused()
})

test('switches appearance and displays a rejected login without fabricating a session', async ({
  page,
}) => {
  const errors: string[] = []
  let loginRequests = 0
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/auth/login', route => {
    loginRequests++
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ messages: ['Invalid credentials.'] }),
    })
  })
  await page.goto('/login')
  await page.locator('#username').fill('example')
  await page.locator('#password').fill('example-password')
  await page.locator('button[type="submit"]').click()
  const feedback = page.getByRole('status').locator('p')
  await expect(feedback).toContainText(/[\u0600-\u06ff]/)
  await expect(feedback).not.toContainText('Invalid credentials.')
  await expect(feedback).not.toContainText('Sign-in failed.')
  await page.getByRole('button', { name: /تغییر زبان/ }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(feedback).toHaveText('The username or password is incorrect.')
  expect(loginRequests).toBe(1)
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByLabel('Username', { exact: true }).fill('example')
  await page.getByLabel('Password', { exact: true }).fill('example-password')
  await page.getByRole('button', { name: 'Show password', exact: true }).click()
  await expect(page.locator('#password')).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Sign in to panel' }).click()
  await expect(
    page.getByText('The username or password is incorrect.', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
  expect(errors).toEqual([])
})

test('uses shared cookie login, a protected layout, and local-first logout', async ({ page }) => {
  await mockAuthentication(page)
  await page.goto('/workspace')
  await expect(page).toHaveURL(/\/login\?returnUrl=/)
  await page.getByRole('button', { name: /تغییر زبان/ }).click()
  await page.getByLabel('Username', { exact: true }).fill('example@example.test')
  await page.getByLabel('Password', { exact: true }).fill('example-password')
  await page.getByRole('button', { name: 'Sign in to panel' }).click()
  await expect(page).toHaveURL(/\/workspace$/)
  await expect(page.getByRole('heading', { name: 'You are signed in' })).toBeVisible()
  await expect(page.getByText('Example User', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/workspace')
  await expect(page).toHaveURL(/\/login\?returnUrl=/)
})

test('fits a narrow viewport in both directions', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/login')
  const hasOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  await expect(page.locator('button[type="submit"]')).toBeVisible()
  expect(await hasOverflow()).toBe(false)
  await page.getByRole('button', { name: /تغییر زبان/ }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to your panel' })).toBeVisible()
  expect(await hasOverflow()).toBe(false)
})

test('serves the RTL login before JavaScript', async ({ request }) => {
  const response = await request.get('/login')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('dir="rtl"')
  expect(html).toContain('lang="fa"')
  expect(html).toContain('id="username"')
  expect(html).toContain('id="password"')
  const renderedUsername = html.match(/<input\b[^>]*id="username"[^>]*>/)?.[0]
  expect(renderedUsername).toContain('disabled')
})

test('enforces production SSR host, cache, and API boundaries', async ({ request }) => {
  test.skip(
    !process.env['BASE_URL'],
    'Requires the production SSR server, not the development API proxy',
  )
  const response = await request.get('/login')
  expect(response.headers()['cache-control']).toBe('no-store')
  const privatePage = await request.get('/workspace')
  expect(privatePage.status()).toBe(200)
  expect(await privatePage.text()).not.toContain('You are signed in')
  const unavailableApi = await request.get('/api/personal/logout')
  expect([404, 503]).toContain(unavailableApi.status())
  expect(unavailableApi.headers()['content-type']).toContain('application/json')
  const rejected = await request.get('/login', {
    headers: { host: 'untrusted.example' },
  })
  expect(rejected.status()).toBe(400)
})
