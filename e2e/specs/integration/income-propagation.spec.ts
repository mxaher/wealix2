import { expect, test } from '@playwright/test';
import { getExpectedPersona, withAddedIncome } from '../../fixtures/expected-calculations';
import { expectWaelResponseContains } from '../../helpers/ai-assertions';
import { assertDashboardSummary, assertFire, assertForecastRow } from '../../helpers/financial-assertions';
import { askWael, updateSalary } from '../../helpers/mutation-helpers';
import { gotoPlanningSection, gotoRoute } from '../../helpers/navigation';
import { seedPersona } from '../../seed/seed-persona';

test('raising income propagates to dashboard, forecast, FIRE, and Wael', async ({ page }) => {
  await seedPersona(page, 'HEALTHY');
  await updateSalary(page, 3200);

  const expected = withAddedIncome(getExpectedPersona('HEALTHY'), 3200);
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

  await askWael(page, 'What changed after my raise?');
  await expectWaelResponseContains(page, [expected.snapshot.monthlyIncome, expected.snapshot.monthlySurplus]);
  await expect(page.getByText(/capacity|surplus|save/i).first()).toBeVisible();
});
