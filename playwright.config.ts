import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Some sandboxed environments pre-install a Chromium build under a fixed path
// instead of the revision this Playwright version expects. Fall back to it
// only when present; otherwise let Playwright resolve its own managed browser.
const preinstalledChromium = '/opt/pw-browsers/chromium'
const chromiumExecutablePath = existsSync(preinstalledChromium) ? preinstalledChromium : undefined

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3211',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: chromiumExecutablePath,
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 3211',
    url: 'http://localhost:3211',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
