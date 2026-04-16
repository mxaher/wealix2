// BUG #030 FIX — Configurable baseURL, CI retries, proper timeouts
import { defineConfig, devices } from '@playwright/test';

// CRITICAL: Do NOT set a default E2E_AUTH_SECRET here.
// CI pipelines must supply a cryptographically strong secret (>= 32 chars) via env.
// A missing or short secret disables the E2E auth bypass system — this is intentional.
process.env.NEXT_PUBLIC_E2E_AUTH_ENABLED ??= 'true';
process.env.E2E_AUTH_USER_ID ??= 'e2e-user';
process.env.E2E_AUTH_USER_EMAIL ??= 'e2e@wealix.local';
process.env.E2E_AUTH_USER_NAME ??= 'Wealix E2E';
process.env.E2E_AUTH_SUBSCRIPTION_TIER ??= 'pro';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
process.env.NEXT_PUBLIC_APP_URL ??= baseURL;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !isCI,
  workers: isCI ? 1 : undefined,
  timeout: 60_000,
  retries: isCI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\/auth\.setup\.ts/,
    },
    // Bug #24 fix: add WebKit/Safari project for Saudi market iOS coverage
    {
      name: 'safari',
      testMatch: /.*\/specs\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
    // Bug #28 fix: add mobile viewport for responsive regression detection
    {
      name: 'mobile-chrome',
      testMatch: /.*\/specs\/.*\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      testMatch: /.*\/specs\/.*\.spec\.ts/,
      use: {
        ...devices['iPhone 14 Pro'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
