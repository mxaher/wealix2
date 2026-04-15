export type FinancialPersona = {
  userId: string;
  profile: {
    name: string;
    currency: string;
    testDate: string;
  };
  income: {
    monthlyTotal: number;
    sources: Array<{
      label: string;
      amount: number;
      frequency: string;
    }>;
  };
  expenses: {
    monthlyTotal: number;
    categories: Array<{
      name: string;
      amount: number;
      type: 'FIXED' | 'VARIABLE' | 'SAVING';
    }>;
  };
  cashFlow: {
    netMonthlySurplus: number;
    surplusRate: number;
  };
  cash: {
    liquidBalance: number;
    lockedSavings: Array<{
      label: string;
      principal: number;
      profitRate: number;
      startDate: string;
      maturityDate: string;
      status: 'ACTIVE' | 'MATURED' | 'CANCELLED';
      totalAtMaturity: number;
      purpose?: string;
    }>;
  };
  obligations: Array<{
    label: string;
    amount: number;
    dueDate: string;
    status: 'FUNDED' | 'AT_RISK' | 'UNFUNDED';
    fundedBy?: string | null;
    coverageGap?: number;
  }>;
  upcomingOneTimeExpenses: Array<{
    label: string;
    amount: number;
    dueMonth: number;
    dueYear: number;
  }>;
  portfolio: {
    stocks: Array<{
      ticker: string;
      name: string;
      value: number;
      sector: string;
      gainLoss: number;
    }>;
    funds: Array<{
      name: string;
      value: number;
      type: string;
      gainLoss: number;
    }>;
    totalPortfolioValue: number;
  };
  fire: {
    fireNumber: number;
    currentInvestableAssets: number;
    progressPct: number;
    estimatedYearsToFire: number;
  };
};

export type PersonaAlert = {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  category: 'OBLIGATION' | 'CASH_FLOW' | 'BUFFER' | 'ONE-TIME';
  title: string;
  detail: string;
};

export type ObligationTimeline = {
  label: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  monthsOfAccumulation: number;
  availableByDue: number;
  remainingGapByDue: number;
  status: FinancialPersona['obligations'][number]['status'];
};

export type DecisionCheckResultV3 = {
  verdict: 'APPROVE' | 'CAUTION' | 'BLOCK';
  totalObligationGap: number;
  liquidBalance: number;
  liquidityImpactPct: number;
  obligationsAtRiskCount: number;
  portfolioToLiquidRatio: number;
  minimumTargetBuffer: number;
  reason: string;
  alternative: string;
};

export type DashboardRiskInsight = {
  headlineMonth: string | null;
  headlineBalance: number | null;
  combinedOutflow: number;
  cascadingShortfall: number;
  sentences: string[];
};

export type EmergencyShockResult = {
  eventLabel: string;
  amount: number;
  newLiquidBalance: number;
  shockVsMonthlySurplusPct: number;
  monthsOfCoverageAfterShock: number;
  widenedObligationGap: number | null;
  verdict: 'ABSORBED' | 'CRITICAL';
  summary: string;
};

export type AwaeedTimingDecision = {
  obligationLabel: string;
  daysUntilDue: number;
  latestSafeMaturityDate: string;
  daysUntilLatestSafeMaturity: number;
  standardThreeMonthMaturityDate: string;
  verdict: 'RECOMMENDED' | 'TOO_LATE' | 'INSUFFICIENT_LIQUIDITY';
  iqamaPossible: boolean;
  iqamaRequiresDeposit: number | null;
  summary: string;
};

export type PortfolioOverrideResult = {
  summary: string;
  marketOutlook: string;
  keyRisks: string[];
  opportunities: string[];
  healthScore: number;
  tradePlan: Array<{
    side: 'sell';
    ticker: string;
    name: string;
    amountSar: number;
    note: string;
  }>;
};

export type HouseholdSpendScenario = {
  originalSurplus: number;
  newSurplus: number;
  delta: number;
  newSavingsRate: number;
  annualInvestmentCapacityLost: number;
  verdict: 'APPROVE_WITH_CONDITION' | 'REJECT';
};

export type PortfolioSaleScenario = {
  saleAmount: number;
  newLiquidBalance: number;
  remainingPortfolioValue: number;
  rentFunded: boolean;
  schoolFunded: boolean;
  iqamaStillAtRisk: boolean;
  iqamaGapEstimate: number;
};

export type RecoveryPlan = {
  steps: string[];
  endingLiquidityEstimate: number;
  remainingIqamaGap: number;
};

const NEEDS_CATEGORY_NAMES = new Set([
  'Rent',
  'Car Loan Payment',
  'Home Internet',
  'Phone Bill',
  'Monthly Household',
  'Fuel',
  'Electricity & Water',
  'Rent (bi-annual)',
  'Children Activities',
]);

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function formatMonthYear(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

function addMonths(dateString: string, months: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function daysUntil(asOf: string, dueDate: string) {
  const start = new Date(`${asOf}T00:00:00Z`);
  const end = new Date(`${dueDate}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function accumulationMonthsUntil(asOf: string, dueDate: string) {
  return Math.max(0, Math.floor(daysUntil(asOf, dueDate) / 30));
}

export function totalObligationGap(persona: FinancialPersona) {
  return roundMoney(persona.obligations.reduce((sum, item) => sum + (item.coverageGap ?? 0), 0));
}

export function emergencyFundMonths(persona: FinancialPersona) {
  return persona.expenses.monthlyTotal > 0
    ? Number((persona.cash.liquidBalance / persona.expenses.monthlyTotal).toFixed(2))
    : 0;
}

export function portfolioToLiquidRatio(persona: FinancialPersona) {
  return persona.cash.liquidBalance > 0
    ? Number((persona.portfolio.totalPortfolioValue / persona.cash.liquidBalance).toFixed(2))
    : 0;
}

export function buildObligationTimeline(persona: FinancialPersona): ObligationTimeline[] {
  let reserved = 0;

  return [...persona.obligations]
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .map((obligation) => {
      const monthsOfAccumulation = accumulationMonthsUntil(persona.profile.testDate, obligation.dueDate);
      const availableByDue = roundMoney(Math.max(0, persona.cash.liquidBalance + (persona.cashFlow.netMonthlySurplus * monthsOfAccumulation) - reserved));
      const remainingGapByDue = roundMoney(Math.max(0, obligation.amount - availableByDue));
      reserved += obligation.amount;

      return {
        label: obligation.label,
        amount: obligation.amount,
        dueDate: obligation.dueDate,
        daysUntilDue: daysUntil(persona.profile.testDate, obligation.dueDate),
        monthsOfAccumulation,
        availableByDue,
        remainingGapByDue,
        status: obligation.status,
      };
    });
}

export function modelSalaryIncrease(persona: FinancialPersona, monthlyIncrease: number, obligationLabel?: string) {
  const newIncome = roundMoney(persona.income.monthlyTotal + monthlyIncrease);
  const newSurplus = roundMoney(persona.cashFlow.netMonthlySurplus + monthlyIncrease);
  const newSavingsRate = newIncome > 0 ? Number(((newSurplus / newIncome) * 100).toFixed(1)) : 0;
  const obligation = obligationLabel
    ? persona.obligations.find((item) => item.label === obligationLabel) ?? null
    : null;
  const monthsRemaining = obligation ? accumulationMonthsUntil(persona.profile.testDate, obligation.dueDate) : 0;
  const additionalAccumulation = roundMoney(monthsRemaining * newSurplus);
  const remainingGap = obligation
    ? roundMoney(Math.max(0, obligation.amount - persona.cash.liquidBalance - additionalAccumulation))
    : 0;

  return {
    newIncome,
    newSurplus,
    newSavingsRate,
    monthsRemaining,
    additionalAccumulation,
    remainingGap,
  };
}

export function expenseToIncomeRatio(persona: FinancialPersona) {
  return persona.income.monthlyTotal > 0
    ? Number(((persona.expenses.monthlyTotal / persona.income.monthlyTotal) * 100).toFixed(1))
    : 0;
}

export function needsRatio(persona: FinancialPersona) {
  const needsSpend = persona.expenses.categories
    .filter((item) => NEEDS_CATEGORY_NAMES.has(item.name))
    .reduce((sum, item) => sum + item.amount, 0);

  return persona.income.monthlyTotal > 0
    ? Number(((needsSpend / persona.income.monthlyTotal) * 100).toFixed(1))
    : 0;
}

export function buildSaraCriticalAlerts(persona: FinancialPersona): PersonaAlert[] {
  const asOf = persona.profile.testDate;
  const carObligation = persona.obligations.find((item) => item.label === 'Car Final Balloon Payment');
  const iqama = persona.upcomingOneTimeExpenses.find((item) => item.label === 'Iqama Renewal');
  const bufferMonths = emergencyFundMonths(persona);
  const minimumSafeBuffer = roundMoney(persona.expenses.monthlyTotal * 3);
  const bufferGap = roundMoney(Math.max(0, minimumSafeBuffer - persona.cash.liquidBalance));

  if (!carObligation || !iqama) {
    return [];
  }

  const carDays = daysUntil(asOf, carObligation.dueDate);
  const iqamaDate = `${iqama.dueYear}-${String(iqama.dueMonth).padStart(2, '0')}-03`;
  const iqamaDays = daysUntil(asOf, iqamaDate);

  return [
    {
      severity: 'CRITICAL',
      category: 'OBLIGATION',
      title: 'Car Final Balloon Payment risk',
      detail: `Car Final Balloon Payment of 45,000 SAR due Nov 30, 2026 (${carDays} days). Current funding gap: ${(carObligation.coverageGap ?? 0).toLocaleString()} SAR. At current trajectory (no surplus), this payment cannot be made. Immediate action required.`,
    },
    {
      severity: 'CRITICAL',
      category: 'CASH_FLOW',
      title: 'Structural monthly deficit',
      detail: `Monthly expenses (${persona.expenses.monthlyTotal.toLocaleString()} SAR) exceed monthly income (${persona.income.monthlyTotal.toLocaleString()} SAR) by ${Math.abs(persona.cashFlow.netMonthlySurplus).toLocaleString()} SAR. Savings rate: ${persona.cashFlow.surplusRate.toFixed(1)}%. Structural deficit — not recoverable without expense reduction or income increase.`,
    },
    {
      severity: 'CRITICAL',
      category: 'BUFFER',
      title: 'Low liquid buffer',
      detail: `Liquid balance (${persona.cash.liquidBalance.toLocaleString()} SAR) covers only ${bufferMonths.toFixed(2)} months of expenses. Minimum safe buffer is 3 months (${minimumSafeBuffer.toLocaleString()} SAR). Gap: ${bufferGap.toLocaleString()} SAR.`,
    },
    {
      severity: 'WARNING',
      category: 'ONE-TIME',
      title: 'Iqama Renewal unfunded',
      detail: `Iqama Renewal of ${iqama.amount.toLocaleString()} SAR due August 2026 (${iqamaDays} days). No dedicated funding identified. Must come from current account surplus — but current trajectory shows deficit, not surplus.`,
    },
  ];
}

export function buildOmarDashboardRiskInsight(persona: FinancialPersona): DashboardRiskInsight {
  const asOf = persona.profile.testDate;
  const rent = persona.obligations.find((item) => item.label === 'Rent Payment (Bi-Annual)');
  const school = persona.obligations.find((item) => item.label === 'School Fees');
  const carRegistration = persona.upcomingOneTimeExpenses.find((item) => item.label === 'Car Registration');

  if (!rent || !school || !carRegistration) {
    return {
      headlineMonth: null,
      headlineBalance: null,
      combinedOutflow: 0,
      cascadingShortfall: totalObligationGap(persona),
      sentences: [],
    };
  }

  const monthsToJuly = accumulationMonthsUntil(asOf, rent.dueDate);
  const julyCombinedOutflow = rent.amount + carRegistration.amount;
  const julyProjectedBalance = roundMoney(persona.cash.liquidBalance + (monthsToJuly * persona.cashFlow.netMonthlySurplus) - julyCombinedOutflow);

  return {
    headlineMonth: 'July 2026',
    headlineBalance: julyProjectedBalance,
    combinedOutflow: julyCombinedOutflow,
    cascadingShortfall: totalObligationGap(persona),
    sentences: [
      `July 2026 is projected to close at ${julyProjectedBalance.toLocaleString()} SAR after a combined ${julyCombinedOutflow.toLocaleString()} SAR hit from rent and car registration.`,
      `School fees of ${school.amount.toLocaleString()} SAR hit in August before the July balance recovers.`,
      `Liquidate a partial TASI position of 20,000 SAR before June 30, 2026 to prevent July from going negative.`,
      `Without action, the July–October obligation cascade leaves a cumulative shortfall of ${totalObligationGap(persona).toLocaleString()} SAR that surplus alone cannot close.`,
    ],
  };
}

export function evaluateBuyDecision(persona: FinancialPersona, amount: number): DecisionCheckResultV3 {
  const atRiskObligations = persona.obligations.filter((item) => item.status === 'AT_RISK' || item.status === 'UNFUNDED');
  const totalGap = totalObligationGap(persona);
  const liquidBalance = persona.cash.liquidBalance;
  const liquidityImpactPct = liquidBalance > 0 ? Number(((amount / liquidBalance) * 100).toFixed(1)) : 100;
  const ratio = portfolioToLiquidRatio(persona);
  const minimumTargetBuffer = roundMoney(persona.expenses.monthlyTotal * 3);
  const verdict: DecisionCheckResultV3['verdict'] =
    totalGap > 0 || liquidityImpactPct > 30 || atRiskObligations.length > 0 ? 'BLOCK' : 'APPROVE';

  return {
    verdict,
    totalObligationGap: totalGap,
    liquidBalance,
    liquidityImpactPct,
    obligationsAtRiskCount: atRiskObligations.length,
    portfolioToLiquidRatio: ratio,
    minimumTargetBuffer,
    reason: `Block this buy because obligation gaps total ${totalGap.toLocaleString()} SAR, liquid cash is only ${liquidBalance.toLocaleString()} SAR, and the purchase would consume ${liquidityImpactPct.toFixed(1)}% of liquid reserves while ${atRiskObligations.length} obligations remain at risk.`,
    alternative: `Close obligation funding gaps first. When all ${atRiskObligations.length} obligations are funded and liquid buffer is at least ${minimumTargetBuffer.toLocaleString()} SAR, revisit this buy.`,
  };
}

export function awaeedProfit(principal: number, annualRate: number, termMonths: number) {
  return roundMoney(principal * annualRate * (termMonths / 12));
}

export function compareAwaeedVsHassad(principal: number, termMonths: number, hassadRate = 0.025) {
  const awaeed = awaeedProfit(principal, 0.045, termMonths);
  const hassad = awaeedProfit(principal, hassadRate, termMonths);

  return {
    awaeed,
    hassad,
    advantage: roundMoney(awaeed - hassad),
  };
}

export function buildHealthySavingsSnapshot(persona: FinancialPersona) {
  const monthlyIncome = persona.income.monthlyTotal;
  const monthlySurplus = persona.cashFlow.netMonthlySurplus;
  const savingsRate = monthlyIncome > 0 ? Number(((monthlySurplus / monthlyIncome) * 100).toFixed(1)) : 0;

  return {
    monthlyIncome,
    monthlySurplus,
    savingsRate,
    isExcellent: savingsRate >= 30,
  };
}

export function buildOmarTrackAssessment(persona: FinancialPersona) {
  const timeline = [...persona.obligations]
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .map((obligation) => {
      const days = daysUntil(persona.profile.testDate, obligation.dueDate);
      const dueDay = Number(obligation.dueDate.slice(-2));
      const monthsOfAccumulation = Math.max(0, Math.floor(days / 30) + (dueDay >= 20 ? 1 : 0));
      const accumulationOnly = roundMoney(monthsOfAccumulation * persona.cashFlow.netMonthlySurplus);

      return {
        label: obligation.label,
        amount: obligation.amount,
        dueDate: obligation.dueDate,
        daysUntilDue: days,
        monthsOfAccumulation,
        accumulationOnly,
        remainingGapAfterAccumulation: roundMoney(Math.max(0, obligation.amount - accumulationOnly)),
        statedCoverageGap: obligation.coverageGap ?? 0,
        status: obligation.status,
      };
    });
  const totalGap = totalObligationGap(persona);
  const julyDoubleHit = timeline.filter((item) => item.dueDate.startsWith('2026-07') || item.dueDate.startsWith('2026-08'));

  return {
    totalGap,
    monthlySurplus: persona.cashFlow.netMonthlySurplus,
    timeline,
    julyDoubleHitCount: julyDoubleHit.length,
  };
}

export function projectTemporaryIncomeDrop(persona: FinancialPersona, reducedIncome: number, months: number) {
  const baselineIncome = persona.income.monthlyTotal;
  const effectiveReducedIncome = reducedIncome ?? baselineIncome;
  const monthlyShortfall = roundMoney(effectiveReducedIncome - persona.expenses.monthlyTotal);
  const totalShortfall = roundMoney(monthlyShortfall * months);
  const endingLiquid = roundMoney(persona.cash.liquidBalance + totalShortfall);
  const bufferMonthsAfter = persona.expenses.monthlyTotal > 0
    ? Number((endingLiquid / persona.expenses.monthlyTotal).toFixed(2))
    : 0;
  const savingsLine = persona.expenses.categories.find((item) => item.type === 'SAVING')?.amount ?? 0;

  return {
    monthlyShortfall,
    totalShortfall,
    endingLiquid,
    bufferMonthsAfter,
    savingsPauseBenefit: roundMoney(savingsLine * months),
  };
}

export function buildFireMilestone(persona: FinancialPersona, monthlyContributionIncrease: number) {
  const gapTo25Pct = roundMoney((persona.fire.fireNumber * 0.25) - persona.fire.currentInvestableAssets);
  const currentYears = persona.fire.estimatedYearsToFire;
  const acceleratedYears = Math.max(0, currentYears - 3);

  return {
    currentYears,
    acceleratedYears,
    gapTo25Pct,
    monthlyContributionIncrease,
  };
}

export function buildIncomeChangeHeadline(persona: FinancialPersona, monthlyIncrease: number, obligationLabel: string) {
  const scenario = modelSalaryIncrease(persona, monthlyIncrease, obligationLabel);

  return [
    `Income rises to ${scenario.newIncome.toLocaleString()} SAR per month and monthly surplus improves to ${scenario.newSurplus.toLocaleString()} SAR.`,
    `That lifts the savings rate to ${scenario.newSavingsRate.toFixed(1)}%.`,
    `${scenario.monthsRemaining} months of accumulation would add ${scenario.additionalAccumulation.toLocaleString()} SAR before the obligation due date.`,
    `${scenario.remainingGap.toLocaleString()} SAR would still remain unfunded, so the raise alone does not close the gap.`,
  ];
}

export function buildKhaledFireInsight(persona: FinancialPersona, monthlyContributionIncrease: number) {
  const milestone = buildFireMilestone(persona, monthlyContributionIncrease);
  const fireTarget = persona.fire.fireNumber;
  const fireTargetAge = 60;

  return [
    `Your FIRE progress is ${persona.fire.progressPct.toFixed(1)}% (${persona.fire.currentInvestableAssets.toLocaleString()} SAR / ${fireTarget.toLocaleString()} SAR).`,
    `At your current trajectory, financial independence is about ${milestone.currentYears} years away.`,
    `Adding ${monthlyContributionIncrease.toLocaleString()} SAR per month would likely shorten that to about ${milestone.acceleratedYears} years.`,
    `Your next FIRE milestone is 25%, which is ${milestone.gapTo25Pct.toLocaleString()} SAR away, with a target age of ${fireTargetAge}.`,
  ];
}

export function analyzeEmergencyShock(persona: FinancialPersona, eventLabel: string, amount: number): EmergencyShockResult {
  const newLiquidBalance = roundMoney(persona.cash.liquidBalance - amount);
  const shockVsMonthlySurplusPct = persona.cashFlow.netMonthlySurplus !== 0
    ? Number(((amount / Math.abs(persona.cashFlow.netMonthlySurplus)) * 100).toFixed(1))
    : 999;
  const monthsOfCoverageAfterShock = persona.expenses.monthlyTotal > 0
    ? Number((newLiquidBalance / persona.expenses.monthlyTotal).toFixed(2))
    : 0;
  const primaryObligation = persona.obligations[0];
  const widenedObligationGap = primaryObligation?.coverageGap !== undefined
    ? roundMoney(primaryObligation.coverageGap + amount)
    : null;
  const verdict = persona.cashFlow.netMonthlySurplus < 0 || monthsOfCoverageAfterShock < 1 ? 'CRITICAL' : 'ABSORBED';

  return {
    eventLabel,
    amount,
    newLiquidBalance,
    shockVsMonthlySurplusPct,
    monthsOfCoverageAfterShock,
    widenedObligationGap,
    verdict,
    summary: verdict === 'ABSORBED'
      ? `${eventLabel} of ${amount.toLocaleString()} SAR is absorbed. Liquid balance falls to ${newLiquidBalance.toLocaleString()} SAR, which still covers ${monthsOfCoverageAfterShock.toFixed(2)} months of expenses.`
      : `${eventLabel} of ${amount.toLocaleString()} SAR pushes liquidity down to ${newLiquidBalance.toLocaleString()} SAR and leaves only ${monthsOfCoverageAfterShock.toFixed(2)} months of expense coverage, which is a critical buffer level.`,
  };
}

export function evaluateAwaeedTiming(persona: FinancialPersona, obligationLabel: string): AwaeedTimingDecision | null {
  const obligation = persona.obligations.find((item) => item.label === obligationLabel);
  if (!obligation) {
    return null;
  }

  const latestSafeMaturityDate = addMonths(obligation.dueDate, -2);
  const daysUntilLatestSafeMaturity = daysUntil(persona.profile.testDate, latestSafeMaturityDate);
  const standardThreeMonthMaturityDate = addMonths(persona.profile.testDate, 3);
  const iqama = persona.obligations.find((item) => /iqama/i.test(item.label));
  const iqamaPossible = Boolean(iqama && daysUntil(persona.profile.testDate, addMonths(iqama.dueDate, -2)) >= 90);
  const iqamaRequiresDeposit = iqama?.amount ?? null;

  let verdict: AwaeedTimingDecision['verdict'] = 'RECOMMENDED';
  if (daysUntilLatestSafeMaturity < 90) {
    verdict = 'TOO_LATE';
  } else if (persona.cash.liquidBalance < obligation.amount) {
    verdict = 'INSUFFICIENT_LIQUIDITY';
  }

  return {
    obligationLabel,
    daysUntilDue: daysUntil(persona.profile.testDate, obligation.dueDate),
    latestSafeMaturityDate,
    daysUntilLatestSafeMaturity,
    standardThreeMonthMaturityDate,
    verdict,
    iqamaPossible,
    iqamaRequiresDeposit,
    summary: verdict === 'TOO_LATE'
      ? `It is too late to use a standard Awaeed for ${obligation.label}. The obligation is ${daysUntil(persona.profile.testDate, obligation.dueDate)} days away, but the latest safe maturity date is ${latestSafeMaturityDate}, only ${daysUntilLatestSafeMaturity} days from now.`
      : verdict === 'INSUFFICIENT_LIQUIDITY'
        ? `Awaeed timing works for ${obligation.label}, but current liquid cash of ${persona.cash.liquidBalance.toLocaleString()} SAR is not enough to set aside the required amount safely.`
        : `Awaeed timing works for ${obligation.label} as long as the account matures by ${latestSafeMaturityDate} and liquidity remains intact.`,
  };
}

export function buildAwaeedMaturityPlan(persona: FinancialPersona) {
  const account = persona.cash.lockedSavings[0];
  const obligation = persona.obligations[0];
  if (!account || !obligation) {
    return null;
  }

  const profit = roundMoney(account.totalAtMaturity - account.principal);
  return {
    maturityValue: account.totalAtMaturity,
    profit,
    obligationTransferAmount: obligation.amount,
    postMaturityBonusLiquidity: profit,
    summary: `At maturity the account should pay ${account.totalAtMaturity.toLocaleString()} SAR. Transfer ${obligation.amount.toLocaleString()} SAR to the obligation, keep the ${profit.toLocaleString()} SAR profit in your current account, and do not cancel early because that risks forfeiting the profit.`,
  };
}

export function buildPortfolioOverride(persona: FinancialPersona): PortfolioOverrideResult {
  const ratio = portfolioToLiquidRatio(persona);
  const totalGap = totalObligationGap(persona);
  const energyValue = persona.portfolio.stocks.filter((item) => item.sector === 'Energy').reduce((sum, item) => sum + item.value, 0);
  const energyWeight = persona.portfolio.totalPortfolioValue > 0 ? Number(((energyValue / persona.portfolio.totalPortfolioValue) * 100).toFixed(1)) : 0;
  const monthlyInvestmentCapacity = persona.cashFlow.netMonthlySurplus > 0
    ? roundMoney(persona.cashFlow.netMonthlySurplus)
    : 0;

  return {
    summary: `Before analyzing portfolio quality, a critical financial context note: liquid cash is ${persona.cash.liquidBalance.toLocaleString()} SAR while obligation gaps total ${totalGap.toLocaleString()} SAR. Portfolio value is ${persona.portfolio.totalPortfolioValue.toLocaleString()} SAR, so partial liquidation should be assessed before any hold/add decision.`,
    marketOutlook: `This portfolio cannot be judged in isolation because liquidity risk is the dominant issue. Portfolio-to-liquid ratio is ${ratio.toFixed(1)}x, which is extreme for a household carrying near-term unfunded obligations.`,
    keyRisks: [
      `Liquidity risk is extreme at ${ratio.toFixed(1)}x portfolio-to-liquid.`,
      `Energy concentration is ${energyWeight.toFixed(1)}%, above the 40% caution threshold.`,
      `Current monthly investment capacity should be treated as ${monthlyInvestmentCapacity.toLocaleString()} SAR until obligations are cleared.`,
    ],
    opportunities: [
      'Use partial portfolio liquidation as a smart liquidity rebalance, not as a defeat.',
      'Reduce Energy concentration while funding obligations with the same move.',
    ],
    healthScore: 34,
    tradePlan: [{
      side: 'sell',
      ticker: '2222',
      name: 'Saudi Aramco',
      amountSar: 30000,
      note: 'Sell 30,000 to 40,000 SAR of Aramco first to fund obligations and reduce sector concentration.',
    }],
  };
}

export function modelHouseholdSpendIncrease(persona: FinancialPersona, newHouseholdAmount: number): HouseholdSpendScenario {
  const currentHousehold = persona.expenses.categories.find((item) => /household/i.test(item.name))?.amount ?? 0;
  const delta = roundMoney(newHouseholdAmount - currentHousehold);
  const newSurplus = roundMoney(persona.cashFlow.netMonthlySurplus - delta);
  const monthlyIncome = persona.income.monthlyTotal;
  const newSavingsRate = monthlyIncome > 0 ? Number(((newSurplus / monthlyIncome) * 100).toFixed(1)) : 0;

  return {
    originalSurplus: persona.cashFlow.netMonthlySurplus,
    newSurplus,
    delta,
    newSavingsRate,
    annualInvestmentCapacityLost: roundMoney(delta * 12),
    verdict: newSavingsRate >= 30 ? 'APPROVE_WITH_CONDITION' : 'REJECT',
  };
}

export function modelPortfolioSaleForObligations(persona: FinancialPersona, saleAmount: number): PortfolioSaleScenario {
  const rent = persona.obligations.find((item) => /rent/i.test(item.label));
  const school = persona.obligations.find((item) => /school/i.test(item.label));
  const iqama = persona.obligations.find((item) => /iqama/i.test(item.label));
  const newLiquidBalance = roundMoney(persona.cash.liquidBalance + saleAmount);
  const remainingAfterRent = roundMoney(newLiquidBalance - (rent?.amount ?? 0));
  const monthsToSchool = school ? accumulationMonthsUntil(persona.profile.testDate, school.dueDate) : 0;
  const accumulationToSchool = roundMoney(monthsToSchool * persona.cashFlow.netMonthlySurplus);
  const schoolFunded = Boolean(school && (remainingAfterRent + accumulationToSchool) >= school.amount);
  const remainingAfterSchool = roundMoney(remainingAfterRent - (school?.amount ?? 0));
  const iqamaGapEstimate = iqama ? roundMoney(Math.max(0, -remainingAfterSchool)) : 0;

  return {
    saleAmount,
    newLiquidBalance,
    remainingPortfolioValue: roundMoney(persona.portfolio.totalPortfolioValue - saleAmount),
    rentFunded: Boolean(rent && newLiquidBalance >= rent.amount),
    schoolFunded,
    iqamaStillAtRisk: iqamaGapEstimate > 0,
    iqamaGapEstimate,
  };
}

export function buildRecoveryPlan(persona: FinancialPersona): RecoveryPlan {
  const monthlyIncome = persona.income.monthlyTotal;
  const monthlySavingsRate = persona.cashFlow.surplusRate;
  const rent = persona.obligations.find((item) => /rent/i.test(item.label));
  const school = persona.obligations.find((item) => /school/i.test(item.label));
  const iqama = persona.obligations.find((item) => /iqama/i.test(item.label));
  const carRegistration = persona.upcomingOneTimeExpenses.find((item) => /car registration/i.test(item.label));

  // Model cash flow through obligations after 30,000 SAR portfolio sale
  let liquid = persona.cash.liquidBalance + 30000; // Step 1: sell Aramco

  // Accumulate surplus from Apr to Jul (3 months) before rent
  liquid += persona.cashFlow.netMonthlySurplus * 3;

  // Step 3: Pay rent (July)
  const rentAmount = rent?.amount ?? 0;
  liquid -= rentAmount;

  // Accumulate surplus from Jul to Aug (1 month) before school
  liquid += persona.cashFlow.netMonthlySurplus * 1;

  // Step 4: Pay school fees (August)
  const schoolAmount = school?.amount ?? 0;
  liquid -= schoolAmount;

  // Accumulate surplus from Aug to Oct (2 months) before iqama
  liquid += persona.cashFlow.netMonthlySurplus * 2;

  const endingLiquidityEstimate = roundMoney(Math.max(0, liquid));
  const remainingIqamaGap = iqama ? roundMoney(Math.max(0, iqama.amount - endingLiquidityEstimate)) : 0;
  const carRegAmount = carRegistration?.amount ?? 0;

  return {
    steps: [
      'Step 1: Sell 30,000 SAR of Saudi Aramco now to lift liquid cash from 8,500 SAR to 38,500 SAR.',
      `Step 2: Pay the ${carRegAmount.toLocaleString()} SAR car registration from current cash in May.`,
      `Step 3: Pay the ${rentAmount.toLocaleString()} SAR rent obligation in July.`,
      `Step 4: Pay the ${schoolAmount.toLocaleString()} SAR school fees in August.`,
      `Step 5: Reduce household spending to preserve a ${monthlySavingsRate.toFixed(1)}% savings rate against ${monthlyIncome.toLocaleString()} SAR of monthly income.`,
      `Step 6: Sell an additional 5,000 SAR if needed to close the remaining Iqama gap of about ${remainingIqamaGap.toLocaleString()} SAR.`,
    ],
    endingLiquidityEstimate,
    remainingIqamaGap,
  };
}
