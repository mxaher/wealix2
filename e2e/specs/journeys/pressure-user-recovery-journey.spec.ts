import { expect, test } from '@playwright/test';
import { captureDecisionCheckResponse, expectWaelResponseContains } from '../../helpers/ai-assertions';
import { addExpense, askWael, runDecisionCheck, updateSalary } from '../../helpers/mutation-helpers';
import { gotoRoute } from '../../helpers/navigation';
import { seedPersona } from '../../seed/seed-persona';

test('pressure user recovery journey becomes gradually less risky after guided actions', async ({ page }) => {
  await seedPersona(page, 'PRESSURE');
  await gotoRoute(page, '/dashboard');
  await askWael(page, 'How do I recover from this deficit?');
  await expectWaelResponseContains(page, ['School Fees']);

  await addExpense(page, { amount: 0.01, description: 'Recovery marker', category: 'Other' });
  await updateSalary(page, 2200);

  await gotoRoute(page, '/dashboard');
  await expect(page.getByTestId('dashboard-monthly-surplus')).toBeVisible();

  const decision = await captureDecisionCheckResponse(page, () => runDecisionCheck(page, { name: 'Gaming Laptop', amount: 7000 }));
  expect(decision.ok()).toBeTruthy();
  await expect(page.getByTestId('decision-reason')).toContainText(/cash|liquidity|obligation/i);
});
