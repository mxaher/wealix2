import type { Page } from '@playwright/test';
import type { RemoteWorkspaceSnapshot } from '../../src/store/useAppStore';

const STORAGE_KEYS = ['wealix-storage-v4', 'wealthos-storage', 'wealix-storage-v3'];

export async function seedWorkspace(page: Page, workspace: RemoteWorkspaceSnapshot) {
  await page.goto('/dashboard');

  const result = await page.evaluate(async (nextWorkspace) => {
    const response = await fetch('/api/user-data', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workspace: nextWorkspace }),
    });

    const data = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  }, workspace);

  if (!result.ok) {
    throw new Error(`Seeding workspace failed with ${result.status}: ${JSON.stringify(result.data)}`);
  }

  await page.evaluate((keys) => {
    for (const key of keys) {
      window.localStorage.removeItem(key);
    }
  }, STORAGE_KEYS);

  await page.reload();
  await page.waitForLoadState('networkidle');
}
