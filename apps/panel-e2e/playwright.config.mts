import { defineConfig, devices } from '@playwright/test'
import { nxE2EPreset } from '@nx/playwright/preset'
import { getReadyUrl, workspaceRoot } from '@nx/devkit'

const isCI = !!process.env['CI']
// For CI, you may want to set BASE_URL to the deployed application.
// getReadyUrl moves the address to the port the dev server task reported.
const baseURL = process.env['BASE_URL'] || getReadyUrl('http://localhost:4200')
const managedServer = process.env['PANEL_E2E_SERVER']
if (managedServer && managedServer !== 'development' && managedServer !== 'production') {
  throw new Error('PANEL_E2E_SERVER must be development or production.')
}
const managedURL = managedServer ? new URL(baseURL) : null
if (
  managedURL &&
  (managedURL.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(managedURL.hostname) ||
    !managedURL.port ||
    Number(managedURL.port) < 1 ||
    managedURL.username ||
    managedURL.password ||
    managedURL.pathname !== '/' ||
    managedURL.search ||
    managedURL.hash)
)
  throw new Error('Managed E2E servers require an HTTP loopback origin with an explicit port.')

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import 'dotenv/config';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Generated as a .mts file so Node forces ESM regardless of workspace
 * `type`. Playwright routes `.mts` through its ESM loader (dynamic import,
 * bypassing the pirates CJS-compile path), and Nx's native TS strip loads
 * `.mts` directly. Playwright's configLoader auto-discovers
 * `playwright.config.mts` via its extension list
 * (.ts/.js/.mts/.mjs/.cts/.cjs).
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  webServer: managedURL
    ? {
        command:
          managedServer === 'production'
            ? 'node dist/apps/panel/server/server.mjs'
            : `bun nx run panel:serve --port=${managedURL.port}`,
        env: { PORT: managedURL.port },
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        cwd: workspaceRoot,
      }
    : process.env['BASE_URL']
      ? undefined
      : {
          command: isCI ? 'bun nx run panel:serve-static' : 'bun nx run panel:serve',
          url: getReadyUrl('http://localhost:4200'),
          reuseExistingServer: true,
          cwd: workspaceRoot,
        },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env['PLAYWRIGHT_CHROMIUM_CHANNEL'],
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Uncomment for mobile browsers support
    /* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */

    // Uncomment for branded browsers
    /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
  ],
})
