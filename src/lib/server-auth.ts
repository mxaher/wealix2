import { auth, clerkClient } from '@clerk/nextjs/server';
import type { SubscriptionTier } from '@/store/useAppStore';

type TrialMetadata = {
  subscriptionTier?: unknown;
  trialStatus?: unknown;
  trialPlan?: unknown;
  trialEndsAt?: unknown;
};

const TIER_RANK: Record<SubscriptionTier, number> = {
  none: 0,
  core: 1,
  pro: 2,
};

function normalizeTier(value: unknown): SubscriptionTier {
  return value === 'core' || value === 'pro' ? value : 'none';
}

function getTrialTier(metadata: TrialMetadata): SubscriptionTier {
  const trialStatus = metadata.trialStatus;
  const trialPlan = metadata.trialPlan;
  const trialEndsAt = metadata.trialEndsAt;

  if (trialStatus !== 'active') {
    return 'none';
  }

  if (trialPlan !== 'core' && trialPlan !== 'pro') {
    return 'none';
  }

  if (typeof trialEndsAt !== 'string') {
    return 'none';
  }

  const endsAt = new Date(trialEndsAt).getTime();
  if (!Number.isFinite(endsAt) || endsAt <= Date.now()) {
    return 'none';
  }

  return trialPlan;
}

export function getEffectiveTierFromMetadata(metadata: TrialMetadata): SubscriptionTier {
  const subscriptionTier = normalizeTier(metadata.subscriptionTier);
  if (subscriptionTier !== 'none') {
    return subscriptionTier;
  }

  return getTrialTier(metadata);
}

export async function requireAuthenticatedUser() {
  const { userId } = await auth();

  if (!userId) {
    return {
      userId: null,
      error: Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }),
    };
  }

  return { userId, error: null };
}

export async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return getEffectiveTierFromMetadata({
    subscriptionTier: user.publicMetadata?.subscriptionTier ?? user.privateMetadata?.subscriptionTier,
    trialStatus: user.publicMetadata?.trialStatus ?? user.privateMetadata?.trialStatus,
    trialPlan: user.publicMetadata?.trialPlan ?? user.privateMetadata?.trialPlan,
    trialEndsAt: user.publicMetadata?.trialEndsAt ?? user.privateMetadata?.trialEndsAt,
  });
}

export async function requireTier(requiredTier: 'core' | 'pro') {
  const authResult = await requireAuthenticatedUser();
  if (authResult.error || !authResult.userId) {
    return {
      userId: null,
      tier: 'none' as const,
      error: authResult.error,
    };
  }

  const tier = await getUserSubscriptionTier(authResult.userId);
  if (TIER_RANK[tier] < TIER_RANK[requiredTier]) {
    return {
      userId: authResult.userId,
      tier,
      error: Response.json(
        {
          error: `${requiredTier === 'pro' ? 'Pro' : 'Core'} subscription required`,
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
    error: null,
  };
}

export async function requireProUser() {
  const result = await requireTier('pro');
  if (result.error) {
    return {
      ...result,
      error: Response.json(
        { error: 'Pro subscription required', code: 'PRO_REQUIRED', currentTier: result.tier },
        { status: 403 }
      ),
    };
  }

  return result;
}
