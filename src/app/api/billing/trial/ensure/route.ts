import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getEffectiveTierFromMetadata, requireAuthenticatedUser } from '@/lib/server-auth';

const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

type TrialPlan = 'core' | 'pro';

function normalizeRequestedTier(value: unknown): TrialPlan {
  return value === 'core' ? 'core' : 'pro';
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.userId) {
    return authResult.error ?? NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(authResult.userId);
  const body = await request.json().catch(() => ({}));
  const requestedTier = normalizeRequestedTier(body?.requestedTier);

  const metadata = {
    subscriptionTier: user.publicMetadata?.subscriptionTier ?? user.privateMetadata?.subscriptionTier,
    trialStatus: user.publicMetadata?.trialStatus ?? user.privateMetadata?.trialStatus,
    trialPlan: user.publicMetadata?.trialPlan ?? user.privateMetadata?.trialPlan,
    trialEndsAt: user.publicMetadata?.trialEndsAt ?? user.privateMetadata?.trialEndsAt,
  };

  const effectiveTier = getEffectiveTierFromMetadata(metadata);
  const isPaidTier = metadata.subscriptionTier === 'core' || metadata.subscriptionTier === 'pro';

  if (isPaidTier || effectiveTier !== 'free') {
    return NextResponse.json({
      effectiveTier,
      trialStatus: metadata.trialStatus ?? null,
      trialPlan: metadata.trialPlan ?? null,
      trialEndsAt: metadata.trialEndsAt ?? null,
      initialized: false,
    });
  }

  if (metadata.trialStatus === 'expired') {
    return NextResponse.json(
      {
        error: 'Trial already used',
        code: 'TRIAL_ALREADY_USED',
        effectiveTier: 'free',
      },
      { status: 409 }
    );
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_MS).toISOString();

  await client.users.updateUserMetadata(authResult.userId, {
    publicMetadata: {
      ...user.publicMetadata,
      subscriptionTier: isPaidTier ? metadata.subscriptionTier : 'free',
      trialStatus: 'active',
      trialPlan: requestedTier,
      trialEndsAt,
    },
  });

  return NextResponse.json({
    effectiveTier: requestedTier,
    trialStatus: 'active',
    trialPlan: requestedTier,
    trialEndsAt,
    initialized: true,
  });
}
