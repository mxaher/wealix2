'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useFinancialSettingsStore } from '@/store/useFinancialSettingsStore';
import { useAIModelStore } from '@/store/useAIModelStore';
import { useAgentTaskStore } from '@/store/useAgentTaskStore';
import { getBillingState } from '@/lib/billing-state';
import { getE2ETestUser, isE2EAuthEnabled } from '@/lib/e2e-auth';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';

const PERSISTED_STORAGE_KEYS = [
  'wealix-storage-v4',
  'wealix-financial-settings-v1',
  'wealix-ai-models-v1',
  'wealix-agent-command-center-v1',
];

function clearAllPersistedStores() {
  useAppStore.getState().clearAllData();
  useFinancialSettingsStore.getState().reset();
  useAIModelStore.getState().reset();
  useAgentTaskStore.getState().reset();
  if (typeof window !== 'undefined') {
    for (const key of PERSISTED_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  }
}

export function ClerkSync() {
  const { isLoaded, isSignedIn, user } = useRuntimeUser();
  const syncClerkUser = useAppStore((state) => state.syncClerkUser);
  const clearClerkUser = useAppStore((state) => state.clearClerkUser);
  const prevSignedInRef = useRef<boolean | null>(null);

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
      prevSignedInRef.current = true;
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

    // User just signed out — clear all persisted store data so the next
    // user on this device does not see the previous user's financial data.
    if (prevSignedInRef.current === true) {
      clearAllPersistedStores();
    }
    prevSignedInRef.current = false;

    clearClerkUser();
  }, [clearClerkUser, isLoaded, isSignedIn, syncClerkUser, user]);

  return null;
}
