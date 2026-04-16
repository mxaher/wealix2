import { describe, expect, test } from 'bun:test';
import { buildDashboardInsightLines, buildDeterministicAdvisorResponse, buildPortfolioAnalysisOverride } from '@/lib/financial-brain-surface';
import type { WealixAIContext } from '@/lib/wealix-ai-context';
import type { FinancialPersona } from '@/lib/financial-brain-v3';

const khaled: FinancialPersona = {
  userId: 'test-user-khaled',
  profile: { name: 'Khaled', currency: 'SAR', testDate: '2026-04-07' },
  income: {
    monthlyTotal: 39000,
    sources: [
      { label: 'Monthly Salary', amount: 35000, frequency: 'MONTHLY' },
      { label: 'Rental Income', amount: 4000, frequency: 'MONTHLY' },
    ],
  },
  expenses: {
    monthlyTotal: 23926,
    categories: [
      { name: 'Rent', amount: 4500, type: 'FIXED' },
      { name: 'Monthly Household', amount: 9000, type: 'VARIABLE' },
    ],
  },
  cashFlow: { netMonthlySurplus: 15074, surplusRate: 38.7 },
  cash: {
    liquidBalance: 95000,
    lockedSavings: [
      {
        label: 'Education Fund',
        principal: 50000,
        profitRate: 0.045,
        startDate: '2026-03-01',
        maturityDate: '2026-09-01',
        status: 'ACTIVE',
        totalAtMaturity: 51125,
      },
    ],
  },
  obligations: [
    { label: 'Children Education', amount: 50000, dueDate: '2026-09-15', status: 'FUNDED', fundedBy: 'Awaeed' },
  ],
  upcomingOneTimeExpenses: [],
  portfolio: { stocks: [], funds: [], totalPortfolioValue: 85000 },
  fire: { fireNumber: 718200, currentInvestableAssets: 153000, progressPct: 21.3, estimatedYearsToFire: 14 },
};

const sara: FinancialPersona = {
  userId: 'test-user-sara',
  profile: { name: 'Sara', currency: 'SAR', testDate: '2026-04-07' },
  income: {
    monthlyTotal: 18000,
    sources: [{ label: 'Salary', amount: 18000, frequency: 'MONTHLY' }],
  },
  expenses: {
    monthlyTotal: 18620,
    categories: [
      { name: 'Monthly Household', amount: 7500, type: 'VARIABLE' },
      { name: 'Dining Out', amount: 1200, type: 'VARIABLE' },
    ],
  },
  cashFlow: { netMonthlySurplus: -620, surplusRate: -3.4 },
  cash: { liquidBalance: 12000, lockedSavings: [] },
  obligations: [
    { label: 'Car Final Balloon Payment', amount: 45000, dueDate: '2026-11-30', status: 'AT_RISK', coverageGap: 37640 },
  ],
  upcomingOneTimeExpenses: [{ label: 'Iqama Renewal', amount: 10000, dueMonth: 8, dueYear: 2026 }],
  portfolio: { stocks: [], funds: [], totalPortfolioValue: 38000 },
  fire: { fireNumber: 2234400, currentInvestableAssets: 50000, progressPct: 2.2, estimatedYearsToFire: 47 },
};

const omar: FinancialPersona = {
  userId: 'test-user-omar',
  profile: { name: 'Omar', currency: 'SAR', testDate: '2026-04-07' },
  income: {
    monthlyTotal: 22000,
    sources: [{ label: 'Salary', amount: 22000, frequency: 'MONTHLY' }],
  },
  expenses: {
    monthlyTotal: 19122,
    categories: [
      { name: 'Monthly Household', amount: 12000, type: 'VARIABLE' },
      { name: 'Fuel', amount: 800, type: 'VARIABLE' },
    ],
  },
  cashFlow: { netMonthlySurplus: 2878, surplusRate: 13.1 },
  cash: { liquidBalance: 8500, lockedSavings: [] },
  obligations: [
    { label: 'Rent Payment (Bi-Annual)', amount: 17500, dueDate: '2026-07-15', status: 'AT_RISK', coverageGap: 8122 },
    { label: 'School Fees', amount: 22000, dueDate: '2026-08-20', status: 'AT_RISK', coverageGap: 18000 },
    { label: 'Iqama Renewal', amount: 19000, dueDate: '2026-10-31', status: 'UNFUNDED', coverageGap: 19000 },
  ],
  upcomingOneTimeExpenses: [{ label: 'Car Registration', amount: 2500, dueMonth: 5, dueYear: 2026 }],
  portfolio: {
    stocks: [
      { ticker: '2222', name: 'Saudi Aramco', value: 62000, sector: 'Energy', gainLoss: 5000 },
      { ticker: '1180', name: 'Al Bilad Bank', value: 28000, sector: 'Finance', gainLoss: -1200 },
      { ticker: '2010', name: 'SABIC', value: 31000, sector: 'Petrochemicals', gainLoss: 800 },
    ],
    funds: [{ name: 'Riyad REIT Fund', value: 15000, type: 'REIT', gainLoss: -500 }],
    totalPortfolioValue: 136000,
  },
  fire: { fireNumber: 2294640, currentInvestableAssets: 144500, progressPct: 6.3, estimatedYearsToFire: 28 },
};

const saraContext = {
  obligations: [
    {
      id: '1',
      title: 'Car Final Balloon Payment',
      amount: 45000,
      dueDate: '2026-11-30',
      daysUntilDue: 237,
      urgency: 'LOW',
      status: 'upcoming',
      availableFunding: 7360,
      fundingGap: 37640,
      coverageRatio: 0.16,
    },
  ],
  firstAtRiskMonth: {
    month: '2026-11',
    label: 'Nov 2026',
    openingBalance: 0,
    income: 18000,
    recurringExpenses: 18620,
    obligationPayments: 45000,
    closingBalance: -29960,
    status: 'CRITICAL',
  },
} as Pick<WealixAIContext, 'obligations' | 'firstAtRiskMonth'> as WealixAIContext;

describe('financial brain surface helpers', () => {
  test('returns deterministic savings-rate advisor response', () => {
    const response = buildDeterministicAdvisorResponse({
      message: 'What is my savings rate and is it good?',
      persona: khaled,
    });

    expect(response).toContain('38.7%');
    expect(response).toContain('15,074 SAR');
    expect(response).toContain('39,000 SAR');
    expect(response).toContain('excellent');
  });

  test('builds deficit-first dashboard insight lines', () => {
    const lines = buildDashboardInsightLines(sara, saraContext);

    expect(lines[0]).toContain('620 SAR');
    expect(lines[1]).toContain('37,640 SAR');
    expect(lines[1]).toContain('237 days');
    expect(lines[2]).toContain('Monthly Household');
    expect(lines[3]).toContain('Nov 2026');
  });

  test('returns deterministic awaeed timing guidance for Omar rent obligation', () => {
    const response = buildDeterministicAdvisorResponse({
      message: 'Should I open an Awaeed account for my rent obligation due July 15?',
      persona: omar,
    });

    expect(response).toContain('too late');
    expect(response).toContain('2026-07-07');
    expect(response).toContain('2-month safety buffer');
    expect(response).toContain('19,000 SAR');
  });

  test('returns deterministic emergency shock guidance for Sara', () => {
    const response = buildDeterministicAdvisorResponse({
      message: 'I just had an emergency car repair of 4,500 SAR.',
      persona: sara,
    });

    expect(response).toContain('7,500 SAR');
    expect(response).toContain('0.40 months');
    expect(response).toContain('42,140 SAR');
  });

  test('returns deterministic maturity guidance for Khaled', () => {
    const response = buildDeterministicAdvisorResponse({
      message: 'My education obligation is fully funded via Awaeed. What do I do when it matures in September?',
      persona: khaled,
    });

    expect(response).toContain('51,125 SAR');
    expect(response).toContain('50,000 SAR');
    expect(response).toContain('1,125 SAR');
    expect(response).toContain('do not cancel early');
  });

  test('builds portfolio analysis override for obligation-stressed persona', () => {
    const override = buildPortfolioAnalysisOverride(omar);

    expect(override?.summary).toContain('8,500 SAR');
    expect(override?.summary).toContain('45,122 SAR');
    expect(override?.marketOutlook).toContain('16.0x');
    expect(override?.actions[0]?.description).toContain('smart liquidity rebalance');
    expect(override?.tradePlan[0]?.ticker).toBe('2222');
  });

  test('returns deterministic household-spend scenario for Khaled', () => {
    const response = buildDeterministicAdvisorResponse({
      message: 'What if I increase my household spending to 12,000 SAR/month?',
      persona: khaled,
    });

    expect(response).toContain('3,000 SAR');
    expect(response).toContain('12,074 SAR');
    expect(response).toContain('31.0%');
    expect(response).toContain('36,000 SAR');
  });

  test('returns deterministic recovery plan for Omar', () => {
    const response = buildDeterministicAdvisorResponse({
      message: 'Show me a plan to fix everything.',
      persona: omar,
    });

    expect(response).toContain('45,122 SAR');
    expect(response).toContain('30,000 SAR');
    expect(response).toContain('16,268 SAR');
    expect(response).toContain('2,732 SAR');
  });
});
