import { expect, Page } from '@playwright/test';
import { gotoPlanningSection, gotoRoute } from './navigation';

export async function updateSalary(page: Page, amount: number) {
  await gotoRoute(page, '/income');
  await page.getByRole('button', { name: /Add Income/i }).click();
  await page.getByLabel('Amount').fill(String(amount));
  await page.getByLabel('Source Name').fill('Salary Raise');
  await page.getByRole('button', { name: /Save Income/i }).click();
  await expect(page.getByText('Salary Raise')).toBeVisible();
}

export async function addExpense(page: Page, payload: { amount: number; category?: string; description: string }) {
  await gotoRoute(page, '/expenses');
  await page.getByRole('button', { name: /Add Expense/i }).click();
  await page.getByLabel('Amount').fill(String(payload.amount));
  await page.getByLabel('Description').fill(payload.description);
  await page.getByRole('button', { name: /^Expense added$|^Save$|^Add$/i }).last().click();
  await expect(page.getByText(payload.description)).toBeVisible();
}

export async function addObligation(
  page: Page,
  payload: {
    title: string;
    amount: number;
    dueDay: number;
    startDate: string;
    frequency?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'one_time' | 'custom';
  }
) {
  await gotoPlanningSection(page, 'obligations');
  await page.getByRole('button', { name: /Add Obligation/i }).click();
  await page.getByLabel('Title').fill(payload.title);
  await page.getByLabel('Amount').fill(String(payload.amount));
  await page.getByLabel('Due day').fill(String(payload.dueDay));
  await page.getByLabel('Start date').fill(payload.startDate);
  await page.getByRole('button', { name: /^Add$/i }).last().click();
  await expect(page.getByText(payload.title)).toBeVisible();
}

export async function addSavingsAccount(
  page: Page,
  payload: {
    name: string;
    principal: number;
    currentBalance: number;
    annualProfitRate: number;
    termMonths: number;
    openedAt: string;
    maturityDate: string;
    purposeLabel: string;
  }
) {
  await gotoPlanningSection(page, 'obligations');
  await page.getByRole('button', { name: /Savings \/ Awaeed|Savings/i }).click();
  await page.getByLabel('Account name').fill(payload.name);
  await page.getByLabel('Principal').fill(String(payload.principal));
  await page.getByLabel('Current balance').fill(String(payload.currentBalance));
  await page.getByLabel('Annual profit rate').fill(String(payload.annualProfitRate));
  await page.getByLabel('Term months').fill(String(payload.termMonths));
  await page.getByLabel('Opened at').fill(payload.openedAt);
  await page.getByLabel('Maturity date').fill(payload.maturityDate);
  await page.getByLabel('Purpose').fill(payload.purposeLabel);
  await page.getByRole('button', { name: /^Add$/i }).last().click();
  await expect(page.getByText(payload.name)).toBeVisible();
}

export async function addOneTimeExpense(
  page: Page,
  payload: {
    title: string;
    amount: number;
    dueDate: string;
    fundingSource?: string;
  }
) {
  await gotoPlanningSection(page, 'obligations');
  await page.getByRole('button', { name: /One-Time Expense/i }).click();
  await page.getByLabel('Title').fill(payload.title);
  await page.getByLabel('Amount').fill(String(payload.amount));
  await page.getByLabel('Due date').fill(payload.dueDate);
  if (payload.fundingSource) {
    await page.getByLabel('Funding source').fill(payload.fundingSource);
  }
  await page.getByRole('button', { name: /^Add$/i }).last().click();
  await expect(page.getByText(payload.title)).toBeVisible();
}

export async function runDecisionCheck(page: Page, payload: { name: string; amount: number }) {
  await gotoRoute(page, '/portfolio');
  await page.getByTestId('decision-input-name').fill(payload.name);
  await page.getByTestId('decision-input-amount').fill(String(payload.amount));
  await page.getByTestId('decision-run').click();
}

export async function askWael(page: Page, question: string) {
  await gotoRoute(page, '/advisor');
  const input = page.getByTestId('advisor-input');
  await input.fill(question);
  await input.press('Enter');
}
