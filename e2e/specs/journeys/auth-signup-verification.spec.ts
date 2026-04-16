// BUG #028 FIX — Auth signup journey test
import { test, expect } from '@playwright/test';

test.describe('Auth: Sign-up → Onboarding', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('user can sign up and reach onboarding', async ({ page }) => {
    await page.goto('/sign-up');
    await page.getByLabel(/email/i).fill(`test+${Date.now()}@example.com`);
    await page.getByLabel(/password/i).fill('SecurePass123!');
    await page.getByRole('button', { name: /sign up|create account/i }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });
  });
});
