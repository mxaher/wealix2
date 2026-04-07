import { auth, clerkClient } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import {
  getBillingState,
  normalizePlanTier,
  type BillingMetadata,
  type BillingState,
  type PlanTier,
} from '@/lib/billing-state';
import { getE2ETestUser, isE2ECookieStoreAuthenticated } from '@/lib/e2e-auth';

const TIER_RANK: Record<PlanTier, number> = {
  none: 0,
  core: 1,
  pro: 2,
};

function extractBillingMetadata(user: {
  publicMetadata?: Record<string, unknown>;
  privateMetadata?: Record<string, unknown>;
}): BillingMetadata {
  return {
    plan: user.publicMetadata?.plan ?? user.privateMetadata?.plan,
    subscriptionTier: user.publicMetadata?.subscriptionTier ?? user.privateMetadata?.subscriptionTier,
    subscriptionStatus: user.publicMetadata?.subscriptionStatus ?? user.privateMetadata?.subscriptionStatus,
    trialActive: user.publicMetadata?.trialActive ?? user.privateMetadata?.trialActive,
    trialStatus: user.publicMetadata?.trialStatus ?? user.privateMetadata?.trialStatus,
    trialPlan: user.publicMetadata?.trialPlan ?? user.privateMetadata?.trialPlan,
    trialEnd: user.publicMetadata?.trialEnd ?? user.privateMetadata?.trialEnd,
    trialEndsAt: user.publicMetadata?.trialEndsAt ?? user.privateMetadata?.trialEndsAt,
    paymentAdded: user.publicMetadata?.paymentAdded ?? user.privateMetadata?.paymentAdded,
    stripeCustomerId: user.publicMetadata?.stripeCustomerId ?? user.privateMetadata?.stripeCustomerId,
    stripeSubscriptionId:
      user.publicMetadata?.stripeSubscriptionId ?? user.privateMetadata?.stripeSubscriptionId,
  };
}

export function getEffectiveTierFromMetadata(metadata: BillingMetadata): PlanTier {
  const state = getBillingState(metadata);
  return state.hasStandardAccess ? state.selectedPlan : 'none';
}

export async function requireAuthenticatedUser() {
  const cookieStore = await cookies();
  if (isE2ECookieStoreAuthenticated(cookieStore)) {
    return {
      userId: getE2ETestUser().id,
      error: null,
    };
  }

  const { userId } = await auth();

  if (!userId) {
    return {
      userId: null,
      error: Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }),
    };
  }

  return { userId, error: null };
}

export async function getUserBillingState(userId: string): Promise<BillingState> {
  const e2eUser = getE2ETestUser();
  if (userId === e2eUser.id) {
    return getBillingState(e2eUser.publicMetadata);
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return getBillingState(extractBillingMetadata(user));
}

export async function getUserSubscriptionTier(userId: string): Promise<PlanTier> {
  const state = await getUserBillingState(userId);
  return state.hasStandardAccess ? state.selectedPlan : 'none';
}

export async function requireTier(requiredTier: 'core' | 'pro') {
  const authResult = await requireAuthenticatedUser();
  if (authResult.error || !authResult.userId) {
    return {
      userId: null,
      tier: 'none' as const,
      billingState: null,
      error: authResult.error,
    };
  }

  const state = await getUserBillingState(authResult.userId);
  const tier = state.hasStandardAccess ? state.selectedPlan : 'none';
  if (TIER_RANK[tier] < TIER_RANK[requiredTier]) {
    return {
      userId: authResult.userId,
      tier,
      billingState: state,
      error: Response.json(
        {
          error: `${requiredTier === 'pro' ? 'Pro' : 'Core'} access required`,
          code: 'TIER_REQUIRED',
          requiredTier,
          currentTier: tier,
        },
        { status: 403 }
      ),
    };
  }

  return {
    userId: authResult.userId,
    tier,
    billingState: state,
    error: null,
  };
}

export async function requirePaidTier(requiredTier: 'core' | 'pro') {
  const authResult = await requireAuthenticatedUser();
  if (authResult.error || !authResult.userId) {
    return {
      userId: null,
      tier: 'none' as const,
      billingState: null,
      error: authResult.error,
    };
  }

  const state = await getUserBillingState(authResult.userId);
  const tier = state.hasPaidAccess ? state.selectedPlan : 'none';

  if (TIER_RANK[tier] < TIER_RANK[requiredTier]) {
    return {
      userId: authResult.userId,
      tier,
      billingState: state,
      error: Response.json(
        {
          error: `${requiredTier === 'pro' ? 'Pro' : 'Core'} payment required`,
          code: 'PAYMENT_REQUIRED',
          requiredTier,
          currentTier: normalizePlanTier(state.selectedPlan),
          paymentAdded: state.paymentAdded,
          trialActive: state.trialActive,
        },
        { status: 402 }
      ),
    };
  }

  return {
    userId: authResult.userId,
    tier,
    billingState: state,
    error: null,
  };
}

export async function requireProUser() {
  const result = await requirePaidTier('pro');
  if (result.error) {
    return {
      ...result,
      error: Response.json(
        {
          error: 'Pro payment required',
          code: 'PRO_PAYMENT_REQUIRED',
          currentTier: result.tier,
        },
        { status: 402 }
      ),
    };
  }

  return result;
}
