import { expect, test } from '@playwright/test';

const routes = [
  '/dashboard',
  '/income',
  '/expenses',
  '/budget',
  '/planning',
  '/net-worth',
  '/fire',
  '/portfolio',
  '/advisor',
];

test('authenticated app shell opens all critical routes', async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(new RegExp(route === '/budget' ? '/budget-planning\\?section=budget' : route === '/planning' ? '/budget-planning\\?section=forecast' : route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
