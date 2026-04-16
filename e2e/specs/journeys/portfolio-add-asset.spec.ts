// BUG #028 FIX — Portfolio add asset journey test
import { test, expect } from '@playwright/test';

test.describe('Portfolio: Add Asset', () => {
  test('user can add a stock and see it in portfolio', async ({ page }) => {
    await page.goto('/portfolio');
    const initialCount = await page.getByTestId('asset-row').count();
    await page.getByRole('button', { name: /add asset|add stock/i }).click();
    await page.getByLabel(/symbol|ticker/i).fill('AAPL');
    await page.getByLabel(/shares|quantity/i).fill('10');
    await page.getByLabel(/purchase price|cost basis/i).fill('175.00');
    await page.getByRole('button', { name: /save|add/i }).click();
    await expect(page.getByTestId('asset-row')).toHaveCount(initialCount + 1, { timeout: 10_000 });
    await expect(page.getByText('AAPL')).toBeVisible();
  });
});
