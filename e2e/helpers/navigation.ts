import { expect, Page } from '@playwright/test';

async function waitForLiveWorkspace(page: Page) {
  await page.waitForFunction(() => {
    const raw = window.localStorage.getItem('wealix-storage-v4');
    if (!raw) {
      return false;
    }

    try {
      const parsed = JSON.parse(raw) as {
        state?: {
          appMode?: string;
          user?: {
            id?: string | null;
          } | null;
        };
      };

      return parsed.state?.appMode === 'live' && parsed.state?.user?.id && parsed.state.user.id !== 'guest';
    } catch {
      return false;
    }
  });
}

function toPathPattern(path: string) {
  return new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

async function tryNavigateViaVisibleLink(page: Page, path: string) {
  const escapedPath = path.replace(/"/g, '\\"');
  const link = page.locator(`a[href="${escapedPath}"]:visible`).first();
  if (!(await link.isVisible().catch(() => false))) {
    return false;
  }

  await link.scrollIntoViewIfNeeded().catch(() => undefined);

  try {
    await Promise.all([
      page.waitForURL(toPathPattern(path), { timeout: 2_500 }),
      link.click(),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function gotoRoute(page: Page, path: string) {
  const navigatedViaLink = await tryNavigateViaVisibleLink(page, path);
  if (!navigatedViaLink) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
  }
  await waitForLiveWorkspace(page);
  await expect(page).toHaveURL(toPathPattern(path));
}

export async function gotoPlanningSection(page: Page, section: 'digest' | 'budget' | 'obligations' | 'forecast') {
  await page.goto(`/budget-planning?section=${section}`, { waitUntil: 'domcontentloaded' });
  await waitForLiveWorkspace(page);
}

export async function openDecisionCheckFromAdvisor(page: Page) {
  await gotoRoute(page, '/advisor');
  await page.getByRole('button', { name: /Decision Check/i }).click();
}
