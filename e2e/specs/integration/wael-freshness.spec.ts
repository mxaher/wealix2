import { expect, test } from '@playwright/test';
import { getExpectedPersona, withAddedExpense } from '../../fixtures/expected-calculations';
import { captureAdvisorResponse, expectWaelResponseContains, expectWaelResponseExcludes } from '../../helpers/ai-assertions';
import { readFinancialStateVersion, waitForFinancialSnapshotRefresh } from '../../helpers/financial-assertions';
import { addExpense, askWael } from '../../helpers/mutation-helpers';
import { seedPersona } from '../../seed/seed-persona';

test('Wael reflects updated numbers immediately after a financial mutation', async ({ page }) => {
  await seedPersona(page, 'HEALTHY');
  const before = getExpectedPersona('HEALTHY');
  const oldVersion = await readFinancialStateVersion(page);

  const firstResponse = await captureAdvisorResponse(page, () => askWael(page, 'What is my current monthly surplus?'));
  await expect(firstResponse.ok()).toBeTruthy();
  await expectWaelResponseContains(page, [before.snapshot.monthlyIncome, before.snapshot.monthlySurplus]);

  await addExpense(page, { amount: 900, description: 'Household Increase', category: 'Household' });
  await waitForFinancialSnapshotRefresh(page, oldVersion);

  const after = withAddedExpense(before, { amount: 900, description: 'Household Increase', category: 'Household' });
  const secondResponse = await captureAdvisorResponse(page, () => askWael(page, 'And now what is my monthly surplus?'));
  await expect(secondResponse.ok()).toBeTruthy();
  await expectWaelResponseContains(page, [after.snapshot.monthlyExpenses, after.snapshot.monthlySurplus]);
  await expectWaelResponseExcludes(page, [before.snapshot.monthlySurplus]);
});
