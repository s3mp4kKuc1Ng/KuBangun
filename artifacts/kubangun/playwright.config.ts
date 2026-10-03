import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Use the managed preview, never start a duplicate app server.
// Outside Replit, start the app separately and set KUBANGUN_TEST_BASE_URL.
const systemChromium = '/repl/tools/bin/chromium';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  || (existsSync(systemChromium) ? systemChromium : undefined);

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: 'list',
  use: {
    baseURL: process.env.KUBANGUN_TEST_BASE_URL || 'http://localhost:80/',
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // No persistent profile, shared storageState file, or user session.
    storageState: { cookies: [], origins: [] },
  },
});