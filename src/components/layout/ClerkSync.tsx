'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAppStore } from '@/store/useAppStore';
import type { SubscriptionTier } from '@/store/useAppStore';
import { clearPreferredTrialPlan, getPreferredTrialPlan } from '@/lib/trial-selection';

function normalizeTier(value: unknown): SubscriptionTier {
  return value === 'core' || value === 'pro' ? value : 'free';
}

function getEffectiveTier(metadata: Record<string, unknown> | undefined): SubscriptionTier {
  const subscriptionTier = normalizeTier(metadata?.subscriptionTier);
  if (subscriptionTier !== 'free') {
    return subscriptionTier;
  }

  if (metadata?.trialStatus !== 'active') {
    return 'free';
  }

  const trialPlan = metadata?.trialPlan;
  const trialEndsAt = metadata?.trialEndsAt;
  if (trialPlan !== 'core' && trialPlan !== 'pro') {
    return 'free';
  }

  if (typeof trialEndsAt !== 'string') {
    return 'free';
  }

  const endsAt = new Date(trialEndsAt).getTime();
  if (!Number.isFinite(endsAt) || endsAt <= Date.now()) {
    return 'free';
  }

  return trialPlan;
}

export function ClerkSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const syncClerkUser = useAppStore((state) => state.syncClerkUser);
  const clearClerkUser = useAppStore((state) => state.clearClerkUser);
  const hasAttemptedTrialBootstrap = useRef(false);

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

      const trialStatus = metadata?.trialStatus;
      const trialEndsAt = metadata?.trialEndsAt;
      const hasUsedTrial =
        trialStatus === 'expired' ||
        (typeof trialEndsAt === 'string' && Number.isFinite(new Date(trialEndsAt).getTime()) && new Date(trialEndsAt).getTime() <= Date.now());

      if (!hasAttemptedTrialBootstrap.current && effectiveTier === 'free' && !hasUsedTrial) {
        hasAttemptedTrialBootstrap.current = true;

        void fetch('/api/billing/trial/ensure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestedTier: getPreferredTrialPlan(),
          }),
        })
          .then(async (response) => {
            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.effectiveTier) {
              return;
            }

            syncClerkUser({
              id: user.id,
              email: user.primaryEmailAddress?.emailAddress || '',
              name: user.fullName || user.firstName || null,
              avatarUrl: user.imageUrl || null,
              subscriptionTier: data.effectiveTier,
            });
            clearPreferredTrialPlan();
          })
          .catch(() => {
            // Ignore bootstrap failures and let the user continue in free mode.
          });
      }
      return;
    }

    hasAttemptedTrialBootstrap.current = false;
    clearClerkUser();
  }, [clearClerkUser, isLoaded, isSignedIn, syncClerkUser, user]);

  return null;
}
