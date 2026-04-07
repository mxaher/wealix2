import { test } from '@playwright/test';
import { getExpectedPersona, withAddedExpense } from '../../fixtures/expected-calculations';
import { assertForecastRow } from '../../helpers/financial-assertions';
import { addExpense } from '../../helpers/mutation-helpers';
import { gotoPlanningSection } from '../../helpers/navigation';
import { seedPersona } from '../../seed/seed-persona';

test('forecast timing keeps one-time expenses, obligations, and maturities in the correct months', async ({ page }) => {
  await seedPersona(page, 'STRESS');
  const expected = getExpectedPersona('STRESS');

  await gotoPlanningSection(page, 'forecast');
  for (const row of expected.snapshot.forecast.monthlyRows.slice(0, 4)) {
    await assertForecastRow(page, row);
  }

  await addExpense(page, { amount: 500, description: 'Short-Term Transport Spike', category: 'Transport' });
  const updated = withAddedExpense(expected, { amount: 500, description: 'Short-Term Transport Spike', category: 'Transport' });
  await gotoPlanningSection(page, 'forecast');
  await assertForecastRow(page, updated.snapshot.forecast.monthlyRows[0]);
  await assertForecastRow(page, updated.snapshot.forecast.monthlyRows[1]);
});
