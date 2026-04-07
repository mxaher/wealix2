import { expect, test } from '@playwright/test';
import { captureDecisionCheckResponse } from '../../helpers/ai-assertions';
import { addSavingsAccount, askWael, runDecisionCheck } from '../../helpers/mutation-helpers';
import { gotoPlanningSection, gotoRoute } from '../../helpers/navigation';
import { seedPersona } from '../../seed/seed-persona';

test('stress journey shows the obligation cascade, then recalculates after adding a bridge action', async ({ page }) => {
  await seedPersona(page, 'STRESS');
  await gotoPlanningSection(page, 'forecast');
  await expect(page.getByTestId('planning-forecast-table')).toBeVisible();

  await askWael(page, 'Where does my forecast first break?');
  await expect(page.getByTestId('advisor-message-assistant').last()).toContainText(/forecast|risk|month/i);

  const blocked = await captureDecisionCheckResponse(page, () => runDecisionCheck(page, { name: 'Designer Sofa', amount: 9000 }));
  expect(blocked.ok()).toBeTruthy();
  await expect(page.getByTestId('decision-verdict')).toContainText(/Do Not Proceed|Postpone/i);

  await addSavingsAccount(page, {
    name: 'Bridge Reserve',
    principal: 10000,
    currentBalance: 10000,
    annualProfitRate: 4.2,
    termMonths: 2,
    openedAt: new Date().toISOString().slice(0, 10),
    maturityDate: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    purposeLabel: 'Bridge',
  });

  await gotoRoute(page, '/dashboard');
  await expect(page.getByTestId('dashboard-net-worth')).toBeVisible();
  await gotoPlanningSection(page, 'forecast');
  await expect(page.getByTestId('planning-forecast-table')).toBeVisible();
});
