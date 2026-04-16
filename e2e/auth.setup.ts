// BUG #029 FIX — Complete E2E auth setup with security validations
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate test user', async ({ page }) => {
  const e2eSecret = process.env.PLAYWRIGHT_E2E_SECRET;

  if (!e2eSecret) {
    throw new Error(
      'PLAYWRIGHT_E2E_SECRET is not set. Required for E2E auth bypass. ' +
      'Must be a 256-bit random token present only in CI environments.'
    );
  }

  if (e2eSecret.length < 32) {
    throw new Error('PLAYWRIGHT_E2E_SECRET must be at least 32 characters (256-bit random token).');
  }

  const res = await page.request.post('/api/e2e/auth', {
    headers: { 'X-E2E-Secret': e2eSecret },
    data: { email: process.env.E2E_TEST_USER_EMAIL! },
  });

  expect(res.ok()).toBeTruthy();

  await page.goto('/app');
  await expect(page).toHaveURL(/\/app/, { timeout: 10_000 });
  await page.context().storageState({ path: authFile });
});
