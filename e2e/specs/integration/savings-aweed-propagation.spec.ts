import { expect, test } from '@playwright/test';
import { getExpectedPersona, withAddedSavingsAccount } from '../../fixtures/expected-calculations';
import { expectWaelResponseContains } from '../../helpers/ai-assertions';
import { assertForecastRow, assertNetWorth } from '../../helpers/financial-assertions';
import { addSavingsAccount, askWael } from '../../helpers/mutation-helpers';
import { gotoPlanningSection, gotoRoute } from '../../helpers/navigation';
import { seedPersona } from '../../seed/seed-persona';

test('adding a locked Awaeed account propagates through planning, net worth, FIRE context, and Wael', async ({ page }) => {
  await seedPersona(page, 'HEALTHY');
  const openedAt = new Date().toISOString().slice(0, 10);
  const maturityDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await addSavingsAccount(page, {
    name: 'Awaeed Hajj Reserve',
    principal: 20000,
    currentBalance: 20000,
    annualProfitRate: 4.5,
    termMonths: 3,
    openedAt,
    maturityDate,
    purposeLabel: 'Hajj',
  });

  const expected = withAddedSavingsAccount(getExpectedPersona('HEALTHY'), {
    id: 'awaeed-hajj-reserve',
    name: 'Awaeed Hajj Reserve',
    principal: 20000,
    currentBalance: 20000,
    annualProfitRate: 4.5,
    termMonths: 3,
    openedAt,
    maturityDate,
    purposeLabel: 'Hajj',
  });

  await gotoPlanningSection(page, 'obligations');
  await expect(page.getByText('Awaeed Hajj Reserve')).toBeVisible();

  await gotoRoute(page, '/net-worth');
  await assertNetWorth(page, {
    liquid: expected.snapshot.netWorth.liquid,
    locked: expected.snapshot.netWorth.locked,
    investments: expected.snapshot.netWorth.investments,
    net: expected.snapshot.netWorth.net,
  });

  await gotoPlanningSection(page, 'forecast');
  const maturityRow = expected.snapshot.forecast.monthlyRows.find((row) => row.month === maturityDate.slice(0, 7));
  if (!maturityRow) {
    throw new Error('Expected maturity row was not generated.');
  }
  await assertForecastRow(page, maturityRow);

  await askWael(page, 'What changed after adding the Hajj reserve?');
  await expectWaelResponseContains(page, ['Hajj', expected.snapshot.netWorth.locked, maturityRow.maturityInflows]);
});
