import { expect, test } from '@playwright/test';
import { getExpectedPersona, withAddedObligation } from '../../fixtures/expected-calculations';
import { expectWaelResponseContains } from '../../helpers/ai-assertions';
import { assertAlert, assertForecastRow } from '../../helpers/financial-assertions';
import { addObligation, askWael, runDecisionCheck } from '../../helpers/mutation-helpers';
import { gotoPlanningSection, gotoRoute } from '../../helpers/navigation';
import { seedPersona } from '../../seed/seed-persona';

test('a new near-term obligation tightens planning, dashboard alerts, Wael, and Decision Check', async ({ page }) => {
  await seedPersona(page, 'PRESSURE');
  const dueDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const startDate = dueDate.toISOString().slice(0, 10);
  await addObligation(page, {
    title: 'Family Travel Payment',
    amount: 9000,
    dueDay: Number(startDate.slice(-2)),
    startDate,
  });

  const expected = withAddedObligation(getExpectedPersona('PRESSURE'), {
    id: 'family-travel-payment',
    title: 'Family Travel Payment',
    amount: 9000,
    dueDay: Number(startDate.slice(-2)),
    startDate,
  });

  await gotoPlanningSection(page, 'obligations');
  await expect(page.getByText('Family Travel Payment')).toBeVisible();

  await gotoRoute(page, '/dashboard');
  await assertAlert(page, { severity: 'critical', keyword: 'Family Travel Payment' });

  await askWael(page, 'What is my next funding risk?');
  await expectWaelResponseContains(page, ['Family Travel Payment', expected.snapshot.obligations.nextDue?.amount ?? 0]);

  await gotoPlanningSection(page, 'forecast');
  const dueMonth = expected.snapshot.forecast.monthlyRows.find((row) => row.month === startDate.slice(0, 7));
  if (!dueMonth) {
    throw new Error('Expected due month row was not found.');
  }
  await assertForecastRow(page, dueMonth);

  await runDecisionCheck(page, { name: 'New iPhone', amount: 4500 });
  await expect(page.getByTestId('decision-reason')).toContainText(/obligation|cash|liquidity/i);
});
