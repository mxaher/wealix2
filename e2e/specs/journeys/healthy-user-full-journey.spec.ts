import { expect, test } from '@playwright/test';
import { captureDecisionCheckResponse, expectWaelResponseContains } from '../../helpers/ai-assertions';
import { addExpense, addOneTimeExpense, askWael, runDecisionCheck, updateSalary } from '../../helpers/mutation-helpers';
import { gotoPlanningSection, gotoRoute } from '../../helpers/navigation';
import { seedPersona } from '../../seed/seed-persona';

test('healthy user journey stays consistent across dashboard, planning, portfolio AI, decision check, Wael, FIRE, and net worth', async ({ page }) => {
  await seedPersona(page, 'HEALTHY');

  await gotoRoute(page, '/dashboard');
  await updateSalary(page, 1800);
  await addExpense(page, { amount: 600, description: 'Streaming Bundle', category: 'Entertainment' });
  await addOneTimeExpense(page, {
    title: 'Family Trip Deposit',
    amount: 3200,
    dueDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    fundingSource: 'Awaeed Growth',
  });

  await gotoRoute(page, '/portfolio');
  await page.getByRole('button', { name: /Generate New Analysis/i }).click();
  await expect(page.getByTestId('portfolio-analysis-output')).toBeVisible();

  const decision = await captureDecisionCheckResponse(page, () => runDecisionCheck(page, { name: 'New ETF Position', amount: 5000 }));
  expect(decision.ok()).toBeTruthy();

  await askWael(page, 'Am I on track?');
  await expectWaelResponseContains(page, ['Family Trip Deposit']);

  await gotoRoute(page, '/fire');
  await expect(page.getByTestId('fire-number')).toBeVisible();

  await gotoRoute(page, '/net-worth');
  await expect(page.getByTestId('networth-net')).toBeVisible();
});
