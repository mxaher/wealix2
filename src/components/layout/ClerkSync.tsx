'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getBillingState } from '@/lib/billing-state';
import { getE2ETestUser, isE2EAuthEnabled } from '@/lib/e2e-auth';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';

export function ClerkSync() {
  const { isLoaded, isSignedIn, user } = useRuntimeUser();
  const syncClerkUser = useAppStore((state) => state.syncClerkUser);
  const clearClerkUser = useAppStore((state) => state.clearClerkUser);

  useEffect(() => {
    if (isE2EAuthEnabled()) {
      const e2eUser = getE2ETestUser();
      const billingState = getBillingState(e2eUser.publicMetadata);

      syncClerkUser({
        id: e2eUser.id,
        email: e2eUser.email,
        name: e2eUser.name,
        avatarUrl: e2eUser.imageUrl,
        subscriptionTier: billingState.hasStandardAccess ? billingState.selectedPlan : 'none',
      });

      return;
    }

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
