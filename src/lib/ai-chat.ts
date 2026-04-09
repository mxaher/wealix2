export type AdvisorUserProfile = {
  name?: string | null;
  locale?: string | null;
  currency?: string | null;
  monthlyIncome?: number | null;
  riskTolerance?: string | null;
  preferredMarkets?: string[] | null;
  retirementGoal?: string | null;
  currentAge?: number | null;
  retirementAge?: number | null;
};

const RISK_DESCRIPTIONS: Record<string, string> = {
  conservative: 'prefers capital preservation, low volatility, avoids speculative positions',
  moderate: 'balances growth and safety, accepts measured volatility for reasonable returns',
  aggressive: 'prioritizes growth, comfortable with high volatility and concentrated bets',
};

const GOAL_DESCRIPTIONS: Record<string, string> = {
  early_retirement: 'achieve financial independence and retire before conventional age',
  comfortable_retirement: 'build sufficient wealth for a comfortable retirement at a standard age',
  legacy: 'accumulate generational wealth to pass on to heirs',
  financial_freedom: 'generate passive income that covers living expenses, full work optionality',
};

function buildProfileBlock(profile: AdvisorUserProfile): string {
  const lines: string[] = ['## USER PROFILE'];

  if (profile.name) lines.push(`- Name: ${profile.name}`);
  if (profile.locale) lines.push(`- Language: ${profile.locale}`);
  if (profile.currency) lines.push(`- Currency: ${profile.currency}`);
  if (profile.monthlyIncome != null && profile.monthlyIncome > 0) {
    lines.push(`- Monthly Income: ${profile.monthlyIncome.toLocaleString('en-US')} ${profile.currency ?? 'SAR'}`);
  }
  if (profile.riskTolerance) {
    const desc = RISK_DESCRIPTIONS[profile.riskTolerance] ?? profile.riskTolerance;
    lines.push(`- Risk Tolerance: ${profile.riskTolerance} — ${desc}`);
  }
  if (profile.preferredMarkets && profile.preferredMarkets.length > 0) {
    lines.push(`- Preferred Markets: ${profile.preferredMarkets.join(', ')}`);
  }
  if (profile.retirementGoal) {
    const desc = GOAL_DESCRIPTIONS[profile.retirementGoal] ?? profile.retirementGoal;
    lines.push(`- Financial Goal: ${profile.retirementGoal} — ${desc}`);
  }
  if (profile.currentAge != null && profile.retirementAge != null) {
    const yearsLeft = Math.max(0, profile.retirementAge - profile.currentAge);
    lines.push(`- Time Horizon: age ${profile.currentAge} → target retirement at ${profile.retirementAge}, ${yearsLeft} year${yearsLeft !== 1 ? 's' : ''} remaining`);
  }

  const filledFields = lines.length - 1;
  if (filledFields < 3) {
    lines.push('- Note: incomplete profile — recommendation specificity is reduced until more profile fields are provided.');
  }

  lines.push('');
  lines.push('Always apply the above profile when generating recommendations. Align all portfolio suggestions, savings rate targets, and market insights to this user\'s risk tolerance and preferred markets. If the user asks something that contradicts their risk profile, acknowledge the conflict explicitly before answering. Frame all outputs as analytical decision support, not regulated financial advice.');

  return lines.join('\n');
}

export function buildAdvisorSystemPromptWithProfile(
  existingSystemPrompt: string,
  profile: AdvisorUserProfile | null | undefined
): string {
  if (!profile) return existingSystemPrompt;
  return `${buildProfileBlock(profile)}\n\n---\n\n${existingSystemPrompt}`;
}

export type AdvisorUserContext = {
  snapshotDate?: string;
  currency?: string;
  netWorth?: number;
  portfolioValue?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  monthlySavings?: number;
  savingsRate?: number;
  fireGoal?: number;
  fireProgress?: number;
  holdings?: Array<{
    ticker?: string;
    name?: string;
    sector?: string;
    exchange?: string;
    shares?: number;
    avgCost?: number;
    currentPrice?: number;
    totalValue?: number;
    profitLossPercent?: number;
    isShariah?: boolean;
  }>;
  assets?: unknown[];
  liabilities?: unknown[];
  budgetLimits?: unknown[];
  expenseEntries?: unknown[];
  incomeEntries?: unknown[];
  receiptScans?: unknown[];
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function formatSarAmount(value: number | undefined, locale: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function isValidMessageArray(value: unknown): value is Array<{ role: string; content: string }> {
  return Array.isArray(value) && value.every((message) => (
    message &&
    typeof message === 'object' &&
    typeof (message as { role?: unknown }).role === 'string' &&
    typeof (message as { content?: unknown }).content === 'string'
  ));
}

export function capConversationHistory<T>(messages: T[]) {
  return messages.slice(-50);
}

export function generateFallbackAdvisorResponse(params: {
  locale: string;
  userContext?: AdvisorUserContext;
  messages: ChatMessage[];
}) {
  const { locale, userContext, messages } = params;
  const isArabic = locale === 'ar';
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === 'user')?.content.toLowerCase() ?? '';
  const holdings = Array.isArray(userContext?.holdings) ? userContext.holdings : [];
  const portfolioValue =
    typeof userContext?.portfolioValue === 'number'
      ? userContext.portfolioValue
      : holdings.reduce((sum, holding) => sum + (holding.totalValue ?? 0), 0);
  const topHoldings = [...holdings]
    .filter((holding) => typeof holding.totalValue === 'number' && Number.isFinite(holding.totalValue))
    .sort((left, right) => (right.totalValue ?? 0) - (left.totalValue ?? 0))
    .slice(0, 3);
  const concentrationLines = topHoldings.map((holding) => {
    const weight = portfolioValue > 0 ? (((holding.totalValue ?? 0) / portfolioValue) * 100) : 0;
    const shariahLabel = holding.isShariah
      ? (isArabic ? '، متوافق شرعياً' : ', Shariah-compliant')
      : '';
    return isArabic
      ? `- ${holding.ticker || holding.name || 'Holding'} يشكل ${weight.toFixed(1)}% من المحفظة${shariahLabel}`
      : `- ${holding.ticker || holding.name || 'Holding'} is ${weight.toFixed(1)}% of the portfolio${shariahLabel}`;
  });
  const highestConcentration = topHoldings[0] && portfolioValue > 0
    ? ((topHoldings[0].totalValue ?? 0) / portfolioValue) * 100
    : 0;
  const savingsRate = typeof userContext?.savingsRate === 'number' ? userContext.savingsRate : null;
  const netWorth = formatSarAmount(userContext?.netWorth, locale);
  const monthlySavings = formatSarAmount(userContext?.monthlySavings, locale);

  const wantsRebalance =
    /rebalance|portfolio|holding|allocation|محفظ|توازن|توزيع/.test(latestUserMessage);

  if (isArabic) {
    const lines = [
      `بناءً على بياناتك الحالية في Wealix${netWorth ? `، صافي ثروتك حوالي ${netWorth}` : ''}${monthlySavings ? ` وادخارك الشهري حوالي ${monthlySavings}` : ''}.`,
    ];

    if (wantsRebalance && topHoldings.length > 0) {
      lines.push('');
      lines.push('أولوية إعادة التوازن الآن:');
      lines.push(...concentrationLines);
      lines.push('');
      lines.push(
        highestConcentration >= 35
          ? `التركيز الأعلى يبدو مرتفعاً. إذا كان ${topHoldings[0]?.ticker || topHoldings[0]?.name} يتجاوز 35% من المحفظة، فابدأ بتخفيفه تدريجياً وتحويل جزء منه إلى مراكز أو قطاعات أقل تمركزاً.`
          : 'التمركز لا يبدو مفرطاً جداً، لذلك ركز أكثر على ضبط التوزيع بين القطاعات والاحتفاظ بنسبة سيولة مناسبة.'
      );
      lines.push(
        'استهدف وجود 3 إلى 6 أشهر من المصروفات الأساسية كسيولة أو أدوات منخفضة المخاطر قبل زيادة التعرض للأسهم عالية التذبذب.'
      );
    } else if (topHoldings.length === 0) {
      lines.push('');
      lines.push('لا توجد مراكز استثمارية كافية في البيانات الحالية لإعطاء اقتراح إعادة توازن دقيق.');
    }

    if (savingsRate !== null) {
      lines.push('');
      lines.push(
        savingsRate >= 20
          ? `معدل الادخار الحالي ${savingsRate.toFixed(1)}% وهو جيد.`
          : `معدل الادخار الحالي ${savingsRate.toFixed(1)}% ويستحق التحسين إذا كان هدفك تسريع التراكم أو FIRE.`
      );
    }

    lines.push('');
    lines.push('هذه إجابة احتياطية محلية لأن خدمة التحليل المتقدم غير متاحة حالياً.');
    return lines.join('\n');
  }

  const lines = [
    `Based on your current Wealix data${netWorth ? `, your net worth is about ${netWorth}` : ''}${monthlySavings ? ` and monthly savings are about ${monthlySavings}` : ''}.`,
  ];

  if (wantsRebalance && topHoldings.length > 0) {
    lines.push('');
    lines.push('Rebalancing priorities right now:');
    lines.push(...concentrationLines);
    lines.push('');
    lines.push(
      highestConcentration >= 35
        ? `Your top position looks concentrated. If ${topHoldings[0]?.ticker || topHoldings[0]?.name} is above 35% of the portfolio, start by trimming it gradually and reallocating into less concentrated positions or sectors.`
        : 'Your concentration does not look extreme, so the bigger opportunity is balancing sector exposure and keeping an appropriate cash buffer.'
    );
    lines.push(
      'Keep roughly 3 to 6 months of core expenses in cash or low-volatility holdings before increasing risk exposure.'
    );
  } else if (topHoldings.length === 0) {
    lines.push('');
    lines.push('There are not enough portfolio holdings in the current data to give a precise rebalance call.');
  }

  if (savingsRate !== null) {
    lines.push('');
    lines.push(
      savingsRate >= 20
        ? `Your current savings rate is ${savingsRate.toFixed(1)}%, which is a healthy base.`
        : `Your current savings rate is ${savingsRate.toFixed(1)}%, which is worth improving if your goal is faster wealth accumulation or FIRE progress.`
    );
  }

  lines.push('');
  lines.push('This is a local fallback response because the advanced AI service is temporarily unavailable right now.');
  return lines.join('\n');
}
