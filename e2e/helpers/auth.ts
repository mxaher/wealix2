import { mkdir } from 'node:fs/promises';
import { Browser, BrowserContext } from '@playwright/test';

const AUTH_STATE_PATH = 'e2e/.auth/user.json';
const E2E_COOKIE_NAME = 'wealix_e2e_auth';

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for Playwright financial-brain auth.`);
  }
  return value;
}

export function getE2EAuthCookie() {
  return {
    name: E2E_COOKIE_NAME,
    value: requiredEnv('E2E_AUTH_SECRET'),
  };
}

export async function installE2EAuth(context: BrowserContext, baseURL: string) {
  const cookie = getE2EAuthCookie();
  await context.addCookies([
    {
      ...cookie,
      url: baseURL,
      sameSite: 'Lax',
      httpOnly: false,
      secure: baseURL.startsWith('https://'),
    },
  ]);
}

export async function ensureAuthenticatedStorageState(browser: Browser, baseURL: string) {
  await mkdir('e2e/.auth', { recursive: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await installE2EAuth(context, baseURL);
  await page.goto('/dashboard');
  await page.waitForURL(/\/dashboard/);
  await page.context().storageState({ path: AUTH_STATE_PATH });
  await context.close();
}
