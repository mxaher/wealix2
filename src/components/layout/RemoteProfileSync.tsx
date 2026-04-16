'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  getPersistableWorkspaceSnapshot,
  useAppStore,
  type RemoteWorkspaceSnapshot,
} from '@/store/useAppStore';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';

type OnboardingProfilePayload = {
  monthlyIncome?: number | null;
  riskTolerance?: string | null;
  preferredMarkets?: string[] | null;
  retirementGoal?: string | null;
  currentAge?: number | null;
  retirementAge?: number | null;
};

export function RemoteProfileSync() {
  const { isLoaded, isSignedIn, user } = useRuntimeUser();
  const hydrateRemoteWorkspace = useAppStore((state) => state.hydrateRemoteWorkspace);
  const stashRemoteWorkspace = useAppStore((state) => state.stashRemoteWorkspace);
  const setUserProfile = useAppStore((state) => state.setUserProfile);
  const profileLoadedForRef = useRef<string | null>(null);
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

  // FIX: guard is now keyed on `userId:appMode` so switching demo → live
  // always triggers a fresh GET /api/user-data + hydrateRemoteWorkspace.
  // Previously keyed only on userId — mode toggles were silently ignored.
  const loadedSyncKeyRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');
  const serializedWorkspaceRef = useRef(serializedWorkspace);
  const remoteUpdatedAtRef = useRef<string | null>(null);
  const applyingRemoteRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  // FIX: stable ref so async callbacks always read the live appMode,
  // not the stale closure-captured value from effect dispatch time.
  // This closes the race where a fetch started in demo mode would call
  // stashRemoteWorkspace after the user had already toggled back to live.
  const appModeRef = useRef(appMode);
  useEffect(() => {
    appModeRef.current = appMode;
  }, [appMode]);

  useEffect(() => {
    serializedWorkspaceRef.current = serializedWorkspace;
  }, [serializedWorkspace]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      loadedSyncKeyRef.current = null;
      lastSavedSnapshotRef.current = '';
      remoteUpdatedAtRef.current = null;
      applyingRemoteRef.current = false;
      profileLoadedForRef.current = null;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    // Composite key: userId + appMode — any mode change forces a fresh server fetch
    const currentSyncKey = `${user.id}:${appMode}`;

    const loadWorkspace = async (options?: { silent?: boolean; force?: boolean }) => {
      try {
        const response = await fetch('/api/user-data', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          loadedSyncKeyRef.current = currentSyncKey;
          lastSavedSnapshotRef.current = serializedWorkspace;
          return;
        }

        const data = await response.json();
        const workspace = data?.workspace as RemoteWorkspaceSnapshot | null | undefined;
        const updatedAt = typeof data?.updatedAt === 'string' ? data.updatedAt : null;

        if (cancelled) {
          return;
        }

        // FIX: when force=true (mode toggle path), bypass the updatedAt equality
        // guard entirely. This guarantees hydrateRemoteWorkspace is always called
        // on demo→live toggle even when the server data has not changed.
        if (
          !options?.force &&
          loadedSyncKeyRef.current === currentSyncKey &&
          updatedAt &&
          remoteUpdatedAtRef.current === updatedAt
        ) {
          return;
        }

        // FIX: read appMode from the live ref (appModeRef.current), not the
        // closure-captured appMode value. This handles the race condition where:
        //   1. User is in demo mode → fetch starts
        //   2. User toggles to live mode
        //   3. Fetch completes — must call hydrateRemoteWorkspace, not stash
        const currentAppMode = appModeRef.current;
        const hasUnsavedLocalChanges = serializedWorkspaceRef.current !== lastSavedSnapshotRef.current;

        if (workspace && currentAppMode === 'live' && !hasUnsavedLocalChanges) {
          applyingRemoteRef.current = true;
          hydrateRemoteWorkspace(workspace);
          lastSavedSnapshotRef.current = JSON.stringify(workspace);
          remoteUpdatedAtRef.current = updatedAt;
          window.setTimeout(() => {
            applyingRemoteRef.current = false;
          }, 0);
        } else if (workspace && currentAppMode === 'live') {
          remoteUpdatedAtRef.current = updatedAt;
        } else if (workspace) {
          // Still in demo mode — stash the live workspace so the toggle
          // can restore it cleanly when the user switches back to live.
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

        loadedSyncKeyRef.current = currentSyncKey;

        // Load onboarding profile once per user session to hydrate userProfile
        // (risk tolerance, income baseline, FIRE targets, markets).
        // This is separate from the workspace sync because onboarding data lives
        // in a different D1 table and is never included in RemoteWorkspaceSnapshot.
        if (profileLoadedForRef.current !== user.id) {
          profileLoadedForRef.current = user.id;
          void fetch('/api/onboarding/profile', { cache: 'no-store' })
            .then(async (r) => {
              if (!r.ok) return;
              const json = await r.json() as { profile: OnboardingProfilePayload | null };
              const p = json?.profile;
              if (!p) return;
              setUserProfile({
                monthlyIncome: p.monthlyIncome ?? undefined,
                riskTolerance: p.riskTolerance ?? undefined,
                preferredMarkets: p.preferredMarkets ?? undefined,
                retirementGoal: p.retirementGoal ?? undefined,
                currentAge: p.currentAge ?? undefined,
                retirementAge: p.retirementAge ?? undefined,
              });
            })
            .catch(() => { /* non-blocking */ });
        }
      } catch (error) {
        if (!options?.silent) {
          console.error('[remote-sync] load failed', error);
        }
        loadedSyncKeyRef.current = currentSyncKey;
        lastSavedSnapshotRef.current = serializedWorkspace;
      }
    };

    // Trigger fetch whenever the syncKey changes (new user OR mode toggled)
    if (loadedSyncKeyRef.current !== currentSyncKey) {
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

    const currentSyncKey = `${user.id}:${appMode}`;

    // Do not save until the initial load for this syncKey is complete,
    // and never save while we are applying an incoming remote update.
    if (loadedSyncKeyRef.current !== currentSyncKey || applyingRemoteRef.current) {
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
  }, [appMode, hydrateRemoteWorkspace, isLoaded, isSignedIn, remoteWorkspace, serializedWorkspace, user]);

  return null;
}
