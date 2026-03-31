'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAppStore } from '@/store/useAppStore';
import type { SubscriptionTier } from '@/store/useAppStore';

function normalizeTier(value: unknown): SubscriptionTier {
  return value === 'core' || value === 'pro' ? value : 'none';
}

function getEffectiveTier(metadata: Record<string, unknown> | undefined): SubscriptionTier {
  const subscriptionTier = normalizeTier(metadata?.subscriptionTier);
  if (subscriptionTier !== 'none') {
    return subscriptionTier;
  }

  if (metadata?.trialStatus !== 'active') {
    return 'none';
  }

  const trialPlan = metadata?.trialPlan;
  const trialEndsAt = metadata?.trialEndsAt;
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

export function ClerkSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const syncClerkUser = useAppStore((state) => state.syncClerkUser);
  const clearClerkUser = useAppStore((state) => state.clearClerkUser);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (isSignedIn && user) {
      const metadata = user.publicMetadata as Record<string, unknown> | undefined;
      const effectiveTier = getEffectiveTier(metadata);

      syncClerkUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        name: user.fullName || user.firstName || null,
        avatarUrl: user.imageUrl || null,
        subscriptionTier: effectiveTier,
      });

      return;
    }

    clearClerkUser();
  }, [clearClerkUser, isLoaded, isSignedIn, syncClerkUser, user]);

  return null;
}
