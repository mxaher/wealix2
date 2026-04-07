import { expect, test } from '@playwright/test';
import { getExpectedPersona } from '../../fixtures/expected-calculations';
import { expectWaelResponseContains } from '../../helpers/ai-assertions';
import { assertDashboardSummary, assertNetWorth } from '../../helpers/financial-assertions';
import { askWael } from '../../helpers/mutation-helpers';
import { gotoRoute } from '../../helpers/navigation';
import { seedPersona } from '../../seed/seed-persona';

test('net worth layering distinguishes liquid, locked, investments, and obligations', async ({ page }) => {
  await seedPersona(page, 'HEALTHY');
  const expected = getExpectedPersona('HEALTHY');

  await gotoRoute(page, '/net-worth');
  await assertNetWorth(page, {
    liquid: expected.snapshot.netWorth.liquid,
    locked: expected.snapshot.netWorth.locked,
    investments: expected.snapshot.netWorth.investments,
    net: expected.snapshot.netWorth.net,
  });

  await gotoRoute(page, '/dashboard');
  await assertDashboardSummary(page, {
    income: expected.snapshot.monthlyIncome,
    expenses: expected.snapshot.monthlyExpenses,
    surplus: expected.snapshot.monthlySurplus,
    netWorth: expected.snapshot.netWorth.net,
    fireProgress: expected.snapshot.fire.progressPct,
  });

  await askWael(page, 'Break down my net worth by liquid, locked, and investments.');
  await expectWaelResponseContains(page, [expected.snapshot.netWorth.liquid, expected.snapshot.netWorth.locked, expected.snapshot.netWorth.investments]);
  await expect(page.getByTestId('advisor-message-assistant').last()).toContainText(/liquid|locked|investment|volatile/i);
});
