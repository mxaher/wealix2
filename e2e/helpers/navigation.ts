import { expect, Page } from '@playwright/test';

export async function gotoRoute(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

export async function gotoPlanningSection(page: Page, section: 'digest' | 'budget' | 'obligations' | 'forecast') {
  await page.goto(`/budget-planning?section=${section}`);
  await page.waitForLoadState('networkidle');
}

export async function openDecisionCheckFromAdvisor(page: Page) {
  await gotoRoute(page, '/advisor');
  await page.getByRole('button', { name: /Decision Check/i }).click();
}
