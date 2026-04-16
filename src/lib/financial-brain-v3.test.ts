import { describe, expect, test } from 'bun:test';
import {
  analyzeEmergencyShock,
  buildAwaeedMaturityPlan,
  buildHealthySavingsSnapshot,
  buildIncomeChangeHeadline,
  buildKhaledFireInsight,
  buildOmarDashboardRiskInsight,
  buildOmarTrackAssessment,
  buildRecoveryPlan,
  buildSaraCriticalAlerts,
  compareAwaeedVsHassad,
  emergencyFundMonths,
  evaluateAwaeedTiming,
  evaluateBuyDecision,
  expenseToIncomeRatio,
  modelSalaryIncrease,
  modelHouseholdSpendIncrease,
  modelPortfolioSaleForObligations,
  needsRatio,
  projectTemporaryIncomeDrop,
  type FinancialPersona,
} from '@/lib/financial-brain-v3';

const khaled: FinancialPersona = {
  userId: 'test-user-khaled',
  profile: {
    name: 'Khaled',
    currency: 'SAR',
    testDate: '2026-04-07',
  },
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
      { name: 'Car Insurance', amount: 416, type: 'FIXED' },
      { name: 'Home Internet', amount: 290, type: 'FIXED' },
      { name: 'Phone Bill', amount: 120, type: 'FIXED' },
      { name: 'Monthly Household', amount: 9000, type: 'VARIABLE' },
      { name: 'Fuel', amount: 600, type: 'VARIABLE' },
      { name: 'Electricity & Water', amount: 300, type: 'VARIABLE' },
      { name: 'Clothing & Personal Care', amount: 500, type: 'VARIABLE' },
      { name: 'Subscriptions', amount: 200, type: 'VARIABLE' },
      { name: 'Monthly Savings (SAIB)', amount: 8000, type: 'SAVING' },
    ],
  },
  cashFlow: {
    netMonthlySurplus: 15074,
    surplusRate: 38.7,
  },
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
        purpose: 'Children education payment Sep 2026',
      },
    ],
  },
  obligations: [
    {
      label: 'Children Education',
      amount: 50000,
      dueDate: '2026-09-15',
      status: 'FUNDED',
      fundedBy: 'Education Fund Awaeed (matures Sep 2026)',
    },
  ],
  upcomingOneTimeExpenses: [
    { label: 'Annual Car Servicing', amount: 3000, dueMonth: 6, dueYear: 2026 },
  ],
  portfolio: {
    stocks: [
      { ticker: '2222', name: 'Saudi Aramco', value: 45000, sector: 'Energy', gainLoss: 3200 },
      { ticker: '1120', name: 'Al Rajhi Bank', value: 22000, sector: 'Finance', gainLoss: 1800 },
    ],
    funds: [
      { name: 'Alinma Saudi Equity Fund', value: 18000, type: 'equity', gainLoss: 900 },
    ],
    totalPortfolioValue: 85000,
  },
  fire: {
    fireNumber: 718200,
    currentInvestableAssets: 153000,
    progressPct: 21.3,
    estimatedYearsToFire: 14,
  },
};

const sara: FinancialPersona = {
  userId: 'test-user-sara',
  profile: {
    name: 'Sara',
    currency: 'SAR',
    testDate: '2026-04-07',
  },
  income: {
    monthlyTotal: 18000,
    sources: [
      { label: 'Monthly Salary', amount: 18000, frequency: 'MONTHLY' },
    ],
  },
  expenses: {
    monthlyTotal: 18620,
    categories: [
      { name: 'Rent', amount: 5000, type: 'FIXED' },
      { name: 'Car Loan Payment', amount: 2200, type: 'FIXED' },
      { name: 'Home Internet', amount: 290, type: 'FIXED' },
      { name: 'Phone Bill', amount: 180, type: 'FIXED' },
      { name: 'Monthly Household', amount: 7500, type: 'VARIABLE' },
      { name: 'Fuel', amount: 700, type: 'VARIABLE' },
      { name: 'Electricity & Water', amount: 400, type: 'VARIABLE' },
      { name: 'Clothing & Personal Care', amount: 800, type: 'VARIABLE' },
      { name: 'Dining Out', amount: 1200, type: 'VARIABLE' },
      { name: 'Subscriptions', amount: 350, type: 'VARIABLE' },
    ],
  },
  cashFlow: {
    netMonthlySurplus: -620,
    surplusRate: -3.4,
  },
  cash: {
    liquidBalance: 12000,
    lockedSavings: [],
  },
  obligations: [
    {
      label: 'Car Final Balloon Payment',
      amount: 45000,
      dueDate: '2026-11-30',
      status: 'AT_RISK',
      fundedBy: null,
      coverageGap: 37640,
    },
  ],
  upcomingOneTimeExpenses: [
    { label: 'Iqama Renewal', amount: 10000, dueMonth: 8, dueYear: 2026 },
  ],
  portfolio: {
    stocks: [
      { ticker: '4321', name: 'Sabic', value: 38000, sector: 'Petrochemicals', gainLoss: -4200 },
    ],
    funds: [],
    totalPortfolioValue: 38000,
  },
  fire: {
    fireNumber: 2234400,
    currentInvestableAssets: 50000,
    progressPct: 2.2,
    estimatedYearsToFire: 47,
  },
};

const omar: FinancialPersona = {
  userId: 'test-user-omar',
  profile: {
    name: 'Omar',
    currency: 'SAR',
    testDate: '2026-04-07',
  },
  income: {
    monthlyTotal: 22000,
    sources: [
      { label: 'Monthly Salary', amount: 22000, frequency: 'MONTHLY' },
    ],
  },
  expenses: {
    monthlyTotal: 19122,
    categories: [
      { name: 'Rent (bi-annual)', amount: 2916, type: 'FIXED' },
      { name: 'Car Insurance', amount: 416, type: 'FIXED' },
      { name: 'Home Internet', amount: 290, type: 'FIXED' },
      { name: 'Monthly Household', amount: 12000, type: 'VARIABLE' },
      { name: 'Fuel', amount: 800, type: 'VARIABLE' },
      { name: 'Children Activities', amount: 1500, type: 'VARIABLE' },
      { name: 'Electricity & Water', amount: 500, type: 'VARIABLE' },
      { name: 'Subscriptions', amount: 400, type: 'VARIABLE' },
      { name: 'Personal Care', amount: 300, type: 'VARIABLE' },
    ],
  },
  cashFlow: {
    netMonthlySurplus: 2878,
    surplusRate: 13.1,
  },
  cash: {
    liquidBalance: 8500,
    lockedSavings: [],
  },
  obligations: [
    {
      label: 'Rent Payment (Bi-Annual)',
      amount: 17500,
      dueDate: '2026-07-15',
      status: 'AT_RISK',
      coverageGap: 8122,
    },
    {
      label: 'School Fees',
      amount: 22000,
      dueDate: '2026-08-20',
      status: 'AT_RISK',
      coverageGap: 18000,
    },
    {
      label: 'Iqama Renewal',
      amount: 19000,
      dueDate: '2026-10-31',
      status: 'UNFUNDED',
      coverageGap: 19000,
    },
  ],
  upcomingOneTimeExpenses: [
    { label: 'Car Registration', amount: 2500, dueMonth: 5, dueYear: 2026 },
  ],
  portfolio: {
    stocks: [
      { ticker: '2222', name: 'Saudi Aramco', value: 62000, sector: 'Energy', gainLoss: 5000 },
      { ticker: '1180', name: 'Al Bilad Bank', value: 28000, sector: 'Finance', gainLoss: -1200 },
      { ticker: '2010', name: 'SABIC', value: 31000, sector: 'Petrochemicals', gainLoss: 800 },
    ],
    funds: [
      { name: 'Riyad REIT Fund', value: 15000, type: 'REIT', gainLoss: -500 },
    ],
    totalPortfolioValue: 136000,
  },
  fire: {
    fireNumber: 2294640,
    currentInvestableAssets: 144500,
    progressPct: 6.3,
    estimatedYearsToFire: 28,
  },
};

describe('financial brain v3', () => {
  test('IN-01 healthy savings rate snapshot matches Khaled baseline', () => {
    const snapshot = buildHealthySavingsSnapshot(khaled);

    expect(snapshot.monthlyIncome).toBe(39000);
    expect(snapshot.monthlySurplus).toBe(15074);
    expect(snapshot.savingsRate).toBe(38.7);
    expect(snapshot.isExcellent).toBe(true);
  });

  test('IN-02 salary increase model recalculates Sara surplus and obligation gap', () => {
    const scenario = modelSalaryIncrease(sara, 3000, 'Car Final Balloon Payment');

    expect(scenario.newIncome).toBe(21000);
    expect(scenario.newSurplus).toBe(2380);
    expect(scenario.newSavingsRate).toBe(11.3);
    expect(scenario.monthsRemaining).toBe(7);
    expect(scenario.additionalAccumulation).toBe(16660);
    expect(scenario.remainingGap).toBe(16340);

    const headline = buildIncomeChangeHeadline(sara, 3000, 'Car Final Balloon Payment').join(' ');
    expect(headline).toContain('21,000 SAR');
    expect(headline).toContain('16,340 SAR');
  });

  test('BU-01 pressure budget ratios are flagged correctly for Sara', () => {
    expect(expenseToIncomeRatio(sara)).toBe(103.4);
    expect(needsRatio(sara)).toBe(90.4);
    expect(emergencyFundMonths(sara)).toBe(0.64);
  });

  test('AL-01 Sara critical alert set includes all expected categories and amounts', () => {
    const alerts = buildSaraCriticalAlerts(sara);

    expect(alerts).toHaveLength(4);
    expect(alerts[0]?.detail).toContain('45,000 SAR due Nov 30, 2026 (237 days)');
    expect(alerts[0]?.detail).toContain('37,640 SAR');
    expect(alerts[1]?.detail).toContain('18,620 SAR');
    expect(alerts[1]?.detail).toContain('18,000 SAR');
    expect(alerts[1]?.detail).toContain('-3.4%');
    expect(alerts[2]?.detail).toContain('0.64 months');
    expect(alerts[2]?.detail).toContain('55,860 SAR');
    expect(alerts[2]?.detail).toContain('43,860 SAR');
    expect(alerts[3]?.detail).toContain('10,000 SAR');
    expect(alerts[3]?.detail).toContain('118 days');
  });

  test('OB-01 Omar obligation timeline captures accumulation and double-hit risk', () => {
    const assessment = buildOmarTrackAssessment(omar);

    expect(assessment.totalGap).toBe(45122);
    expect(assessment.monthlySurplus).toBe(2878);
    expect(assessment.timeline).toHaveLength(3);

    expect(assessment.timeline[0]).toMatchObject({
      label: 'Rent Payment (Bi-Annual)',
      daysUntilDue: 99,
      monthsOfAccumulation: 3,
      accumulationOnly: 8634,
      remainingGapAfterAccumulation: 8866,
      statedCoverageGap: 8122,
    });
    expect(assessment.timeline[1]).toMatchObject({
      label: 'School Fees',
      daysUntilDue: 135,
      monthsOfAccumulation: 5,
      accumulationOnly: 14390,
      remainingGapAfterAccumulation: 7610,
      statedCoverageGap: 18000,
    });
    expect(assessment.timeline[2]).toMatchObject({
      label: 'Iqama Renewal',
      daysUntilDue: 207,
      monthsOfAccumulation: 7,
      accumulationOnly: 20146,
      remainingGapAfterAccumulation: 0,
      statedCoverageGap: 19000,
    });
  });

  test('OB-02 Omar buy decision is blocked on liquidity and obligation gaps', () => {
    const result = evaluateBuyDecision(omar, 15000);

    expect(result.verdict).toBe('BLOCK');
    expect(result.totalObligationGap).toBe(45122);
    expect(result.liquidBalance).toBe(8500);
    expect(result.liquidityImpactPct).toBe(176.5);
    expect(result.obligationsAtRiskCount).toBe(3);
    expect(result.portfolioToLiquidRatio).toBe(16);
    expect(result.minimumTargetBuffer).toBe(57366);
    expect(result.reason).toContain('45,122 SAR');
    expect(result.alternative).toContain('57,366 SAR');
  });

  test('FC-01 Omar dashboard risk insight leads with July negative month', () => {
    const insight = buildOmarDashboardRiskInsight(omar);

    expect(insight.headlineMonth).toBe('July 2026');
    expect(insight.combinedOutflow).toBe(20000);
    expect(insight.headlineBalance).toBe(-2866);
    expect(insight.cascadingShortfall).toBe(45122);
    expect(insight.sentences[0]).toContain('-2,866 SAR');
    expect(insight.sentences[1]).toContain('22,000 SAR');
    expect(insight.sentences[2]).toContain('20,000 SAR');
    expect(insight.sentences[3]).toContain('45,122 SAR');
  });

  test('SA-02 and IS-01 savings product math matches prompt examples', () => {
    const comparison = compareAwaeedVsHassad(50000, 6);

    expect(comparison.awaeed).toBe(1125);
    expect(comparison.hassad).toBe(625);
    expect(comparison.advantage).toBe(500);
  });

  test('OB-03 Khaled maturity plan preserves profit and obligation transfer logic', () => {
    const plan = buildAwaeedMaturityPlan(khaled);

    expect(plan?.maturityValue).toBe(51125);
    expect(plan?.profit).toBe(1125);
    expect(plan?.obligationTransferAmount).toBe(50000);
    expect(plan?.postMaturityBonusLiquidity).toBe(1125);
    expect(plan?.summary).toContain('do not cancel early');
  });

  test('EX-01 Khaled medical emergency is absorbed without critical status', () => {
    const shock = analyzeEmergencyShock(khaled, 'Unexpected medical expense', 8000);

    expect(shock.newLiquidBalance).toBe(87000);
    expect(shock.shockVsMonthlySurplusPct).toBe(53.1);
    expect(shock.monthsOfCoverageAfterShock).toBe(3.64);
    expect(shock.verdict).toBe('ABSORBED');
  });

  test('EX-02 Sara car repair shock becomes critical and widens obligation gap', () => {
    const shock = analyzeEmergencyShock(sara, 'Emergency car repair', 4500);

    expect(shock.newLiquidBalance).toBe(7500);
    expect(shock.monthsOfCoverageAfterShock).toBe(0.4);
    expect(shock.widenedObligationGap).toBe(42140);
    expect(shock.verdict).toBe('CRITICAL');
  });

  test('SA-01 Omar awaeed timing correctly blocks rent funding via standard account', () => {
    const timing = evaluateAwaeedTiming(omar, 'Rent Payment (Bi-Annual)');

    expect(timing?.daysUntilDue).toBe(99);
    expect(timing?.latestSafeMaturityDate).toBe('2026-05-15');
    expect(timing?.daysUntilLatestSafeMaturity).toBe(38);
    expect(timing?.standardThreeMonthMaturityDate).toBe('2026-07-07');
    expect(timing?.verdict).toBe('TOO_LATE');
    expect(timing?.iqamaPossible).toBe(true);
    expect(timing?.iqamaRequiresDeposit).toBe(19000);
  });

  test('AL-02 Khaled fire milestone helper preserves exact FIRE figures', () => {
    const lines = buildKhaledFireInsight(khaled, 2000);

    expect(lines[0]).toContain('21.3%');
    expect(lines[0]).toContain('153,000 SAR');
    expect(lines[0]).toContain('718,200 SAR');
    expect(lines[1]).toContain('14 years');
    expect(lines[2]).toContain('11 years');
    expect(lines[3]).toContain('26,550 SAR');
  });

  test('EC-02 temporary income drop stays manageable for Khaled', () => {
    const drop = projectTemporaryIncomeDrop(khaled, 17500, 3);

    expect(drop.monthlyShortfall).toBe(-6426);
    expect(drop.totalShortfall).toBe(-19278);
    expect(drop.endingLiquid).toBe(75722);
    expect(drop.bufferMonthsAfter).toBe(3.16);
    expect(drop.savingsPauseBenefit).toBe(24000);
  });

  test('BU-02 household spending scenario keeps Khaled above 30 percent savings rate', () => {
    const scenario = modelHouseholdSpendIncrease(khaled, 12000);

    expect(scenario.delta).toBe(3000);
    expect(scenario.newSurplus).toBe(12074);
    expect(scenario.newSavingsRate).toBe(31);
    expect(scenario.annualInvestmentCapacityLost).toBe(36000);
    expect(scenario.verdict).toBe('APPROVE_WITH_CONDITION');
  });

  test('FC-02 portfolio sale scenario partially funds Omar obligations', () => {
    const scenario = modelPortfolioSaleForObligations(omar, 30000);

    expect(scenario.newLiquidBalance).toBe(38500);
    expect(scenario.remainingPortfolioValue).toBe(106000);
    expect(scenario.rentFunded).toBe(true);
    expect(scenario.schoolFunded).toBe(true);
    expect(scenario.iqamaStillAtRisk).toBe(true);
    expect(scenario.iqamaGapEstimate).toBe(1000);
  });

  test('EC-04 recovery plan gives Omar a full obligation fix sequence', () => {
    const plan = buildRecoveryPlan(omar);

    expect(plan.steps).toHaveLength(6);
    expect(plan.steps[0]).toContain('30,000 SAR');
    expect(plan.steps[4]).toContain('13.1%');
    expect(plan.endingLiquidityEstimate).toBe(16268);
    expect(plan.remainingIqamaGap).toBe(2732);
  });
});
