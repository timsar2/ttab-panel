import { test, expect } from '@playwright/test';

test('defaults to an accessible Persian RTL login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  expect(await page.evaluate(() => 'Zone' in globalThis)).toBe(false);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('#username')).toHaveAttribute(
    'autocomplete',
    'username',
  );
  await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  await expect(page.locator('#username')).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.locator('#password')).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#username-error')).toBeVisible();
  await expect(page.locator('#password-error')).toBeVisible();
  await expect(page.locator('#username')).toBeFocused();
});

test('switches direction and theme, but never fabricates a login', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/login');
  await page.getByRole('button', { name: /تغییر زبان/ }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByLabel('Username', { exact: true }).fill('example');
  await page.getByLabel('Password', { exact: true }).fill('example-password');
  await page
    .getByRole('button', { name: 'Show password', exact: true })
    .click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Sign in to panel' }).click();
  await expect(
    page.getByText('Authentication is not configured', { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(errors).toEqual([]);
});

test('fits a narrow viewport in both directions', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/login');
  const hasOverflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
  await expect(page.locator('button[type="submit"]')).toBeVisible();
  expect(await hasOverflow()).toBe(false);
  await page.getByRole('button', { name: /تغییر زبان/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Sign in to your panel' }),
  ).toBeVisible();
  expect(await hasOverflow()).toBe(false);
});

test('serves the RTL login before JavaScript and rejects unknown hosts', async ({
  request,
}) => {
  const response = await request.get('/login');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  const html = await response.text();
  expect(html).toContain('dir="rtl"');
  expect(html).toContain('lang="fa"');
  expect(html).toContain('id="username"');
  expect(html).toContain('id="password"');
  const rejected = await request.get('/login', {
    headers: { host: 'untrusted.example' },
  });
  expect(rejected.status()).toBe(400);
});
