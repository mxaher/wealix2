import { test } from '@playwright/test';
import { getExpectedPersona, withAddedExpense, withAddedIncome } from '../../fixtures/expected-calculations';
import { expectWaelResponseContains } from '../../helpers/ai-assertions';
import { assertDashboardSummary, assertFire } from '../../helpers/financial-assertions';
import { addExpense, askWael, updateSalary } from '../../helpers/mutation-helpers';
import { gotoRoute } from '../../helpers/navigation';
import { seedPersona } from '../../seed/seed-persona';

test('FIRE metrics update after expense and contribution-capacity changes', async ({ page }) => {
  await seedPersona(page, 'HEALTHY');
  await addExpense(page, { amount: 1100, description: 'Higher Housing Service', category: 'Housing' });
  await updateSalary(page, 2500);

  const expected = withAddedIncome(
    withAddedExpense(getExpectedPersona('HEALTHY'), { amount: 1100, description: 'Higher Housing Service', category: 'Housing' }),
    2500
  );

  await gotoRoute(page, '/fire');
  await assertFire(page, {
    fireNumber: expected.snapshot.fire.fireNumber,
    progressPct: expected.snapshot.fire.progressPct,
    yearsToFire: expected.snapshot.fire.yearsToFire,
  });

  await gotoRoute(page, '/dashboard');
  await assertDashboardSummary(page, {
    income: expected.snapshot.monthlyIncome,
    expenses: expected.snapshot.monthlyExpenses,
    surplus: expected.snapshot.monthlySurplus,
    netWorth: expected.snapshot.netWorth.net,
    fireProgress: expected.snapshot.fire.progressPct,
  });

  await askWael(page, 'Am I still on track for FIRE?');
  await expectWaelResponseContains(page, [expected.snapshot.fire.fireNumber, expected.snapshot.fire.progressPct]);
});
