import { defineConfig, devices } from '@playwright/test';

process.env.NEXT_PUBLIC_E2E_AUTH_ENABLED ??= 'true';
process.env.E2E_AUTH_SECRET ??= 'wealix-e2e-secret';
process.env.E2E_AUTH_USER_ID ??= 'e2e-user';
process.env.E2E_AUTH_USER_EMAIL ??= 'e2e@wealix.local';
process.env.E2E_AUTH_USER_NAME ??= 'Wealix E2E';
process.env.E2E_AUTH_SUBSCRIPTION_TIER ??= 'pro';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
process.env.NEXT_PUBLIC_APP_URL ??= baseURL;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: isCI ? 1 : 1,
  timeout: 60_000,
  retries: isCI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'bun run dev',
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\/auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      testMatch: /.*\/specs\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testMatch: /.*\/specs\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
