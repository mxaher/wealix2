import { test as setup } from '@playwright/test';
import { ensureAuthenticatedStorageState } from './helpers/auth';

setup('authenticate once for seeded financial-brain suites', async ({ browser, baseURL }) => {
  await ensureAuthenticatedStorageState(browser, baseURL ?? 'http://127.0.0.1:3000');
});
