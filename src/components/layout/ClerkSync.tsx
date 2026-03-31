'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAppStore } from '@/store/useAppStore';
import { getBillingState } from '@/lib/billing-state';

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
      const billingState = getBillingState(metadata);

      syncClerkUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        name: user.fullName || user.firstName || null,
        avatarUrl: user.imageUrl || null,
        subscriptionTier: billingState.hasStandardAccess ? billingState.selectedPlan : 'none',
      });

      return;
    }

    clearClerkUser();
  }, [clearClerkUser, isLoaded, isSignedIn, syncClerkUser, user]);

  return null;
}
