// BUG #028 FIX — FIRE calculator journey test
import { test, expect } from '@playwright/test';

test.describe('FIRE Calculator: Projection', () => {
  test('user inputs FIRE parameters and sees projection', async ({ page }) => {
    await page.goto('/fire');
    await page.getByLabel(/current savings|portfolio value/i).fill('500000');
    await page.getByLabel(/monthly savings|contribution/i).fill('5000');
    await page.getByLabel(/annual expenses|yearly spend/i).fill('60000');
    await page.getByRole('button', { name: /calculate|project/i }).click();
    await expect(page.getByTestId('fire-projection-chart')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('years-to-fire')).toBeVisible();
  });
});
