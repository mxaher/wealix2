// BUG #015 FIX — Renamed from investment-decision; CMA-compliant with disclaimer
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { dbFirst } from '@/lib/db';

const MANDATORY_DISCLAIMER = {
  disclaimer:
    'This analysis is for informational purposes only and does not constitute financial advice, ' +
    'investment advice, or a recommendation to buy, sell, or hold any security. Past performance ' +
    'does not guarantee future results. Please consult a licensed financial advisor before making ' +
    'investment decisions. Wealix is not licensed as an investment advisor under CMA regulations.',
  disclaimerAcknowledgedRequired: true,
};

type UserRow = { clerkId: string; investmentDisclaimerAcceptedAt: string | null };

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await dbFirst<UserRow>(
    'SELECT clerkId, investmentDisclaimerAcceptedAt FROM users WHERE clerkId = ?',
    [userId]
  );

  if (!user?.investmentDisclaimerAcceptedAt) {
    return NextResponse.json(
      { error: 'Investment disclaimer not accepted', ...MANDATORY_DISCLAIMER },
      { status: 403 }
    );
  }

  return NextResponse.json({
    insights: [],
    sectorExposure: {},
    diversificationScore: 0,
    volatilityMetrics: {},
    ...MANDATORY_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  });
}
