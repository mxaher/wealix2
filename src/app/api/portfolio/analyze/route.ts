import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { buildRateLimitHeaders, enforceRateLimit } from '@/lib/rate-limit';
import { requireTier } from '@/lib/server-auth';

type Holding = {
  ticker: string;
  name: string;
  exchange: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  sector: string;
  isShariah: boolean;
};

function parseJsonObject(content: string): Record<string, unknown> | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function fallbackAnalysis(holdings: Holding[], locale: 'ar' | 'en') {
  const total = holdings.reduce((sum, holding) => sum + holding.shares * holding.currentPrice, 0);
  const ranked = holdings
    .map((holding) => ({
      ...holding,
      value: holding.shares * holding.currentPrice,
      weight: total > 0 ? ((holding.shares * holding.currentPrice) / total) * 100 : 0,
      returnPct: ((holding.currentPrice - holding.avgCost) / holding.avgCost) * 100,
    }))
    .sort((a, b) => b.weight - a.weight);

  return {
    summary:
      locale === 'ar'
        ? `تحليل بديل لـ ${holdings.length} مراكز. التركيز الأكبر حالياً على ${ranked[0]?.ticker ?? 'المحفظة'} مع حاجة لمراجعة التنويع والتركيز.`
        : `Fallback review for ${holdings.length} holdings. The portfolio is currently most concentrated in ${ranked[0]?.ticker ?? 'its top position'} and should be reviewed for diversification and concentration risk.`,
    actions: ranked.slice(0, 3).map((holding, index) => ({
      type: index === 0 ? 'review' : holding.returnPct > 0 ? 'hold' : 'trim',
      title:
        locale === 'ar'
          ? `مراجعة ${holding.ticker}`
          : `Review ${holding.ticker}`,
      description:
        locale === 'ar'
          ? `${holding.ticker} يمثل ${holding.weight.toFixed(1)}% من المحفظة بعائد غير محقق ${holding.returnPct.toFixed(1)}%.`
          : `${holding.ticker} is ${holding.weight.toFixed(1)}% of the portfolio with an unrealized return of ${holding.returnPct.toFixed(1)}%.`,
    })),
  };
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireTier('pro');
    if (authResult.error) {
      return authResult.error;
    }

    const rateLimit = enforceRateLimit(`portfolio-analyze:${authResult.userId}`, 20, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const holdings = Array.isArray(body.holdings) ? body.holdings as Holding[] : [];
    const locale = body.locale === 'ar' ? 'ar' : 'en';

    if (holdings.length === 0) {
      return Response.json({
        summary:
          locale === 'ar'
            ? 'المحفظة فارغة حالياً. أضف أو استورد مراكز أولاً.'
            : 'The portfolio is currently empty. Add or import holdings first.',
        actions: [],
      }, { headers: buildRateLimitHeaders(rateLimit) });
    }

    const holdingsPayload = holdings.map((holding) => ({
      ...holding,
      marketValue: Number((holding.shares * holding.currentPrice).toFixed(2)),
      gainLossPct: Number((((holding.currentPrice - holding.avgCost) / holding.avgCost) * 100).toFixed(2)),
    }));

    const prompt = `You are a senior CFA charterholder and institutional portfolio strategist specializing in Saudi, GCC, MENA, and US listed equities.

Your job is to deliver a sharp portfolio review that reads like a professional buy-side memo, not a generic chatbot response.

Analyze the holdings below and assess:
- concentration risk by single name
- sector concentration
- geographic and exchange diversification
- unrealized gain/loss positioning
- portfolio quality and balance
- Shariah mix where relevant

Decision rules:
- Use "trim" when a winner or overweight position is too large.
- Use "reduce" when risk/reward or portfolio fit is weak.
- Use "buy_more" only for positions that look constructive and not already oversized.
- Use "hold" for positions that are acceptable but not urgent.
- Use "new_idea" for complementary additions that improve diversification or quality.
- Recommendations must be specific, opinionated, and tied to the actual holdings.
- Include clear rationale like concentration, sector skew, missing defensive exposure, overexposure to cyclicals, or weak diversification.
- Suggest at most 2 new ideas and only if they genuinely improve the mix.
- Avoid vague language and avoid boilerplate compliance disclaimers.

Return JSON only in this exact format:
{
  "summary": "string",
  "actions": [
    {
      "type": "buy_more|hold|trim|reduce|new_idea",
      "title": "string",
      "description": "string"
    }
  ]
}

Style requirements:
- Write like a concise investment committee note.
- Mention concrete holdings or sectors in every recommendation.
- Prefer 5 to 6 actions.
- Respond fully in ${locale === 'ar' ? 'Arabic' : 'English'}.

Portfolio:
${JSON.stringify(holdingsPayload, null, 2)}`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'system', content: prompt }],
      thinking: { type: 'enabled' },
    });

    const content = completion.choices[0]?.message?.content || '';
    const parsed = parseJsonObject(content);

    if (!parsed || typeof parsed.summary !== 'string' || !Array.isArray(parsed.actions)) {
      return Response.json(fallbackAnalysis(holdings, locale), { headers: buildRateLimitHeaders(rateLimit) });
    }

    return Response.json({
      summary: parsed.summary,
      actions: parsed.actions.slice(0, 6),
    }, { headers: buildRateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('Portfolio analysis error:', error);
    return Response.json({ error: 'Failed to analyze portfolio.' }, { status: 500 });
  }
}
