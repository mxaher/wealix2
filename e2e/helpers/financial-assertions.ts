import { expect, Locator, Page } from '@playwright/test';
import { currencyFragments, expectTextToContainOneOf } from './formatting';

const STORE_KEY = 'wealix-storage-v4';

function toLocator(page: Page, target: string | Locator) {
  return typeof target === 'string' ? page.getByTestId(target) : target;
}

export async function expectCurrencyValue(page: Page, target: string | Locator, expected: number) {
  const locator = toLocator(page, target);
  await expect(locator).toBeVisible();
  await expectTextToContainOneOf(locator, currencyFragments(expected));
}

export async function readFinancialStateVersion(page: Page) {
  return page.evaluate((storeKey) => {
    const raw = window.localStorage.getItem(storeKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { state?: { financialStateVersion?: number } };
    return parsed.state?.financialStateVersion ?? null;
  }, STORE_KEY);
}

export async function expectSnapshotVersionChanged(page: Page, oldVersion: number | null) {
  await expect
    .poll(async () => readFinancialStateVersion(page))
    .not.toBe(oldVersion);
}

export async function waitForFinancialSnapshotRefresh(page: Page, previousVersion: number | null) {
  await expectSnapshotVersionChanged(page, previousVersion);
}

export async function assertDashboardSummary(page: Page, expected: { income: number; expenses: number; surplus: number; netWorth: number; fireProgress: number }) {
  await expectCurrencyValue(page, 'dashboard-monthly-income', expected.income);
  await expectCurrencyValue(page, 'dashboard-monthly-expenses', expected.expenses);
  await expectCurrencyValue(page, 'dashboard-monthly-surplus', expected.surplus);
  await expectCurrencyValue(page, 'dashboard-net-worth', expected.netWorth);
  await expect(page.getByTestId('dashboard-fire-progress')).toContainText(expected.fireProgress.toFixed(1));
}

export async function assertNetWorth(page: Page, expected: { liquid: number; locked: number; investments: number; net: number }) {
  await expectCurrencyValue(page, 'networth-liquid', expected.liquid);
  await expectCurrencyValue(page, 'networth-locked', expected.locked);
  await expectCurrencyValue(page, 'networth-investments', expected.investments);
  await expectCurrencyValue(page, 'networth-net', expected.net);
}

export async function assertFire(page: Page, expected: { fireNumber: number; progressPct: number; yearsToFire: number | null }) {
  await expectCurrencyValue(page, 'fire-number', expected.fireNumber);
  await expect(page.getByTestId('fire-progress')).toContainText(expected.progressPct.toFixed(1));
  if (expected.yearsToFire !== null) {
    await expect(page.getByTestId('fire-years')).toContainText(String(expected.yearsToFire));
  }
}

export async function assertForecastRow(
  page: Page,
  expected: {
    month: string;
    income: number;
    recurringExpenses: number;
    obligationPayments: number;
    oneTimeExpenses: number;
    maturityInflows: number;
    closingBalance: number;
  }
) {
  const row = page.getByTestId(`planning-forecast-row-${expected.month}`);
  await expect(row).toBeVisible();
  await expectTextToContainOneOf(row, currencyFragments(expected.income));
  await expectTextToContainOneOf(row, currencyFragments(expected.recurringExpenses));
  await expectTextToContainOneOf(row, currencyFragments(expected.obligationPayments));
  await expectTextToContainOneOf(row, currencyFragments(expected.oneTimeExpenses));
  await expectTextToContainOneOf(row, currencyFragments(expected.maturityInflows));
  await expectTextToContainOneOf(row, currencyFragments(expected.closingBalance));
}

export async function assertAlert(page: Page, expected: { severity: string; keyword: string }) {
  const alert = page.getByText(new RegExp(expected.keyword, 'i')).first();
  await expect(alert).toBeVisible();
  if (expected.severity) {
    await expect(page.getByText(new RegExp(expected.severity, 'i')).first()).toBeVisible();
  }
}
