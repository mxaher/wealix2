import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildRateLimitHeaders, enforceRateLimit } from '@/lib/rate-limit';
import {
  buildFinancialSnapshotFromClientContext,
  buildFinancialSnapshotFromWorkspace,
  type ClientFinancialContext,
} from '@/lib/financial-snapshot';
import { generateInvestmentDecision } from '@/lib/investment-decision-service';
import { logInvestmentDecision } from '@/lib/investment-decision-log';
import { isRemotePersistenceConfigured, loadRemoteWorkspace } from '@/lib/remote-user-data';
import { requirePaidTier } from '@/lib/server-auth';

const requestSchema = z.object({
  investmentName: z.string().min(2).max(120),
  price: z.number().positive(),
  locale: z.enum(['ar', 'en']).default('en'),
  clientContext: z.object({
    snapshotDate: z.string().optional(),
    currency: z.string().optional(),
    holdings: z.array(z.unknown()).optional(),
    assets: z.array(z.unknown()).optional(),
    liabilities: z.array(z.unknown()).optional(),
    incomeEntries: z.array(z.unknown()).optional(),
    expenseEntries: z.array(z.unknown()).optional(),
    budgetLimits: z.array(z.object({
      category: z.string(),
      limit: z.number(),
    })).optional(),
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

    const { investmentName, price, locale, clientContext } = parsed.data;
    const typedClientContext = (clientContext ?? {}) as ClientFinancialContext;

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

    let snapshot;
    if (authResult.userId && isRemotePersistenceConfigured()) {
      const remote = await loadRemoteWorkspace(authResult.userId);
      snapshot = remote.workspace
        ? buildFinancialSnapshotFromWorkspace(remote.workspace)
        : buildFinancialSnapshotFromClientContext(typedClientContext);
    } else {
      snapshot = buildFinancialSnapshotFromClientContext(typedClientContext);
    }

    const decision = await generateInvestmentDecision({
      name: investmentName,
      price,
      locale,
    }, snapshot);

    await logInvestmentDecision({
      clerkUserId: authResult.userId!,
      investmentName,
      investmentType: decision.assetClass,
      price,
      payloadJson: JSON.stringify({ investmentName, price, snapshot }),
      decisionJson: JSON.stringify(decision),
    });

    return NextResponse.json(
      {
        investmentName,
        price,
        snapshot,
        decision,
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
