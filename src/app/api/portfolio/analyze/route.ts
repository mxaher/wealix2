import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

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
      });
    }

    const holdingsPayload = holdings.map((holding) => ({
      ...holding,
      marketValue: Number((holding.shares * holding.currentPrice).toFixed(2)),
      gainLossPct: Number((((holding.currentPrice - holding.avgCost) / holding.avgCost) * 100).toFixed(2)),
    }));

    const prompt = `You are a CFA-level portfolio strategist specializing in Saudi, MENA, and global equity portfolio reviews.

Analyze the portfolio holdings below and produce:
1. A concise executive summary.
2. 4 to 6 highly actionable recommendations.

Rules:
- Base your reasoning on concentration risk, sector diversification, regional diversification, unrealized gains/losses, and Shariah mix where relevant.
- Each recommendation must be one of: buy_more, hold, trim, reduce, new_idea.
- Be direct and practical, not generic.
- Suggest specific new stocks only when diversification genuinely needs improvement.
- Avoid boilerplate disclaimers.
- Return JSON only in this format:
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

Respond in ${locale === 'ar' ? 'Arabic' : 'English'}.

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
      return Response.json(fallbackAnalysis(holdings, locale));
    }

    return Response.json({
      summary: parsed.summary,
      actions: parsed.actions.slice(0, 6),
    });
  } catch (error) {
    console.error('Portfolio analysis error:', error);
    return Response.json({ error: 'Failed to analyze portfolio.' }, { status: 500 });
  }
}
