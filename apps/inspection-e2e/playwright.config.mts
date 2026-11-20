import { defineConfig, devices } from '@playwright/test'
import { nxE2EPreset } from '@nx/playwright/preset'
import { getReadyUrl, workspaceRoot } from '@nx/devkit'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const isCI = !!process.env['CI']
const externalBaseURL = process.env['BASE_URL']
const inspectionServerURL = 'http://localhost:4200'
const chromiumChannel = process.env['PLAYWRIGHT_CHROMIUM_CHANNEL']
const baseURL = externalBaseURL || getReadyUrl(inspectionServerURL)

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
  ...nxE2EPreset(dirname(fileURLToPath(import.meta.url)), { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  webServer: externalBaseURL
    ? undefined
    : {
        command: isCI ? 'bun nx run inspection:serve-static' : 'bun nx run inspection:serve',
        url: getReadyUrl(inspectionServerURL),
        reuseExistingServer: true,
        cwd: workspaceRoot,
      },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumChannel ? { channel: chromiumChannel } : {}),
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
