import { test } from '@playwright/test';
import { getExpectedPersona } from '../../fixtures/expected-calculations';
import { assertDashboardSummary, assertFire, assertNetWorth } from '../../helpers/financial-assertions';
import { gotoRoute } from '../../helpers/navigation';
import { seedPersona } from '../../seed/seed-persona';

test('dashboard matches the canonical pressure persona across connected surfaces', async ({ page }) => {
  await seedPersona(page, 'PRESSURE');
  const expected = getExpectedPersona('PRESSURE');

  await gotoRoute(page, '/dashboard');
  await assertDashboardSummary(page, {
    income: expected.snapshot.monthlyIncome,
    expenses: expected.snapshot.monthlyExpenses,
    surplus: expected.snapshot.monthlySurplus,
    netWorth: expected.snapshot.netWorth.net,
    fireProgress: expected.snapshot.fire.progressPct,
  });

  await gotoRoute(page, '/fire');
  await assertFire(page, {
    fireNumber: expected.snapshot.fire.fireNumber,
    progressPct: expected.snapshot.fire.progressPct,
    yearsToFire: expected.snapshot.fire.yearsToFire,
  });

  await gotoRoute(page, '/net-worth');
  await assertNetWorth(page, {
    liquid: expected.snapshot.netWorth.liquid,
    locked: expected.snapshot.netWorth.locked,
    investments: expected.snapshot.netWorth.investments,
    net: expected.snapshot.netWorth.net,
  });
});
