import { expect, Page, Response } from '@playwright/test';
import { currencyFragments, expectTextNotToContainAny, expectTextToContainOneOf } from './formatting';

export async function captureDecisionCheckResponse(page: Page, trigger: () => Promise<void>) {
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/investment-decision') && response.request().method() === 'POST');
  await trigger();
  return responsePromise;
}

export async function captureAdvisorResponse(page: Page, trigger: () => Promise<void>) {
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/chat') && response.request().method() === 'POST');
  await trigger();
  return responsePromise;
}

export async function assertApiPayloadIncludesVersion(response: Response) {
  const payload = response.request().postDataJSON() as { clientContext?: { version?: string | number } };
  expect(payload.clientContext?.version).toBeDefined();
}

export async function expectWaelToMention(page: Page, value: string | number) {
  const locator = page.getByTestId('advisor-message-assistant').last();
  await expect(locator).toBeVisible();
  if (typeof value === 'number') {
    await expectTextToContainOneOf(locator, currencyFragments(value));
    return;
  }
  await expect(locator).toContainText(value);
}

export async function expectWaelResponseContains(page: Page, expectedParts: Array<string | number>) {
  for (const part of expectedParts) {
    await expectWaelToMention(page, part);
  }
}

export async function expectWaelResponseExcludes(page: Page, staleParts: Array<string | number>) {
  const locator = page.getByTestId('advisor-message-assistant').last();
  const normalized = staleParts.flatMap((part) => (typeof part === 'number' ? currencyFragments(part) : [part]));
  await expectTextNotToContainAny(locator, normalized);
}

export async function expectDecisionVerdict(page: Page, expected: 'APPROVE' | 'CAUTION' | 'BLOCK') {
  const locator = page.getByTestId('decision-verdict');
  await expect(locator).toBeVisible();

  if (expected === 'APPROVE') {
    await expect(locator).toContainText(/Proceed|Approve/i);
    return;
  }

  if (expected === 'CAUTION') {
    await expect(locator).toContainText(/Caution|Postpone/i);
    return;
  }

  await expect(locator).toContainText(/Do Not Proceed|Block/i);
}
