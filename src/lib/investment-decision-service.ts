import type { FinancialSnapshot } from '@/lib/financial-snapshot';
import type { WealixAIContext } from '@/lib/wealix-ai-context';

export type InvestmentDecisionVerdict =
  | 'proceed_now'
  | 'proceed_with_caution'
  | 'postpone'
  | 'do_not_proceed';

export type DecisionDimensionKey =
  | 'portfolio_alignment'
  | 'net_worth_impact'
  | 'liquidity_check'
  | 'goal_alignment'
  | 'savings_trajectory'
  | 'risk_profile_match'
  | 'market_timing_signal'
  | 'opportunity_cost';

export type DecisionDimensionStatus = 'positive' | 'neutral' | 'warning' | 'negative';

export type InvestmentDecisionDimension = {
  key: DecisionDimensionKey;
  title: string;
  status: DecisionDimensionStatus;
  score: number;
  analysis: string;
};

export type InvestmentDecisionInput = {
  name: string;
  price: number;
  locale: 'ar' | 'en';
};

export type InvestmentDecisionResult = {
  verdict: InvestmentDecisionVerdict;
  verdictLabel: string;
  summary: string;
  suggestedAllocation: {
    amount: number;
    percentOfNetWorth: number;
    percentOfLiquidReserves: number;
  };
  revisitPlan: {
    month: string | null;
    savingsMilestone: number | null;
    monthsToWait: number;
  };
  alternativeSuggestion: string;
  dimensions: InvestmentDecisionDimension[];
  assetClass: string;
};

type ModelJson = {
  verdict?: InvestmentDecisionVerdict;
  summary?: string;
  alternativeSuggestion?: string;
  suggestedAllocation?: {
    amount?: number;
    percentOfNetWorth?: number;
    percentOfLiquidReserves?: number;
  };
  revisitPlan?: {
    month?: string | null;
    savingsMilestone?: number | null;
    monthsToWait?: number;
  };
  dimensions?: Array<{
    key?: DecisionDimensionKey;
    title?: string;
    status?: DecisionDimensionStatus;
    score?: number;
    analysis?: string;
  }>;
};

const DIMENSION_TITLES: Record<DecisionDimensionKey, string> = {
  portfolio_alignment: 'Portfolio Alignment',
  net_worth_impact: 'Net Worth Impact',
  liquidity_check: 'Liquidity Check',
  goal_alignment: 'Goal Alignment',
  savings_trajectory: 'Savings Trajectory',
  risk_profile_match: 'Risk Profile Match',
  market_timing_signal: 'Market Timing Signal',
  opportunity_cost: 'Opportunity Cost',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function parseJsonObject(content: string): ModelJson | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]) as ModelJson;
  } catch {
    return null;
  }
}

function classifyInvestment(name: string) {
  const lower = name.toLowerCase();
  if (/gold|xau|bullion|ذهب/.test(lower)) return 'gold';
  if (/bitcoin|btc|ethereum|eth|crypto|cryptocurrency/.test(lower)) return 'crypto';
  if (/etf|index fund|fund|reit/.test(lower)) return 'etf';
  if (/apartment|villa|house|property|real estate|land|riyadh|jeddah|dubai/.test(lower)) return 'real_estate';
  if (/model y|tesla|toyota|car|vehicle|سيارة|hyundai|kia|bmw|mercedes/.test(lower)) return 'vehicle';
  if (/stock|share|equity|nasdaq|nyse|tasi|egx/.test(lower)) return 'stock';
  return 'other';
}

function statusFromScore(score: number): DecisionDimensionStatus {
  if (score >= 2) return 'positive';
  if (score >= 0) return 'neutral';
  if (score >= -2) return 'warning';
  return 'negative';
}

function formatMonth(locale: 'ar' | 'en', monthsToAdd: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsToAdd);
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function buildDimensions(input: InvestmentDecisionInput, snapshot: FinancialSnapshot, wealixContext?: WealixAIContext) {
  const assetClass = classifyInvestment(input.name);
  const price = input.price;
  const netWorthImpactPct = snapshot.netWorth.net > 0 ? (price / snapshot.netWorth.net) * 100 : 100;
  const liquidImpactPct = snapshot.liquidReserves > 0 ? (price / snapshot.liquidReserves) * 100 : 100;
  const liquidAfter = snapshot.liquidReserves - price;
  const sectorTop = snapshot.sectorExposure[0];
  const assetClassWeights = Object.fromEntries(snapshot.assetClassExposure.map((item) => [item.assetClass, item.weightPct]));
  const hasGoldExposure = (assetClassWeights.gold ?? 0) > 0;
  const comfortableAmount = Math.max(0, snapshot.liquidReserves - snapshot.emergencyFundTarget);
  const fundingGap = Math.max(0, price - comfortableAmount);
  const monthsToAfford = snapshot.monthlySavings > 0 ? Math.ceil(fundingGap / snapshot.monthlySavings) : (fundingGap > 0 ? 12 : 0);
  const nearestAtRiskObligation = wealixContext?.obligations.find((item) => item.daysUntilDue <= 90 && item.fundingGap > 0);
  const lowSavingsRate = (wealixContext?.savingsRate ?? snapshot.savingsRate) < 10;
  const topSectorWeightPct = wealixContext?.financialSnapshot.sectorExposure[0]?.weightPct ?? 0;

  const dimensions: InvestmentDecisionDimension[] = [];

  let portfolioScore = 0;
  let portfolioAnalysis = 'This purchase sits neutrally against your current allocation.';
  if (assetClass === 'gold' && !hasGoldExposure) {
    portfolioScore = 3;
    portfolioAnalysis = 'You currently have little to no gold exposure, so this adds diversification rather than deepening an existing concentration.';
  } else if (assetClass === 'crypto' && (assetClassWeights.crypto ?? 0) > 10) {
    portfolioScore = -3;
    portfolioAnalysis = 'You already have material speculative exposure, so adding more crypto increases concentration in the highest-volatility bucket.';
  } else if (assetClass === 'stock' && snapshot.topHoldingWeightPct >= 25) {
    portfolioScore = -2;
    portfolioAnalysis = `Your portfolio is already concentrated in a few positions, so another single-stock purchase increases concentration risk instead of improving diversification.`;
  } else if (assetClass === 'etf') {
    portfolioScore = 2;
    portfolioAnalysis = 'A broad ETF generally improves diversification and reduces single-name concentration risk.';
  } else if (assetClass === 'vehicle') {
    portfolioScore = -4;
    portfolioAnalysis = 'A vehicle does not diversify the investment portfolio; it converts capital into a depreciating asset.';
  }
  dimensions.push({
    key: 'portfolio_alignment',
    title: DIMENSION_TITLES.portfolio_alignment,
    status: statusFromScore(portfolioScore),
    score: portfolioScore,
    analysis: portfolioAnalysis,
  });

  let netWorthScore = 0;
  let netWorthAnalysis = `${netWorthImpactPct.toFixed(1)}% of your net worth is meaningful but not automatically unhealthy.`;
  if (netWorthImpactPct >= 30) {
    netWorthScore = -4;
    netWorthAnalysis = `This would consume ${netWorthImpactPct.toFixed(1)}% of your net worth, which is too large for a single discretionary decision.`;
  } else if (netWorthImpactPct >= 15) {
    netWorthScore = -2;
    netWorthAnalysis = `At ${netWorthImpactPct.toFixed(1)}% of net worth, the size is large enough that allocation discipline matters.`;
  } else if (netWorthImpactPct <= 5) {
    netWorthScore = 2;
    netWorthAnalysis = `At ${netWorthImpactPct.toFixed(1)}% of net worth, the position size is manageable.`;
  }
  dimensions.push({
    key: 'net_worth_impact',
    title: DIMENSION_TITLES.net_worth_impact,
    status: statusFromScore(netWorthScore),
    score: netWorthScore,
    analysis: netWorthAnalysis,
  });

  let liquidityScore = 0;
  let liquidityAnalysis = 'Liquidity remains acceptable after this purchase.';
  if (liquidImpactPct > 30) {
    liquidityScore = -4;
    liquidityAnalysis = `This would commit ${liquidImpactPct.toFixed(1)}% of liquid reserves, which is above the 30% ceiling for a new discretionary move.`;
  } else if (liquidAfter < snapshot.emergencyFundTarget * 0.75) {
    liquidityScore = -4;
    liquidityAnalysis = `Paying ${input.price.toLocaleString()} now would drop liquid reserves below a safe emergency threshold.`;
  } else if (liquidAfter < snapshot.emergencyFundTarget) {
    liquidityScore = -2;
    liquidityAnalysis = 'This purchase would breach your emergency-fund floor and weaken your short-term resilience.';
  } else if (liquidImpactPct <= 15) {
    liquidityScore = 2;
    liquidityAnalysis = 'The cost uses a modest share of liquid reserves and keeps your emergency buffer intact.';
  }
  dimensions.push({
    key: 'liquidity_check',
    title: DIMENSION_TITLES.liquidity_check,
    status: statusFromScore(liquidityScore),
    score: liquidityScore,
    analysis: liquidityAnalysis,
  });

  const fireGoal = snapshot.activeGoals.find((goal) => goal.id === 'fire-goal');
  let goalScore = 0;
  let goalAnalysis = 'The purchase does not materially change your major long-term goals.';
  if (assetClass === 'vehicle') {
    goalScore = -4;
    goalAnalysis = 'A vehicle purchase pulls capital away from compounding and usually delays FIRE-style goals rather than accelerating them.';
  } else if ((fireGoal?.status === 'off_track' || (fireGoal?.progressPct ?? 0) < 40) && price > Math.max(snapshot.monthlySavings * 2, 0)) {
    goalScore = -2;
    goalAnalysis = 'Your long-term goals still need consistent funding, so this purchase competes with them more than it supports them.';
  } else if (assetClass === 'gold' || assetClass === 'etf') {
    goalScore = 1;
    goalAnalysis = 'This can support long-term wealth goals if the size stays controlled.';
  }
  dimensions.push({
    key: 'goal_alignment',
    title: DIMENSION_TITLES.goal_alignment,
    status: statusFromScore(goalScore),
    score: goalScore,
    analysis: goalAnalysis,
  });

  let savingsScore = 0;
  let savingsAnalysis = 'You can fund this without materially delaying your savings path.';
  if (nearestAtRiskObligation) {
    savingsScore = -4;
    savingsAnalysis = `There is already a ${nearestAtRiskObligation.fundingGap.toLocaleString()} SAR funding gap for ${nearestAtRiskObligation.title} due by ${nearestAtRiskObligation.dueDate}, so this should not take priority over the obligation plan.`;
  } else if (monthsToAfford > 6) {
    savingsScore = -3;
    savingsAnalysis = `At your current savings pace, this is better revisited after about ${monthsToAfford} months.`;
  } else if (monthsToAfford > 0) {
    savingsScore = -1;
    savingsAnalysis = `You are close, but waiting ${monthsToAfford} more months would let you fund it without stretching liquidity.`;
  } else if (comfortableAmount >= price) {
    savingsScore = 2;
    savingsAnalysis = 'Current surplus savings already cover the purchase while preserving your cash buffer.';
  }
  dimensions.push({
    key: 'savings_trajectory',
    title: DIMENSION_TITLES.savings_trajectory,
    status: statusFromScore(savingsScore),
    score: savingsScore,
    analysis: savingsAnalysis,
  });

  let riskScore = 0;
  let riskAnalysis = 'The risk level is broadly in line with your current profile.';
  if (lowSavingsRate && (assetClass === 'crypto' || assetClass === 'stock')) {
    riskScore = -3;
    riskAnalysis = 'Cash flow is already tight, so adding volatile exposure would amplify the financial downside if a shortfall appears.';
  } else if (snapshot.riskProfile === 'conservative' && (assetClass === 'crypto' || assetClass === 'stock')) {
    riskScore = -3;
    riskAnalysis = 'Your current balance sheet points to a conservative profile, so a volatile asset is mismatched right now.';
  } else if (snapshot.riskProfile === 'moderate' && assetClass === 'crypto') {
    riskScore = -2;
    riskAnalysis = 'A moderate profile can handle limited speculative exposure, but not a large crypto allocation.';
  } else if ((assetClass === 'gold' || assetClass === 'etf') && snapshot.riskProfile !== 'aggressive') {
    riskScore = 2;
    riskAnalysis = 'The asset class fits a measured risk profile better than a concentrated single-name or speculative bet.';
  } else if (assetClass === 'vehicle') {
    riskScore = -2;
    riskAnalysis = 'The financial risk is not market volatility but capital decay and lower flexibility.';
  }
  dimensions.push({
    key: 'risk_profile_match',
    title: DIMENSION_TITLES.risk_profile_match,
    status: statusFromScore(riskScore),
    score: riskScore,
    analysis: riskAnalysis,
  });

  let timingScore = 0;
  let timingAnalysis = 'Without a live valuation feed, the timing signal is neutral rather than strongly bullish or bearish.';
  if (assetClass === 'gold') {
    timingScore = 1;
    timingAnalysis = 'Gold is usually more compelling as a hedge when the portfolio lacks defensive exposure; timing is acceptable if size stays disciplined.';
  } else if (assetClass === 'vehicle') {
    timingScore = -2;
    timingAnalysis = 'Vehicles rarely benefit from “good timing” in an investment sense because they depreciate from day one.';
  } else if (assetClass === 'crypto') {
    timingScore = -1;
    timingAnalysis = 'Crypto timing is highly regime-dependent, so the base signal should be treated as cautious unless the position is small.';
  } else if (assetClass === 'etf') {
    timingScore = 1;
    timingAnalysis = 'Broad-market ETFs usually do not require precision timing if the purchase size is sustainable.';
  }
  dimensions.push({
    key: 'market_timing_signal',
    title: DIMENSION_TITLES.market_timing_signal,
    status: statusFromScore(timingScore),
    score: timingScore,
    analysis: timingAnalysis,
  });

  let opportunityScore = 0;
  const firstAlternative = snapshot.watchlistAlternatives[0];
  let opportunityAnalysis = 'The opportunity cost is reasonable relative to your current alternatives.';
  if (nearestAtRiskObligation) {
    opportunityScore = -4;
    opportunityAnalysis = `The stronger use of cash is to close the ${nearestAtRiskObligation.title} gap before adding a new discretionary position.`;
  } else if (assetClass === 'vehicle' && firstAlternative) {
    opportunityScore = -4;
    opportunityAnalysis = `Deploying this cash here means giving up a stronger priority such as ${firstAlternative.name}.`;
  } else if (snapshot.emergencyFundMonths < 6) {
    opportunityScore = -2;
    opportunityAnalysis = 'The higher-priority use of capital is improving resilience before adding another discretionary exposure.';
  } else if ((assetClass === 'stock' || assetClass === 'crypto') && topSectorWeightPct > 40) {
    opportunityScore = -2;
    opportunityAnalysis = 'The portfolio is already concentrated by sector, so cash or a broader fund would improve balance more than another concentrated add.';
  } else if (assetClass === 'gold' && !hasGoldExposure) {
    opportunityScore = 2;
    opportunityAnalysis = 'The trade-off is acceptable because this fills a real diversification gap rather than duplicating what you already own.';
  }
  dimensions.push({
    key: 'opportunity_cost',
    title: DIMENSION_TITLES.opportunity_cost,
    status: statusFromScore(opportunityScore),
    score: opportunityScore,
    analysis: opportunityAnalysis,
  });

  return {
    assetClass,
    dimensions,
    monthsToAfford,
    comfortableAmount,
    liquidImpactPct,
    netWorthImpactPct,
  };
}

function buildVerdictLabel(verdict: InvestmentDecisionVerdict, locale: 'ar' | 'en') {
  if (locale === 'ar') {
    switch (verdict) {
      case 'proceed_now':
        return 'تابع الآن';
      case 'proceed_with_caution':
        return 'تابع بحذر';
      case 'postpone':
        return 'أجّل القرار';
      case 'do_not_proceed':
      default:
        return 'لا تتابع';
    }
  }

  switch (verdict) {
    case 'proceed_now':
      return 'Proceed Now';
    case 'proceed_with_caution':
      return 'Proceed with Caution';
    case 'postpone':
      return 'Postpone';
    case 'do_not_proceed':
    default:
      return 'Do Not Proceed';
  }
}

function buildFallbackDecision(input: InvestmentDecisionInput, snapshot: FinancialSnapshot, wealixContext?: WealixAIContext): InvestmentDecisionResult {
  const { assetClass, dimensions, monthsToAfford, comfortableAmount, liquidImpactPct, netWorthImpactPct } = buildDimensions(input, snapshot, wealixContext);
  const totalScore = dimensions.reduce((sum, dimension) => sum + dimension.score, 0);
  const nearestAtRiskObligation = wealixContext?.obligations.find((item) => item.daysUntilDue <= 90 && item.fundingGap > 0);
  const totalObligationGap = wealixContext?.obligations.reduce((sum, item) => sum + item.fundingGap, 0) ?? 0;
  const obligationsAtRiskCount = wealixContext?.obligations.filter((item) => item.fundingGap > 0).length ?? 0;
  const portfolioToLiquidRatio = wealixContext?.portfolioToLiquidRatio ?? (snapshot.liquidReserves > 0 ? snapshot.portfolioValue / snapshot.liquidReserves : 0);
  const savingsRate = wealixContext?.savingsRate ?? snapshot.savingsRate;
  const firstForecastPressure = snapshot.forecast.monthlyRows.find((row) => row.status !== 'HEALTHY') ?? snapshot.forecast.monthlyRows[0] ?? null;
  const suggestedAmount = roundMoney(Math.max(0, Math.min(
    input.price,
    snapshot.netWorth.net * 0.08,
    snapshot.liquidReserves * (assetClass === 'crypto' ? 0.05 : 0.15)
  )));

  let verdict: InvestmentDecisionVerdict = 'proceed_with_caution';
  if (
    assetClass === 'vehicle' ||
    liquidImpactPct > 30 ||
    netWorthImpactPct > 30 ||
    snapshot.monthlySavings <= 0 ||
    Boolean(nearestAtRiskObligation) ||
    totalObligationGap > 0
  ) {
    verdict = 'do_not_proceed';
  } else if (monthsToAfford > 0 || liquidImpactPct > 25 || totalScore < 1 || savingsRate < 10) {
    verdict = 'postpone';
  } else if (totalScore >= 6 && liquidImpactPct <= 15 && netWorthImpactPct <= 10) {
    verdict = 'proceed_now';
  }

  if (verdict !== 'do_not_proceed' && totalScore >= 2 && liquidImpactPct <= 25 && netWorthImpactPct <= 15 && monthsToAfford === 0) {
    verdict = totalScore >= 6 ? 'proceed_now' : 'proceed_with_caution';
  }

  const monthsToWait = verdict === 'postpone' ? Math.max(1, monthsToAfford || 1) : 0;
  const savingsMilestone = verdict === 'postpone'
    ? roundMoney(Math.max(snapshot.emergencyFundTarget + input.price, snapshot.liquidReserves))
    : null;

  const alternative = assetClass === 'vehicle'
    ? 'Preserve capital for liquidity or a diversified investment instead of a depreciating asset.'
    : totalObligationGap > 0
      ? `Fund obligations first. Total unfunded gaps equal ${totalObligationGap.toLocaleString()} SAR across ${obligationsAtRiskCount} obligations, which is financially stronger than opening this position now.`
      : nearestAtRiskObligation
        ? `Fund ${nearestAtRiskObligation.title} first. Closing the ${nearestAtRiskObligation.fundingGap.toLocaleString()} SAR gap is financially stronger than opening this position now.`
    : snapshot.watchlistAlternatives[0]?.reason
      ? `${snapshot.watchlistAlternatives[0].name}: ${snapshot.watchlistAlternatives[0].reason}`
      : 'Favor a smaller initial allocation so you gain exposure without stressing liquidity.';

  const summaryMap: Record<InvestmentDecisionVerdict, string> = {
    proceed_now: `This can fit your finances now. The size is manageable, liquidity stays intact, and the asset does not materially derail current goals.`,
    proceed_with_caution: `The idea is financially workable, but the size should stay controlled. A smaller allocation is safer than taking the full position immediately.`,
    postpone: `The investment is not wrong, but the timing is early for your current liquidity and savings path. Waiting until your reserves are stronger gives you a cleaner entry.`,
    do_not_proceed: totalObligationGap > 0
      ? `This should be blocked for now because obligation funding gaps total ${totalObligationGap.toLocaleString()} SAR, ${obligationsAtRiskCount} obligations are still at risk, and your portfolio-to-liquid ratio is ${portfolioToLiquidRatio.toFixed(1)}x. ${firstForecastPressure ? `The ${firstForecastPressure.label} forecast is the cash window to protect.` : 'Protecting cash and closing those gaps is the higher-priority move.'}`
      : nearestAtRiskObligation
        ? `This should be blocked for now because your near-term obligation plan is already underfunded. Protecting cash and closing that gap is the higher-priority move.`
      : `This conflicts with your current financial health more than it helps. The opportunity cost and balance-sheet strain are too high relative to the benefit.`,
  };

  return {
    verdict,
    verdictLabel: buildVerdictLabel(verdict, input.locale),
    summary: summaryMap[verdict],
    suggestedAllocation: {
      amount: suggestedAmount,
      percentOfNetWorth: snapshot.netWorth.net > 0 ? Number(((suggestedAmount / snapshot.netWorth.net) * 100).toFixed(2)) : 0,
      percentOfLiquidReserves: snapshot.liquidReserves > 0 ? Number(((suggestedAmount / snapshot.liquidReserves) * 100).toFixed(2)) : 0,
    },
    revisitPlan: {
      month: verdict === 'postpone' ? formatMonth(input.locale, monthsToWait) : null,
      savingsMilestone,
      monthsToWait,
    },
    alternativeSuggestion: alternative,
    dimensions,
    assetClass,
  };
}

function buildSystemPrompt(locale: 'ar' | 'en') {
  return locale === 'ar'
    ? `أنت محرك قرار استثماري داخل منصة Wealix. مهمتك إصدار حكم واضح وصريح على فكرة استثمار واحدة اعتماداً على لقطة مالية حقيقية للمستخدم.

يجب أن تنهي القرار دائماً بأحد الأحكام فقط:
- proceed_now
- proceed_with_caution
- postpone
- do_not_proceed

حلّل الفكرة عبر 8 أبعاد:
portfolio_alignment, net_worth_impact, liquidity_check, goal_alignment, savings_trajectory, risk_profile_match, market_timing_signal, opportunity_cost

قواعد صارمة:
- لا تكن مبهماً أو محايداً
- لا تخرج عن JSON
- استخدم أرقام اللقطة المالية متى أمكن
- إذا كان الأصل سيارة أو أصل استهلاكي متناقص، عامل ذلك كاستنزاف رأسمالي لا كاستثمار حقيقي
- إذا تجاوزت الصفقة 30% من السيولة أو وُجد التزام مهدد خلال 90 يوماً، يجب أن يكون القرار محافظاً جداً وقد يصل إلى do_not_proceed
- إذا كان القرار postpone، اذكر شهراً واضحاً ومرحلة ادخار واضحة
- إذا كان القرار proceed_now أو proceed_with_caution، اقترح حجماً مناسباً للاستثمار

أعد JSON فقط بالشكل:
{
  "verdict": "proceed_now|proceed_with_caution|postpone|do_not_proceed",
  "summary": "string",
  "alternativeSuggestion": "string",
  "suggestedAllocation": {
    "amount": 0,
    "percentOfNetWorth": 0,
    "percentOfLiquidReserves": 0
  },
  "revisitPlan": {
    "month": "string|null",
    "savingsMilestone": 0,
    "monthsToWait": 0
  },
  "dimensions": [
    {
      "key": "portfolio_alignment|net_worth_impact|liquidity_check|goal_alignment|savings_trajectory|risk_profile_match|market_timing_signal|opportunity_cost",
      "title": "string",
      "status": "positive|neutral|warning|negative",
      "score": 0,
      "analysis": "string"
    }
  ]
}`
    : `You are the Investment Decision Engine inside Wealix. Your job is to issue a clear, opinionated judgment on one proposed investment using the user's real financial snapshot.

You must always end with exactly one verdict:
- proceed_now
- proceed_with_caution
- postpone
- do_not_proceed

Evaluate the proposal across these 8 dimensions:
portfolio_alignment, net_worth_impact, liquidity_check, goal_alignment, savings_trajectory, risk_profile_match, market_timing_signal, opportunity_cost

Hard rules:
- never be vague or non-committal
- output JSON only
- cite the actual financial snapshot when possible
- if the asset is a vehicle or other depreciating consumer asset, treat it as capital decay rather than an investment
- if the purchase exceeds 30% of liquid reserves or there is an at-risk obligation within 90 days, be explicitly restrictive and favor blocking or postponing
- if the verdict is postpone, give a specific revisit month and savings milestone
- if the verdict is proceed_now or proceed_with_caution, suggest an appropriate allocation size

Return JSON only in this shape:
{
  "verdict": "proceed_now|proceed_with_caution|postpone|do_not_proceed",
  "summary": "string",
  "alternativeSuggestion": "string",
  "suggestedAllocation": {
    "amount": 0,
    "percentOfNetWorth": 0,
    "percentOfLiquidReserves": 0
  },
  "revisitPlan": {
    "month": "string|null",
    "savingsMilestone": 0,
    "monthsToWait": 0
  },
  "dimensions": [
    {
      "key": "portfolio_alignment|net_worth_impact|liquidity_check|goal_alignment|savings_trajectory|risk_profile_match|market_timing_signal|opportunity_cost",
      "title": "string",
      "status": "positive|neutral|warning|negative",
      "score": 0,
      "analysis": "string"
    }
  ]
}`;
}

function buildUserPrompt(input: InvestmentDecisionInput, snapshot: FinancialSnapshot, fallback: InvestmentDecisionResult, wealixContext?: WealixAIContext) {
  return `Investment under review:
${JSON.stringify({ name: input.name, price: input.price, locale: input.locale }, null, 2)}

Financial snapshot:
${JSON.stringify(snapshot, null, 2)}

Unified WealixAIContext:
${JSON.stringify(wealixContext ?? null, null, 2)}

Deterministic model baseline:
${JSON.stringify(fallback, null, 2)}

Use the deterministic model as a grounding reference, then produce a sharper final decision in the required JSON schema.`;
}

async function callOpenAI(systemPrompt: string, userPrompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_INVESTMENT_DECISION_MODEL || 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    cache: 'no-store',
  });

  const json = await response.json().catch(() => null) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(json?.error?.message || `OpenAI request failed with status ${response.status}`);
  }

  return json?.choices?.[0]?.message?.content ?? null;
}

async function callAnthropic(systemPrompt: string, userPrompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_INVESTMENT_DECISION_MODEL || 'claude-3-5-sonnet-latest',
      max_tokens: 1600,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    cache: 'no-store',
  });

  const json = await response.json().catch(() => null) as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(json?.error?.message || `Anthropic request failed with status ${response.status}`);
  }

  return json?.content?.find((item) => item.type === 'text')?.text ?? null;
}

async function callNvidia(systemPrompt: string, userPrompt: string) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`${(process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.NVIDIA_INVESTMENT_DECISION_MODEL || process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct',
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 1600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    cache: 'no-store',
  });

  const json = await response.json().catch(() => null) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(json?.error?.message || `NVIDIA request failed with status ${response.status}`);
  }

  return json?.choices?.[0]?.message?.content ?? null;
}

function coerceModelResult(
  model: ModelJson | null,
  fallback: InvestmentDecisionResult,
  locale: 'ar' | 'en'
): InvestmentDecisionResult {
  if (!model?.verdict || !model.summary) {
    return fallback;
  }

  const dimensions = Array.isArray(model.dimensions) && model.dimensions.length > 0
    ? model.dimensions.flatMap((item) => {
      if (!item?.key || !item.title || !item.status || typeof item.score !== 'number' || !item.analysis) {
        return [];
      }

      return [{
        key: item.key,
        title: item.title,
        status: item.status,
        score: clamp(item.score, -4, 4),
        analysis: item.analysis,
      }];
    })
    : fallback.dimensions;

  if (dimensions.length !== 8) {
    return fallback;
  }

  return {
    verdict: model.verdict,
    verdictLabel: buildVerdictLabel(model.verdict, locale),
    summary: model.summary,
    alternativeSuggestion: model.alternativeSuggestion || fallback.alternativeSuggestion,
    suggestedAllocation: {
      amount: roundMoney(model.suggestedAllocation?.amount ?? fallback.suggestedAllocation.amount),
      percentOfNetWorth: Number((model.suggestedAllocation?.percentOfNetWorth ?? fallback.suggestedAllocation.percentOfNetWorth).toFixed(2)),
      percentOfLiquidReserves: Number((model.suggestedAllocation?.percentOfLiquidReserves ?? fallback.suggestedAllocation.percentOfLiquidReserves).toFixed(2)),
    },
    revisitPlan: {
      month: model.revisitPlan?.month ?? fallback.revisitPlan.month,
      savingsMilestone: typeof model.revisitPlan?.savingsMilestone === 'number'
        ? roundMoney(model.revisitPlan.savingsMilestone)
        : fallback.revisitPlan.savingsMilestone,
      monthsToWait: Math.max(0, Math.round(model.revisitPlan?.monthsToWait ?? fallback.revisitPlan.monthsToWait)),
    },
    dimensions,
    assetClass: fallback.assetClass,
  };
}

export async function generateInvestmentDecision(
  input: InvestmentDecisionInput,
  snapshot: FinancialSnapshot,
  wealixContext?: WealixAIContext
): Promise<InvestmentDecisionResult> {
  const fallback = buildFallbackDecision(input, snapshot, wealixContext);
  const systemPrompt = buildSystemPrompt(input.locale);
  const userPrompt = buildUserPrompt(input, snapshot, fallback, wealixContext);

  try {
    const content = await callOpenAI(systemPrompt, userPrompt)
      ?? await callAnthropic(systemPrompt, userPrompt)
      ?? await callNvidia(systemPrompt, userPrompt);

    if (!content) {
      return fallback;
    }

    return coerceModelResult(parseJsonObject(content), fallback, input.locale);
  } catch (error) {
    console.error('Investment decision LLM failed, using fallback:', error);
    return fallback;
  }
}
