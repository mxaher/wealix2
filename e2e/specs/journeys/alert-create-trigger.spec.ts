// BUG #028 FIX — Price alert creation journey test
import { test, expect } from '@playwright/test';

test.describe('Alerts: Create Price Alert', () => {
  test('user can create a price alert', async ({ page }) => {
    await page.goto('/markets');
    await page.getByRole('button', { name: /create alert|set alert/i }).click();
    await page.getByLabel(/symbol|ticker/i).fill('AAPL');
    await page.getByLabel(/price|target/i).fill('200');
    await page.getByRole('button', { name: /save|create/i }).click();
    await expect(page.getByTestId('alert-row')).toBeVisible({ timeout: 10_000 });
  });
});
