import type { Page } from '@playwright/test';
import { seedWorkspace } from './seed-api';
import { clonePersona } from '../fixtures/personas';

export async function resetUser(page: Page) {
  const empty = clonePersona('HEALTHY');
  empty.incomeEntries = [];
  empty.expenseEntries = [];
  empty.receiptScans = [];
  empty.portfolioHoldings = [];
  empty.portfolioAnalysisHistory = [];
  empty.investmentDecisionHistory = [];
  empty.assets = [];
  empty.liabilities = [];
  empty.budgetLimits = [];
  empty.recurringObligations = [];
  empty.oneTimeExpenses = [];
  empty.savingsAccounts = [];
  await seedWorkspace(page, empty);
}
