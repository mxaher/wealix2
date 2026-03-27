'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAppStore, type RemoteWorkspaceSnapshot } from '@/store/useAppStore';

export function RemoteProfileSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const hydrateRemoteWorkspace = useAppStore((state) => state.hydrateRemoteWorkspace);
  const appMode = useAppStore((state) => state.appMode);
  const notificationPreferences = useAppStore((state) => state.notificationPreferences);
  const notificationFeed = useAppStore((state) => state.notificationFeed);
  const incomeEntries = useAppStore((state) => state.incomeEntries);
  const expenseEntries = useAppStore((state) => state.expenseEntries);
  const receiptScans = useAppStore((state) => state.receiptScans);
  const portfolioHoldings = useAppStore((state) => state.portfolioHoldings);
  const portfolioAnalysisHistory = useAppStore((state) => state.portfolioAnalysisHistory);
  const assets = useAppStore((state) => state.assets);
  const liabilities = useAppStore((state) => state.liabilities);
  const budgetLimits = useAppStore((state) => state.budgetLimits);

  const remoteWorkspace = useMemo<RemoteWorkspaceSnapshot>(() => ({
    appMode,
    notificationPreferences,
    notificationFeed,
    incomeEntries,
    expenseEntries,
    receiptScans,
    portfolioHoldings,
    portfolioAnalysisHistory,
    assets,
    liabilities,
    budgetLimits,
  }), [
    appMode,
    notificationPreferences,
    notificationFeed,
    incomeEntries,
    expenseEntries,
    receiptScans,
    portfolioHoldings,
    portfolioAnalysisHistory,
    assets,
    liabilities,
    budgetLimits,
  ]);

  const serializedWorkspace = useMemo(
    () => JSON.stringify(remoteWorkspace),
    [remoteWorkspace]
  );

  const loadedUserIdRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');
  const applyingRemoteRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      loadedUserIdRef.current = null;
      lastSavedSnapshotRef.current = '';
      applyingRemoteRef.current = false;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const loadWorkspace = async () => {
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

        if (cancelled) {
          return;
        }

        if (workspace) {
          applyingRemoteRef.current = true;
          hydrateRemoteWorkspace(workspace);
          lastSavedSnapshotRef.current = JSON.stringify(workspace);
          window.setTimeout(() => {
            applyingRemoteRef.current = false;
          }, 0);
        } else {
          lastSavedSnapshotRef.current = serializedWorkspace;
        }

        loadedUserIdRef.current = user.id;
      } catch (error) {
        console.error('[remote-sync] load failed', error);
        loadedUserIdRef.current = user.id;
        lastSavedSnapshotRef.current = serializedWorkspace;
      }
    };

    if (loadedUserIdRef.current !== user.id) {
      void loadWorkspace();
    }

    return () => {
      cancelled = true;
    };
  }, [hydrateRemoteWorkspace, isLoaded, isSignedIn, serializedWorkspace, user]);

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
        body: JSON.stringify({ workspace: remoteWorkspace }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.error || 'Failed to persist workspace');
          }

          lastSavedSnapshotRef.current = serializedWorkspace;
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
  }, [isLoaded, isSignedIn, remoteWorkspace, serializedWorkspace, user]);

  return null;
}
