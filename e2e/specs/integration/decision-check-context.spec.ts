import { expect, test } from '@playwright/test';
import { getDecisionContext, getExpectedPersona, withRemovedObligation } from '../../fixtures/expected-calculations';
import { captureDecisionCheckResponse, expectDecisionVerdict } from '../../helpers/ai-assertions';
import { runDecisionCheck } from '../../helpers/mutation-helpers';
import { gotoPlanningSection } from '../../helpers/navigation';
import { seedPersona } from '../../seed/seed-persona';

test('Decision Check uses the full unified stress context and relaxes after risk removal', async ({ page }) => {
  await seedPersona(page, 'STRESS');
  const expected = getExpectedPersona('STRESS');
  const response = await captureDecisionCheckResponse(page, () => runDecisionCheck(page, { name: 'Luxury Watch', amount: 18000 }));
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.decisionContext.obligations.pending.length).toBeGreaterThan(0);
  expect(getDecisionContext(expected).obligations.pending.length).toBeGreaterThan(0);
  await expectDecisionVerdict(page, 'BLOCK');
  await expect(page.getByTestId('decision-reason')).toContainText(/liquidity|obligation|cash/i);

  await gotoPlanningSection(page, 'obligations');
  await page.getByTestId('obligation-card-stress-obligation-1').getByRole('button').click();

  const relaxedState = withRemovedObligation(expected, 'stress-obligation-1');
  const relaxed = await captureDecisionCheckResponse(page, () => runDecisionCheck(page, { name: 'Luxury Watch', amount: 18000 }));
  expect(relaxed.ok()).toBeTruthy();
  await expect(page.getByTestId('decision-reason')).toContainText(new RegExp(relaxedState.snapshot.forecast.monthlyRows[0].label.split(' ')[0], 'i'));
});
