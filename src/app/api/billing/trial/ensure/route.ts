import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getEffectiveTierFromMetadata, requireAuthenticatedUser } from '@/lib/server-auth';

const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.userId) {
    return authResult.error ?? NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  // Accept optional plan from request body (defaults to 'pro')
  const body = await request.json().catch(() => ({})) as { plan?: string };
  const chosenPlan: 'core' | 'pro' = body.plan === 'core' ? 'core' : 'pro';

  const client = await clerkClient();
  const user = await client.users.getUser(authResult.userId);

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

  // Idempotency guard: if the trial is already active, return the existing state
  // without writing again — prevents double-activation from concurrent requests.
  if (metadata.trialStatus === 'active' && metadata.trialEndsAt) {
    return NextResponse.json({
      effectiveTier: metadata.trialPlan ?? chosenPlan,
      trialStatus: 'active',
      trialPlan: metadata.trialPlan ?? chosenPlan,
      trialEndsAt: metadata.trialEndsAt,
      initialized: false,
    });
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_MS).toISOString();

  await client.users.updateUserMetadata(authResult.userId, {
    publicMetadata: {
      ...user.publicMetadata,
      subscriptionTier: isPaidTier ? metadata.subscriptionTier : 'free',
      trialStatus: 'active',
      trialPlan: chosenPlan,
      trialEndsAt,
    },
  });

  // Re-read after write to confirm our activation took effect (concurrent-request safety)
  const confirmedUser = await client.users.getUser(authResult.userId);
  const confirmedEndsAt =
    (confirmedUser.publicMetadata?.trialEndsAt ?? confirmedUser.privateMetadata?.trialEndsAt) as string | undefined;

  return NextResponse.json({
    effectiveTier: chosenPlan,
    trialStatus: 'active',
    trialPlan: chosenPlan,
    trialEndsAt: confirmedEndsAt ?? trialEndsAt,
    initialized: true,
  });
}
