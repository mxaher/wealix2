'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';

/**
 * useWorkspaceSync
 *
 * Fetches the user's remote workspace from /api/user-data and hydrates the
 * store with real server data.  This is the ONLY place hydrateRemoteWorkspace
 * is called — it is intentionally separate from useRuntimeUser so that
 * identity resolution and data fetching remain independent concerns.
 *
 * Trigger conditions:
 *  1. User signs in (isSignedIn transitions false → true)
 *  2. App mode switches back to 'live' while a user is authenticated
 *
 * Race-condition handling:
 *  If the fetch completes while the user has already switched to demo mode,
 *  the workspace is stashed (stashRemoteWorkspace) rather than applied
 *  immediately.  When the user next toggles back to live, setAppMode('live')
 *  will read the stashed profile from localStorage and restore cleanly.
 */
export function useWorkspaceSync() {
  const { isLoaded, isSignedIn } = useRuntimeUser();
  const appMode = useAppStore((s) => s.appMode);
  const hydrateRemoteWorkspace = useAppStore((s) => s.hydrateRemoteWorkspace);
  const stashRemoteWorkspace = useAppStore((s) => s.stashRemoteWorkspace);

  // Prevent concurrent or duplicate fetches within the same render cycle.
  const isFetchingRef = useRef(false);
  // Track the last (userId + appMode) combination we fetched for so we don't
  // re-fetch on unrelated re-renders.
  const lastFetchKeyRef = useRef<string | null>(null);

  const userId = useAppStore((s) => s.user?.id ?? null);

  useEffect(() => {
    // Only proceed once Clerk has finished loading and the user is signed in.
    if (!isLoaded || !isSignedIn || !userId) {
      return;
    }

    // Build a stable key for this (user + mode) combination.
    const fetchKey = `${userId}:${appMode}`;

    // Skip if we already fetched for this exact key or a fetch is in flight.
    if (isFetchingRef.current || lastFetchKeyRef.current === fetchKey) {
      return;
    }

    // We only need to hydrate when the store is in live mode.  If the user is
    // currently browsing demo mode, stashRemoteWorkspace will cache the data
    // so the live restore path has real data ready instantly.
    // We still fetch in both cases — the dispatch target differs.

    isFetchingRef.current = true;

    fetch('/api/user-data', {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (res) => {
        // 503 = persistence not configured (local dev without D1 binding).
        // Treat this as a no-op — the store will rely on localStorage only.
        if (res.status === 503) {
          console.info('[useWorkspaceSync] remote persistence not configured — skipping hydration');
          lastFetchKeyRef.current = fetchKey;
          return;
        }

        if (!res.ok) {
          console.warn('[useWorkspaceSync] fetch failed', res.status, res.statusText);
          return;
        }

        const json = await res.json();
        const workspace = json?.workspace;

        if (!workspace) {
          console.info('[useWorkspaceSync] server returned no workspace — user may be new');
          lastFetchKeyRef.current = fetchKey;
          return;
        }

        // Read appMode at dispatch time, not at the time the effect ran.
        // This guards against the user toggling modes while the request was
        // in flight.
        const currentMode = useAppStore.getState().appMode;

        if (currentMode === 'live') {
          console.info('[useWorkspaceSync] hydrating live store from server');
          hydrateRemoteWorkspace(workspace);
        } else {
          // Demo mode is active — stash silently so the next live restore
          // has real data instead of empty arrays.
          console.info('[useWorkspaceSync] user in demo mode — stashing remote workspace');
          stashRemoteWorkspace(workspace);
        }

        lastFetchKeyRef.current = fetchKey;
      })
      .catch((err) => {
        console.error('[useWorkspaceSync] unexpected error', err);
      })
      .finally(() => {
        isFetchingRef.current = false;
      });
  }, [isLoaded, isSignedIn, userId, appMode, hydrateRemoteWorkspace, stashRemoteWorkspace]);
}
