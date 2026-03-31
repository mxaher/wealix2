import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getBillingState } from '@/lib/billing-state';
import { requireAuthenticatedUser } from '@/lib/server-auth';

const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser();
    if (!authResult.userId) {
      return authResult.error ?? NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { plan?: string };
    const chosenPlan: 'core' | 'pro' = body.plan === 'core' ? 'core' : 'pro';

    const client = await clerkClient();
    const user = await client.users.getUser(authResult.userId);
    const metadata = getBillingState(user.publicMetadata as Record<string, unknown> | undefined);

    if (metadata.hasStandardAccess) {
      return NextResponse.json({
        effectiveTier: metadata.selectedPlan,
        trialActive: metadata.trialActive,
        trialEnd: metadata.trialEndsAt,
        paymentAdded: metadata.paymentAdded,
        initialized: false,
      });
    }

    const currentTrialStatus =
      user.publicMetadata?.trialStatus ?? user.privateMetadata?.trialStatus;

    if (currentTrialStatus === 'expired') {
      return NextResponse.json(
        {
          error: 'Trial already used. Add payment to continue with your selected plan.',
          code: 'TRIAL_ALREADY_USED',
          effectiveTier: 'none',
        },
        { status: 409 }
      );
    }

    const trialEnd = new Date(Date.now() + TRIAL_DURATION_MS).toISOString();

    await client.users.updateUserMetadata(authResult.userId, {
      publicMetadata: {
        ...user.publicMetadata,
        plan: chosenPlan,
        subscriptionTier: chosenPlan,
        subscriptionStatus: 'trialing',
        trialActive: true,
        trialStatus: 'active',
        trialPlan: chosenPlan,
        trialEnd,
        trialEndsAt: trialEnd,
        paymentAdded: false,
      },
    });

    return NextResponse.json({
      effectiveTier: chosenPlan,
      trialActive: true,
      trialEnd,
      paymentAdded: false,
      initialized: true,
    });
  } catch (error) {
    console.error('[billing/trial] failed', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to initialize trial.',
        code: 'TRIAL_INIT_FAILED',
      },
      { status: 500 }
    );
  }
}
