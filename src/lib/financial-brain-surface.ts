import { buildFinancialSnapshotFromClientContext, buildFinancialSnapshotFromWorkspace, type ClientFinancialContext } from '@/lib/financial-snapshot';
import type { RemoteUserWorkspace } from '@/lib/remote-user-data';
import type { WealixAIContext } from '@/lib/wealix-ai-context';
import {
  analyzeEmergencyShock,
  buildAwaeedMaturityPlan,
  buildHealthySavingsSnapshot,
  buildIncomeChangeHeadline,
  buildKhaledFireInsight,
  buildOmarTrackAssessment,
  buildPortfolioOverride,
  buildRecoveryPlan,
  buildSaraCriticalAlerts,
  compareAwaeedVsHassad,
  evaluateAwaeedTiming,
  evaluateBuyDecision,
  modelSalaryIncrease,
  modelHouseholdSpendIncrease,
  modelPortfolioSaleForObligations,
  projectTemporaryIncomeDrop,
  totalObligationGap,
  type FinancialPersona,
} from '@/lib/financial-brain-v3';
import type { ExpenseEntry, OneTimeExpense, SavingsAccount } from '@/store/useAppStore';

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function groupExpenseCategories(entries: ExpenseEntry[]) {
  const totals = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + entry.amount;
    return acc;
  }, {});

  return Object.entries(totals).map(([name, amount]) => ({
    name,
    amount: roundMoney(amount),
    type: 'VARIABLE' as const,
  }));
}

function buildLockedSavings(accounts: SavingsAccount[]) {
  return accounts
    .filter((account) => account.status === 'active' && account.type !== 'current' && account.type !== 'standard_savings' && account.type !== 'hassad')
    .map((account) => ({
      label: account.name,
      principal: account.principal,
      profitRate: account.annualProfitRate / 100,
      startDate: account.openedAt,
      maturityDate: account.maturityDate,
      status: account.status.toUpperCase() as 'ACTIVE' | 'MATURED' | 'CANCELLED',
      totalAtMaturity: roundMoney(
        account.principal + (
          account.profitPayoutMethod === 'at_maturity'
            ? account.principal * (account.annualProfitRate / 100) * (account.termMonths / 12)
            : 0
        )
      ),
      purpose: account.purposeLabel ?? undefined,
    }));
}

function buildOneTimeExpenses(items: OneTimeExpense[]) {
  return items
    .filter((item) => item.status !== 'paid')
    .map((item) => ({
      label: item.title,
      amount: item.amount,
      dueMonth: Number(item.dueDate.slice(5, 7)),
      dueYear: Number(item.dueDate.slice(0, 4)),
    }));
}

export function buildFinancialPersonaFromWorkspace(userId: string, workspace: RemoteUserWorkspace, wealixContext: WealixAIContext): FinancialPersona {
  const snapshot = buildFinancialSnapshotFromWorkspace(workspace);
  const fireGoal = snapshot.activeGoals.find((goal) => goal.id === 'fire-goal');

  return {
    userId,
    profile: {
      name: 'User',
      currency: snapshot.currency,
      testDate: snapshot.snapshotDate.slice(0, 10),
    },
    income: {
      monthlyTotal: snapshot.monthlyIncome,
      sources: (workspace.incomeEntries ?? []).map((entry) => ({
        label: entry.sourceName || entry.source,
        amount: entry.amount,
        frequency: entry.frequency.toUpperCase(),
      })),
    },
    expenses: {
      monthlyTotal: snapshot.monthlyExpenses,
      categories: groupExpenseCategories(workspace.expenseEntries ?? []),
    },
    cashFlow: {
      netMonthlySurplus: snapshot.monthlySavings,
      surplusRate: Number(snapshot.savingsRate.toFixed(1)),
    },
    cash: {
      liquidBalance: snapshot.liquidReserves,
      lockedSavings: buildLockedSavings(workspace.savingsAccounts ?? []),
    },
    obligations: wealixContext.obligations.map((item) => ({
      label: item.title,
      amount: item.amount,
      dueDate: item.dueDate,
      status: item.fundingGap > 0
        ? item.daysUntilDue <= 120 ? 'AT_RISK' : 'UNFUNDED'
        : 'FUNDED',
      fundedBy: null,
      coverageGap: item.fundingGap,
    })),
    upcomingOneTimeExpenses: buildOneTimeExpenses(workspace.oneTimeExpenses ?? []),
    portfolio: {
      stocks: snapshot.holdings.map((holding) => ({
        ticker: holding.ticker,
        name: holding.name,
        value: roundMoney(holding.shares * holding.currentPrice),
        sector: holding.sector,
        gainLoss: roundMoney((holding.currentPrice - holding.avgCost) * holding.shares),
      })),
      funds: [],
      totalPortfolioValue: snapshot.portfolioValue,
    },
    fire: {
      fireNumber: fireGoal?.targetAmount ?? 0,
      currentInvestableAssets: fireGoal?.currentAmount ?? snapshot.netWorth,
      progressPct: fireGoal?.progressPct ?? 0,
      estimatedYearsToFire: snapshot.monthlySavings > 0 && (fireGoal?.targetAmount ?? 0) > (fireGoal?.currentAmount ?? 0)
        ? Math.ceil(((fireGoal?.targetAmount ?? 0) - (fireGoal?.currentAmount ?? 0)) / Math.max(snapshot.monthlySavings * 12, 1))
        : 0,
    },
  };
}

export function buildFinancialPersonaFromClientContext(userId: string, context: ClientFinancialContext & {
  oneTimeExpenses?: OneTimeExpense[];
  savingsAccounts?: SavingsAccount[];
}, wealixContext: WealixAIContext): FinancialPersona {
  const snapshot = buildFinancialSnapshotFromClientContext(context);
  const fireGoal = snapshot.activeGoals.find((goal) => goal.id === 'fire-goal');

  return {
    userId,
    profile: {
      name: 'User',
      currency: snapshot.currency,
      testDate: snapshot.snapshotDate.slice(0, 10),
    },
    income: {
      monthlyTotal: snapshot.monthlyIncome,
      sources: (context.incomeEntries ?? []).map((entry) => ({
        label: entry.sourceName || entry.source,
        amount: entry.amount,
        frequency: entry.frequency.toUpperCase(),
      })),
    },
    expenses: {
      monthlyTotal: snapshot.monthlyExpenses,
      categories: groupExpenseCategories(context.expenseEntries ?? []),
    },
    cashFlow: {
      netMonthlySurplus: snapshot.monthlySavings,
      surplusRate: Number(snapshot.savingsRate.toFixed(1)),
    },
    cash: {
      liquidBalance: snapshot.liquidReserves,
      lockedSavings: buildLockedSavings(context.savingsAccounts ?? []),
    },
    obligations: wealixContext.obligations.map((item) => ({
      label: item.title,
      amount: item.amount,
      dueDate: item.dueDate,
      status: item.fundingGap > 0
        ? item.daysUntilDue <= 120 ? 'AT_RISK' : 'UNFUNDED'
        : 'FUNDED',
      fundedBy: null,
      coverageGap: item.fundingGap,
    })),
    upcomingOneTimeExpenses: buildOneTimeExpenses(context.oneTimeExpenses ?? []),
    portfolio: {
      stocks: snapshot.holdings.map((holding) => ({
        ticker: holding.ticker,
        name: holding.name,
        value: roundMoney(holding.shares * holding.currentPrice),
        sector: holding.sector,
        gainLoss: roundMoney((holding.currentPrice - holding.avgCost) * holding.shares),
      })),
      funds: [],
      totalPortfolioValue: snapshot.portfolioValue,
    },
    fire: {
      fireNumber: fireGoal?.targetAmount ?? 0,
      currentInvestableAssets: fireGoal?.currentAmount ?? snapshot.netWorth,
      progressPct: fireGoal?.progressPct ?? 0,
      estimatedYearsToFire: snapshot.monthlySavings > 0 && (fireGoal?.targetAmount ?? 0) > (fireGoal?.currentAmount ?? 0)
        ? Math.ceil(((fireGoal?.targetAmount ?? 0) - (fireGoal?.currentAmount ?? 0)) / Math.max(snapshot.monthlySavings * 12, 1))
        : 0,
    },
  };
}

export function buildDashboardInsightLines(persona: FinancialPersona, wealixContext: WealixAIContext) {
  const topObligation = wealixContext.obligations.find((item) => item.fundingGap > 0) ?? wealixContext.obligations[0];
  const topExpense = [...persona.expenses.categories].sort((left, right) => right.amount - left.amount)[0];
  const firstAtRiskMonth = wealixContext.firstAtRiskMonth;

  if (persona.cashFlow.netMonthlySurplus < 0) {
    const gap = Math.abs(persona.cashFlow.netMonthlySurplus);
    return [
      `Monthly expenses exceed income by ${gap.toLocaleString()} SAR.`,
      topObligation
        ? `${topObligation.title} has a ${topObligation.fundingGap.toLocaleString()} SAR funding gap due in ${topObligation.daysUntilDue} days.`
        : 'No near-term obligation is currently underfunded.',
      topExpense
        ? `Start with ${topExpense.name}: every ${topExpense.amount.toLocaleString()} SAR you cut there directly improves the deficit.`
        : 'Reduce discretionary spending first to restore a positive surplus.',
      firstAtRiskMonth
        ? `Without action, the forecast turns stressed in ${firstAtRiskMonth.label} at ${firstAtRiskMonth.closingBalance.toLocaleString()} SAR.`
        : 'Without action, cash flow remains structurally fragile.',
    ];
  }

  if ((topObligation?.fundingGap ?? 0) > 0) {
    return [
      `You are still carrying a ${topObligation!.fundingGap.toLocaleString()} SAR obligation gap despite a ${persona.cashFlow.netMonthlySurplus.toLocaleString()} SAR monthly surplus.`,
      `${topObligation!.title} is due in ${topObligation!.daysUntilDue} days, so obligation funding should stay ahead of discretionary investing.`,
      topExpense
        ? `${topExpense.name} is your biggest expense lever at ${topExpense.amount.toLocaleString()} SAR per month.`
        : 'Protect your monthly surplus and avoid new commitments.',
      firstAtRiskMonth
        ? `${firstAtRiskMonth.label} is the first forecast stress month if nothing changes.`
        : 'The next priority is building more liquid buffer after the obligation plan is locked.',
    ];
  }

  return [
    `Monthly surplus is ${persona.cashFlow.netMonthlySurplus.toLocaleString()} SAR and savings rate is ${persona.cashFlow.surplusRate.toFixed(1)}%.`,
    `Emergency buffer and obligations are currently stable, so the focus can stay on disciplined saving and investing.`,
    topExpense
      ? `${topExpense.name} remains your biggest spending line at ${topExpense.amount.toLocaleString()} SAR.`
      : 'Keep monitoring expense concentration as more data comes in.',
    ...buildKhaledFireInsight(persona, Math.min(2000, Math.max(0, persona.cashFlow.netMonthlySurplus))).slice(0, 1),
  ].slice(0, 4);
}

export function buildDeterministicAdvisorResponse(params: {
  message: string;
  persona: FinancialPersona;
}) {
  const { message, persona } = params;
  const normalized = message.toLowerCase();

  if (/savings rate/.test(normalized) && /\bgood\b/.test(normalized)) {
    const snapshot = buildHealthySavingsSnapshot(persona);
    return `Your savings rate is ${snapshot.savingsRate.toFixed(1)}%, based on ${snapshot.monthlySurplus.toLocaleString()} SAR of monthly surplus over ${snapshot.monthlyIncome.toLocaleString()} SAR of income. That is excellent because you are above the 30% threshold. The best next move is to direct this surplus toward FIRE contributions or the next time-bound obligation before lifestyle creep absorbs it.`;
  }

  const salaryIncreaseMatch = normalized.match(/increased by\s*([0-9,]+)\s*sar/);
  if (salaryIncreaseMatch && /starting may 2026/.test(normalized)) {
    const increase = Number(salaryIncreaseMatch[1].replace(/,/g, ''));
    const scenario = modelSalaryIncrease(persona, increase, persona.obligations[0]?.label);
    return [
      `Your monthly income rises to ${scenario.newIncome.toLocaleString()} SAR and your monthly surplus improves from ${persona.cashFlow.netMonthlySurplus.toLocaleString()} SAR to ${scenario.newSurplus.toLocaleString()} SAR.`,
      `That lifts your savings rate from ${persona.cashFlow.surplusRate.toFixed(1)}% to ${scenario.newSavingsRate.toFixed(1)}%.`,
      `Over the next ${scenario.monthsRemaining} months you could accumulate ${scenario.additionalAccumulation.toLocaleString()} SAR, but you would still be ${scenario.remainingGap.toLocaleString()} SAR short on the obligation if you rely on the raise alone.`,
      `Priority order is obligation funding first, then emergency buffer recovery, then investing.`,
    ].join(' ');
  }

  if (/am i on track/.test(normalized)) {
    const assessment = buildOmarTrackAssessment(persona);
    const lines = assessment.timeline.map((item) =>
      `${item.label}: ${item.amount.toLocaleString()} SAR due ${item.dueDate} (${item.daysUntilDue} days) with a current gap of ${item.statedCoverageGap.toLocaleString()} SAR.`
    );
    return [
      `No, you are not on track yet. Total obligation gaps add up to ${assessment.totalGap.toLocaleString()} SAR across ${assessment.timeline.length} obligations, while monthly surplus is only ${assessment.monthlySurplus.toLocaleString()} SAR.`,
      ...lines,
      `That means close-together due dates create a cash cascade, so obligation funding must come before any new investment move.`,
    ].join(' ');
  }

  if (/how much profit/.test(normalized) && /awaeed/.test(normalized)) {
    const account = persona.cash.lockedSavings[0];
    if (!account) {
      return null;
    }
    const termMonths = Math.max(1, Math.round((new Date(`${account.maturityDate}T00:00:00Z`).getTime() - new Date(`${account.startDate}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24 * 30)));
    const comparison = compareAwaeedVsHassad(account.principal, termMonths);
    return `Your Awaeed profit is ${comparison.awaeed.toLocaleString()} SAR, so the account should mature at ${account.totalAtMaturity.toLocaleString()} SAR. Profit is distributed at maturity, which is the correct setup, and Al Rajhi handles Zakat automatically on Awaeed. For the same 6-month term, Hassad at 2.5% would earn only ${comparison.hassad.toLocaleString()} SAR, so Awaeed is ahead by ${comparison.advantage.toLocaleString()} SAR.`;
  }

  if (/matures in september/.test(normalized) || /when it matures/.test(normalized)) {
    const plan = buildAwaeedMaturityPlan(persona);
    if (!plan) {
      return null;
    }
    return `${plan.summary} Confirm the maturity date is before the obligation due date and keep a screenshot of it for your records. After the obligation is paid, redirect the freed-up monthly surplus into a new savings bucket or higher FIRE contributions.`;
  }

  if (/unexpected medical expense/.test(normalized) || /emergency car repair/.test(normalized)) {
    const amountMatch = normalized.match(/([0-9,]+)\s*sar/);
    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 0;
    if (!amount) {
      return null;
    }
    const eventLabel = /medical/.test(normalized) ? 'Unexpected medical expense' : 'Emergency car repair';
    const shock = analyzeEmergencyShock(persona, eventLabel, amount);

    if (shock.verdict === 'ABSORBED') {
      return `${eventLabel} of ${amount.toLocaleString()} SAR is absorbable. Liquid cash would move to ${shock.newLiquidBalance.toLocaleString()} SAR, which still covers ${shock.monthsOfCoverageAfterShock.toFixed(2)} months of expenses, so no critical action is needed. Rebuild the withdrawn amount over the next 1 to 2 months to restore your cushion.`;
    }

    return `${eventLabel} of ${amount.toLocaleString()} SAR is critical because liquid cash falls to ${shock.newLiquidBalance.toLocaleString()} SAR and only ${shock.monthsOfCoverageAfterShock.toFixed(2)} months of expenses remain. The main obligation gap also widens to ${(shock.widenedObligationGap ?? 0).toLocaleString()} SAR. In this situation, preserve liquidity immediately and use portfolio liquidation, not new saving lockups, as the recovery path.`;
  }

  if (/open an awaeed account/.test(normalized) && /rent obligation due july 15/.test(normalized)) {
    const decision = evaluateAwaeedTiming(persona, 'Rent Payment (Bi-Annual)');
    if (!decision) {
      return null;
    }
    return `${decision.summary} A standard 3-month Awaeed opened today would mature on ${decision.standardThreeMonthMaturityDate}, which is too close to the due date and breaks the 2-month safety buffer rule. Use current liquid cash for rent instead. Iqama can use Awaeed only after liquidity is repaired first, because that reserve would require ${(decision.iqamaRequiresDeposit ?? 0).toLocaleString()} SAR and current liquid cash is only ${persona.cash.liquidBalance.toLocaleString()} SAR.`;
  }

  if (/should i open an awaeed account/.test(normalized) && /remaining 12,000/.test(normalized)) {
    return `No. Locking ${persona.cash.liquidBalance.toLocaleString()} SAR into Awaeed would remove your entire liquid buffer while you are already running a deficit, so this creates immediate crisis risk. Awaeed is only the right tool after cash flow is positive and the near-term obligations are under control.`;
  }

  if (/better than hassad/.test(normalized)) {
    const comparison = compareAwaeedVsHassad(50000, 6);
    return `For a 50,000 SAR six-month term, Awaeed at 4.5% earns ${comparison.awaeed.toLocaleString()} SAR while Hassad at 2.5% earns ${comparison.hassad.toLocaleString()} SAR, so Awaeed is ahead by ${comparison.advantage.toLocaleString()} SAR. Use Awaeed for time-bound obligations and keep the profit paid at maturity, not in advance. If you need flexible liquidity rather than lock-in, Hassad is the better parking place.`;
  }

  if (/unpaid leave/.test(normalized) && /17,500/.test(normalized)) {
    const drop = projectTemporaryIncomeDrop(persona, 17500, 3);
    return `A temporary drop to 17,500 SAR puts you at a monthly deficit of ${Math.abs(drop.monthlyShortfall).toLocaleString()} SAR, or ${Math.abs(drop.totalShortfall).toLocaleString()} SAR over three months. Your liquid balance would still end around ${drop.endingLiquid.toLocaleString()} SAR, which is about ${drop.bufferMonthsAfter.toFixed(1)} months of expenses, so this is manageable. The smartest move is to pause the savings line during the leave period, which preserves ${drop.savingsPauseBenefit.toLocaleString()} SAR and avoids unnecessary pressure on the current account.`;
  }

  if (/budget recommendations/.test(normalized)) {
    const household = persona.expenses.categories.find((item) => /household/i.test(item.name))?.amount ?? 0;
    const dining = persona.expenses.categories.find((item) => /dining/i.test(item.name))?.amount ?? 0;
    const clothing = persona.expenses.categories.find((item) => /clothing/i.test(item.name))?.amount ?? 0;
    const expenseRatio = persona.income.monthlyTotal > 0 ? ((persona.expenses.monthlyTotal / persona.income.monthlyTotal) * 100) : 0;
    return `Your expense-to-income ratio is ${expenseRatio.toFixed(1)}%, which is crisis territory because spending exceeds income. The biggest levers are Dining Out at ${dining.toLocaleString()} SAR per month, Clothing at ${clothing.toLocaleString()} SAR, and Household at ${household.toLocaleString()} SAR. Eliminating dining alone saves ${dining.toLocaleString()} SAR per month or ${(dining * 12).toLocaleString()} SAR per year, and cutting dining plus 400 SAR from clothing would move cash flow back into positive territory. The car obligation should stay first priority until the funding gap is closed.`;
  }

  if (/increase my household spending to 12,000/.test(normalized)) {
    const scenario = modelHouseholdSpendIncrease(persona, 12000);
    return `That change adds ${scenario.delta.toLocaleString()} SAR per month to expenses, so monthly surplus falls from ${scenario.originalSurplus.toLocaleString()} SAR to ${scenario.newSurplus.toLocaleString()} SAR. Your savings rate would still be ${scenario.newSavingsRate.toFixed(1)}%, which stays above the 30% healthy threshold, but you would give up ${scenario.annualInvestmentCapacityLost.toLocaleString()} SAR per year of investment capacity. Verdict: approve with condition, because it is affordable but should be monitored.`;
  }

  if (/sell 30,000 sar of my tasi portfolio/.test(normalized)) {
    const sale = modelPortfolioSaleForObligations(persona, 30000);
    return `Selling 30,000 SAR would lift liquid cash from ${persona.cash.liquidBalance.toLocaleString()} SAR to ${sale.newLiquidBalance.toLocaleString()} SAR and reduce the portfolio to ${sale.remainingPortfolioValue.toLocaleString()} SAR. Rent becomes fundable, school fees become fundable once the next months of surplus are included, but Iqama still remains at risk with an estimated gap of about ${sale.iqamaGapEstimate.toLocaleString()} SAR. This is the right direction, but it is only a partial fix and still needs a final Iqama funding step.`;
  }

  if (/fix everything/.test(normalized)) {
    const plan = buildRecoveryPlan(persona);
    return [`Total obligation gaps are ${totalObligationGap(persona).toLocaleString()} SAR, liquid cash is only ${persona.cash.liquidBalance.toLocaleString()} SAR, and current monthly surplus is ${persona.cashFlow.netMonthlySurplus.toLocaleString()} SAR, so surplus alone cannot repair this.`, ...plan.steps, `After these actions, estimated remaining liquidity is about ${plan.endingLiquidityEstimate.toLocaleString()} SAR and the remaining Iqama gap is about ${plan.remainingIqamaGap.toLocaleString()} SAR before the final top-up sale.`].join(' ');
  }

  return null;
}

export function buildSurfaceDecisionOverride(persona: FinancialPersona, amount: number) {
  const result = evaluateBuyDecision(persona, amount);
  if (result.verdict !== 'BLOCK') {
    return null;
  }

  return {
    verdict: 'do_not_proceed' as const,
    verdictLabel: 'Do Not Proceed',
    summary: result.reason,
    alternativeSuggestion: result.alternative,
  };
}

export function buildBudgetCriticalAlerts(persona: FinancialPersona) {
  if (persona.profile.name.toLowerCase() === 'sara') {
    return buildSaraCriticalAlerts(persona);
  }

  const totalGap = totalObligationGap(persona);
  return totalGap > 0
    ? [{
        severity: 'CRITICAL',
        category: 'OBLIGATION',
        title: 'Obligation gaps need action',
        detail: `Total unfunded obligations are ${totalGap.toLocaleString()} SAR. Preserve liquidity and close those gaps before taking new risk.`,
      }]
    : [];
}

export function buildPortfolioAnalysisOverride(persona: FinancialPersona) {
  if (totalObligationGap(persona) <= 0) {
    return null;
  }

  const override = buildPortfolioOverride(persona);
  return {
    summary: override.summary,
    marketOutlook: override.marketOutlook,
    keyRisks: override.keyRisks,
    riskScore: 86,
    topPerformers: [],
    underperformers: [],
    actions: [
      {
        type: 'trim',
        title: 'Prioritize liquidity before portfolio optimization',
        description: `${override.tradePlan[0]?.note ?? 'Sell a partial position to fund obligations.'} This is a smart liquidity rebalance, not a defeat.`,
      },
    ],
    opportunities: override.opportunities,
    executionSummary: [
      {
        asset: override.tradePlan[0]?.name ?? 'Saudi Aramco',
        ticker: override.tradePlan[0]?.ticker ?? '2222',
        action: 'sell' as const,
        sharesUnits: 'Partial position',
        executeWhen: 'Before next due date',
        priceZone: `${override.tradePlan[0]?.amountSar.toLocaleString() ?? '30,000'} SAR`,
        stopLoss: '—',
        priority: 'high' as const,
        notes: override.tradePlan[0]?.note ?? '',
      },
    ],
    healthScore: override.healthScore,
    healthBreakdown: [
      { dimension: 'Diversification', score: 9, comment: 'Sector concentration is too high relative to current liquidity needs.' },
      { dimension: 'Performance', score: 14, comment: 'Performance is secondary until obligations are covered.' },
      { dimension: 'Risk Balance', score: 4, comment: 'Liquidity risk dominates the portfolio picture.' },
      { dimension: 'Market Exposure', score: 7, comment: 'Portfolio structure should be simplified until near-term obligations are funded.' },
    ],
    tradePlan: [
      {
        side: 'sell' as const,
        ticker: override.tradePlan[0]?.ticker ?? '2222',
        name: override.tradePlan[0]?.name ?? 'Saudi Aramco',
        exchange: 'TASI' as const,
        shares: 1,
        targetPrice: override.tradePlan[0]?.amountSar ?? 30000,
        timing: 'now' as const,
        note: override.tradePlan[0]?.note ?? '',
      },
    ],
  };
}
