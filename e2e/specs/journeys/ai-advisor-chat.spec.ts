// BUG #028 FIX — AI advisor chat journey test
import { test, expect } from '@playwright/test';

test.describe('AI Advisor: Chat Flow', () => {
  test('user can send a message and receive a response', async ({ page }) => {
    await page.goto('/advisor');
    await page.getByPlaceholder(/ask|message|type/i).fill('What is my portfolio risk level?');
    await page.getByRole('button', { name: /send|submit/i }).click();
    await expect(page.getByTestId('advisor-response')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('advisor-response')).not.toBeEmpty();
  });
});
