import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildRateLimitHeaders, enforceRateLimit } from '@/lib/rate-limit';
import {
  buildFinancialSnapshotFromClientContext,
  buildFinancialSnapshotFromWorkspace,
  type ClientFinancialContext,
  getDecisionCheckContext,
  hasCompleteFinancialContext,
} from '@/lib/financial-snapshot';
import { generateInvestmentDecision } from '@/lib/investment-decision-service';
import { logInvestmentDecision } from '@/lib/investment-decision-log';
import { isRemotePersistenceConfigured, loadRemoteWorkspace, type RemoteUserWorkspace } from '@/lib/remote-user-data';
import { requirePaidTier } from '@/lib/server-auth';
import { buildWealixAIContext, buildWealixAIContextFromClientContext } from '@/lib/wealix-ai-context';

const requestSchema = z.object({
  ticker: z.string().min(1).max(120),
  action: z.enum(['BUY', 'SELL', 'HOLD']).default('BUY'),
  amount: z.number().positive().optional(),
  locale: z.enum(['ar', 'en']).default('en'),
  clientContext: z.object({
    version: z.union([z.number(), z.string()]).optional(),
    workspace: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});

const DAILY_LIMIT = 10;
const WEEKLY_LIMIT = 40;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function buildLimitMessage(locale: 'ar' | 'en', scope: 'daily' | 'weekly', resetAt: number) {
  const hoursRemaining = Math.max(1, Math.ceil((resetAt - Date.now()) / (60 * 60 * 1000)));

  if (locale === 'ar') {
    return scope === 'daily'
      ? `وصلت إلى الحد اليومي لفحص قرار الاستثمار. انتظر حوالي ${hoursRemaining} ساعة ثم حاول مرة أخرى.`
      : `وصلت إلى الحد الأسبوعي لفحص قرار الاستثمار. جرّب مرة أخرى بعد حوالي ${hoursRemaining} ساعة.`;
  }

  return scope === 'daily'
    ? `You have reached today's investment decision limit. Please wait about ${hoursRemaining} hours and try again.`
    : `You have reached this week's investment decision limit. Please try again in about ${hoursRemaining} hours.`;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePaidTier('pro');
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid investment decision payload.', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const { ticker, action, amount, locale, clientContext } = parsed.data;
    const typedClientContext = (clientContext?.workspace ?? {}) as ClientFinancialContext;

    const dailyLimit = await enforceRateLimit(`investment-decision:daily:${authResult.userId}`, DAILY_LIMIT, DAY_MS);
    if (!dailyLimit.allowed) {
      return NextResponse.json(
        {
          error: buildLimitMessage(locale, 'daily', dailyLimit.resetAt),
          code: 'DAILY_LIMIT_REACHED',
          resetAt: dailyLimit.resetAt,
        },
        { status: 429, headers: buildRateLimitHeaders(dailyLimit) }
      );
    }

    const weeklyLimit = await enforceRateLimit(`investment-decision:weekly:${authResult.userId}`, WEEKLY_LIMIT, WEEK_MS);
    if (!weeklyLimit.allowed) {
      return NextResponse.json(
        {
          error: buildLimitMessage(locale, 'weekly', weeklyLimit.resetAt),
          code: 'WEEKLY_LIMIT_REACHED',
          resetAt: weeklyLimit.resetAt,
        },
        { status: 429, headers: buildRateLimitHeaders(weeklyLimit) }
      );
    }

    const completeClientWorkspace = hasCompleteFinancialContext(typedClientContext)
      ? typedClientContext as ClientFinancialContext
      : null;
    let resolvedWorkspace: RemoteUserWorkspace | null = null;

    if (authResult.userId && isRemotePersistenceConfigured()) {
      const remote = await loadRemoteWorkspace(authResult.userId);
      if (remote.workspace) {
        resolvedWorkspace = completeClientWorkspace
          ? { ...remote.workspace, ...(completeClientWorkspace as unknown as RemoteUserWorkspace) }
          : remote.workspace;
      }
    }

    const snapshot = resolvedWorkspace
      ? buildFinancialSnapshotFromWorkspace(resolvedWorkspace)
      : buildFinancialSnapshotFromClientContext(completeClientWorkspace ?? typedClientContext);
    const wealixContext = resolvedWorkspace
      ? buildWealixAIContext(authResult.userId!, resolvedWorkspace)
      : buildWealixAIContextFromClientContext(authResult.userId ?? 'guest', completeClientWorkspace ?? typedClientContext);
    const decisionContext = getDecisionCheckContext(snapshot);

    const decision = await generateInvestmentDecision({
      name: ticker,
      price: amount ?? 0,
      locale,
    }, snapshot, wealixContext);

    await logInvestmentDecision({
      clerkUserId: authResult.userId!,
      investmentName: ticker,
      investmentType: decision.assetClass,
      price: amount ?? 0,
      payloadJson: JSON.stringify({ ticker, action, amount: amount ?? 0, decisionContext }),
      decisionJson: JSON.stringify(decision),
    });

    // Bug #015 fix: mandatory regulatory disclaimer on every response.
    // Under Saudi CMA regulations, automated analysis tools must not be mistaken
    // for licensed investment advice. This disclaimer is non-negotiable and must
    // be surfaced in the UI before the user acts on any decision output.
    const disclaimer =
      locale === 'ar'
        ? 'هذه المعلومات لأغراض تحليلية فقط وليست توصية استثمارية. الأداء السابق لا يضمن النتائج المستقبلية. استشر مستشارًا ماليًا مرخصًا قبل اتخاذ أي قرار استثماري.'
        : 'This output is for informational and analytical purposes only and does not constitute investment advice. Past performance does not guarantee future results. Consult a licensed financial advisor before making any investment decision.';

    return NextResponse.json(
      {
        investmentName: ticker,
        price: amount ?? 0,
        snapshot,
        decisionContext,
        decision,
        disclaimer,
      },
      {
        headers: buildRateLimitHeaders({
          remaining: Math.min(dailyLimit.remaining, weeklyLimit.remaining),
          resetAt: Math.min(dailyLimit.resetAt, weeklyLimit.resetAt),
        }),
      }
    );
  } catch (error) {
    console.error('Investment decision error:', error);
    return NextResponse.json(
      { error: 'Failed to generate investment decision.', code: 'INVESTMENT_DECISION_FAILED' },
      { status: 500 }
    );
  }
}
