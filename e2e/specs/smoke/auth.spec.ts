import { expect, test } from '@playwright/test';

test('protected routes redirect without authenticated storage state', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/sign-in/);
  await context.close();
});

test('authenticated storage state persists for protected routes', async ({ page, context }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);

  const state = await context.storageState();
  expect(state.cookies.some((cookie) => cookie.name === 'wealix_e2e_auth')).toBeTruthy();
});
