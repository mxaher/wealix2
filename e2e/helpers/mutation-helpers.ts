import { expect, Page } from '@playwright/test';
import { readFinancialStateVersion, waitForFinancialSnapshotRefresh } from './financial-assertions';
import { gotoPlanningSection, gotoRoute } from './navigation';

async function flushWorkspaceToRemote(page: Page) {
  await page.evaluate(async () => {
    const getState = (window as Window & {
      __WEALIX_E2E_GET_STATE__?: () => Record<string, unknown>;
    }).__WEALIX_E2E_GET_STATE__;

    if (!getState) {
      throw new Error('Missing live E2E store accessor.');
    }
    const state = getState();
    const workspace = {
      appMode: state.appMode,
      startPage: state.startPage,
      notificationPreferences: state.notificationPreferences,
      notificationFeed: state.notificationFeed,
      incomeEntries: state.incomeEntries,
      expenseEntries: state.expenseEntries,
      receiptScans: state.receiptScans,
      portfolioHoldings: state.portfolioHoldings,
      portfolioAnalysisHistory: state.portfolioAnalysisHistory,
      investmentDecisionHistory: state.investmentDecisionHistory,
      assets: state.assets,
      liabilities: state.liabilities,
      budgetLimits: state.budgetLimits,
      recurringObligations: state.recurringObligations,
      oneTimeExpenses: state.oneTimeExpenses,
      savingsAccounts: state.savingsAccounts,
    };

    const response = await fetch('/api/user-data', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workspace }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(`Workspace flush failed: ${response.status} ${JSON.stringify(data)}`);
    }
  });
}

async function waitForDialogsToClose(page: Page) {
  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0, { timeout: 5_000 }).catch(() => null);
}

export async function updateSalary(page: Page, amount: number) {
  const previousVersion = await readFinancialStateVersion(page);
  await gotoRoute(page, '/income');
  await page.getByRole('button', { name: /Add Income/i }).click();
  await page.getByLabel('Amount').fill(String(amount));
  await page.getByLabel('Source Name').fill('Salary Raise');
  await page.getByRole('button', { name: /Save Income/i }).click();
  await waitForDialogsToClose(page);
  await expect(page.getByText('Salary Raise')).toBeVisible();
  await waitForFinancialSnapshotRefresh(page, previousVersion);
  await flushWorkspaceToRemote(page);
}

export async function addExpense(page: Page, payload: { amount: number; category?: string; description: string }) {
  const previousVersion = await readFinancialStateVersion(page);
  await gotoRoute(page, '/expenses');
  await page.getByRole('button', { name: /Add Expense/i }).click();
  await page.getByLabel('Amount').fill(String(payload.amount));
  await page.getByLabel('Description').fill(payload.description);
  await page.getByRole('button', { name: /^Save Expense$|^Expense added$|^Save$|^Add$/i }).last().click();
  await waitForDialogsToClose(page);
  await expect(page.getByText(payload.description)).toBeVisible();
  await waitForFinancialSnapshotRefresh(page, previousVersion);
  await flushWorkspaceToRemote(page);
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
  await page.getByRole('button', { name: /Decision Check/i }).click();
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
