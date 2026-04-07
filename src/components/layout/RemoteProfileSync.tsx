'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  getPersistableWorkspaceSnapshot,
  useAppStore,
  type RemoteWorkspaceSnapshot,
} from '@/store/useAppStore';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';

export function RemoteProfileSync() {
  const { isLoaded, isSignedIn, user } = useRuntimeUser();
  const hydrateRemoteWorkspace = useAppStore((state) => state.hydrateRemoteWorkspace);
  const stashRemoteWorkspace = useAppStore((state) => state.stashRemoteWorkspace);
  const appMode = useAppStore((state) => state.appMode);
  const startPage = useAppStore((state) => state.startPage);
  const profiles = useAppStore((state) => state.profiles);
  const activeProfileId = useAppStore((state) => state.activeProfileId);
  const notificationPreferences = useAppStore((state) => state.notificationPreferences);
  const notificationFeed = useAppStore((state) => state.notificationFeed);
  const incomeEntries = useAppStore((state) => state.incomeEntries);
  const expenseEntries = useAppStore((state) => state.expenseEntries);
  const receiptScans = useAppStore((state) => state.receiptScans);
  const portfolioHoldings = useAppStore((state) => state.portfolioHoldings);
  const portfolioAnalysisHistory = useAppStore((state) => state.portfolioAnalysisHistory);
  const investmentDecisionHistory = useAppStore((state) => state.investmentDecisionHistory);
  const assets = useAppStore((state) => state.assets);
  const liabilities = useAppStore((state) => state.liabilities);
  const budgetLimits = useAppStore((state) => state.budgetLimits);
  const recurringObligations = useAppStore((state) => state.recurringObligations);
  const oneTimeExpenses = useAppStore((state) => state.oneTimeExpenses);
  const savingsAccounts = useAppStore((state) => state.savingsAccounts);

  const remoteWorkspace = useMemo<RemoteWorkspaceSnapshot>(() => getPersistableWorkspaceSnapshot({
    appMode,
    startPage,
    activeProfileId,
    profiles,
    notificationPreferences,
    notificationFeed,
    incomeEntries,
    expenseEntries,
    receiptScans,
    portfolioHoldings,
    portfolioAnalysisHistory,
    investmentDecisionHistory,
    assets,
    liabilities,
    budgetLimits,
    recurringObligations,
    oneTimeExpenses,
    savingsAccounts,
  }), [
    activeProfileId,
    appMode,
    startPage,
    profiles,
    notificationPreferences,
    notificationFeed,
    incomeEntries,
    expenseEntries,
    receiptScans,
    portfolioHoldings,
    portfolioAnalysisHistory,
    investmentDecisionHistory,
    assets,
    liabilities,
    budgetLimits,
    recurringObligations,
    oneTimeExpenses,
    savingsAccounts,
  ]);

  const serializedWorkspace = useMemo(
    () => JSON.stringify(remoteWorkspace),
    [remoteWorkspace]
  );

  const loadedUserIdRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');
  const remoteUpdatedAtRef = useRef<string | null>(null);
  const applyingRemoteRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      loadedUserIdRef.current = null;
      lastSavedSnapshotRef.current = '';
      remoteUpdatedAtRef.current = null;
      applyingRemoteRef.current = false;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const loadWorkspace = async (options?: { silent?: boolean; force?: boolean }) => {
      try {
        const response = await fetch('/api/user-data', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          loadedUserIdRef.current = user.id;
          lastSavedSnapshotRef.current = serializedWorkspace;
          return;
        }

        const data = await response.json();
        const workspace = data?.workspace as RemoteWorkspaceSnapshot | null | undefined;
        const updatedAt = typeof data?.updatedAt === 'string' ? data.updatedAt : null;

        if (cancelled) {
          return;
        }

        if (!options?.force && loadedUserIdRef.current === user.id && updatedAt && remoteUpdatedAtRef.current === updatedAt) {
          return;
        }

        if (workspace && appMode === 'live') {
          applyingRemoteRef.current = true;
          hydrateRemoteWorkspace(workspace);
          lastSavedSnapshotRef.current = JSON.stringify(workspace);
          remoteUpdatedAtRef.current = updatedAt;
          window.setTimeout(() => {
            applyingRemoteRef.current = false;
          }, 0);
        } else if (workspace) {
          stashRemoteWorkspace(workspace);
          lastSavedSnapshotRef.current = JSON.stringify(workspace);
          remoteUpdatedAtRef.current = updatedAt;
          console.info('[remote-sync] refreshed live workspace while demo mode is active', {
            userId: user.id,
            syncScope: `${user.id}:live`,
          });
        } else {
          lastSavedSnapshotRef.current = serializedWorkspace;
          remoteUpdatedAtRef.current = updatedAt;
        }

        loadedUserIdRef.current = user.id;
      } catch (error) {
        if (!options?.silent) {
          console.error('[remote-sync] load failed', error);
        }
        loadedUserIdRef.current = user.id;
        lastSavedSnapshotRef.current = serializedWorkspace;
      }
    };

    if (loadedUserIdRef.current !== user.id) {
      void loadWorkspace({ force: true });
    }

    const refreshWorkspace = () => {
      if (document.visibilityState === 'visible') {
        void loadWorkspace({ silent: true });
      }
    };

    window.addEventListener('focus', refreshWorkspace);
    document.addEventListener('visibilitychange', refreshWorkspace);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadWorkspace({ silent: true });
      }
    }, 15000);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshWorkspace);
      document.removeEventListener('visibilitychange', refreshWorkspace);
      window.clearInterval(intervalId);
    };
  }, [appMode, hydrateRemoteWorkspace, isLoaded, isSignedIn, serializedWorkspace, stashRemoteWorkspace, user]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      return;
    }

    if (loadedUserIdRef.current !== user.id || applyingRemoteRef.current) {
      return;
    }

    if (serializedWorkspace === lastSavedSnapshotRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void fetch('/api/user-data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspace: remoteWorkspace, knownUpdatedAt: remoteUpdatedAtRef.current }),
      })
        .then(async (response) => {
          if (response.status === 409) {
            const data = await response.json().catch(() => null);
            const workspace = data?.workspace as RemoteWorkspaceSnapshot | null | undefined;
            const updatedAt = typeof data?.updatedAt === 'string' ? data.updatedAt : null;

            if (workspace) {
              applyingRemoteRef.current = true;
              hydrateRemoteWorkspace(workspace);
              lastSavedSnapshotRef.current = JSON.stringify(workspace);
              remoteUpdatedAtRef.current = updatedAt;
              window.setTimeout(() => {
                applyingRemoteRef.current = false;
              }, 0);
            }
            return;
          }

          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.error || 'Failed to persist workspace');
          }

          const data = await response.json().catch(() => null);
          const updatedAt = typeof data?.updatedAt === 'string' ? data.updatedAt : null;
          lastSavedSnapshotRef.current = serializedWorkspace;
          remoteUpdatedAtRef.current = updatedAt;
        })
        .catch((error) => {
          console.error('[remote-sync] save failed', error);
        });
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [appMode, isLoaded, isSignedIn, remoteWorkspace, serializedWorkspace, user]);

  return null;
}
