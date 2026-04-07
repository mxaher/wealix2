import { test } from '@playwright/test';
import { getExpectedPersona, withAddedExpense } from '../../fixtures/expected-calculations';
import { expectWaelResponseContains } from '../../helpers/ai-assertions';
import { assertDashboardSummary, assertFire, assertForecastRow } from '../../helpers/financial-assertions';
import { addExpense, askWael } from '../../helpers/mutation-helpers';
import { gotoPlanningSection, gotoRoute } from '../../helpers/navigation';
import { seedPersona } from '../../seed/seed-persona';

test('increasing a household expense worsens dashboard, forecast, FIRE, and Wael outputs', async ({ page }) => {
  await seedPersona(page, 'HEALTHY');
  await addExpense(page, { amount: 1400, description: 'Household Upgrade', category: 'Household' });

  const expected = withAddedExpense(getExpectedPersona('HEALTHY'), { amount: 1400, description: 'Household Upgrade', category: 'Household' });
  await gotoRoute(page, '/dashboard');
  await assertDashboardSummary(page, {
    income: expected.snapshot.monthlyIncome,
    expenses: expected.snapshot.monthlyExpenses,
    surplus: expected.snapshot.monthlySurplus,
    netWorth: expected.snapshot.netWorth.net,
    fireProgress: expected.snapshot.fire.progressPct,
  });

  await gotoPlanningSection(page, 'forecast');
  await assertForecastRow(page, expected.snapshot.forecast.monthlyRows[0]);

  await gotoRoute(page, '/fire');
  await assertFire(page, {
    fireNumber: expected.snapshot.fire.fireNumber,
    progressPct: expected.snapshot.fire.progressPct,
    yearsToFire: expected.snapshot.fire.yearsToFire,
  });

  await askWael(page, 'What should I do about my higher household spend?');
  await expectWaelResponseContains(page, [expected.snapshot.monthlyExpenses, expected.snapshot.monthlySurplus]);
});
