'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useUser } from '@clerk/nextjs';
import { getE2ETestUser, hasE2EAuthCookie, isE2EAuthEnabled } from '@/lib/e2e-auth';

type RuntimeUser = {
  id: string;
  fullName: string;
  firstName: string;
  imageUrl: string;
  publicMetadata: Record<string, unknown>;
  primaryEmailAddress: {
    emailAddress: string;
  };
};

function buildRuntimeUser(): RuntimeUser {
  const user = getE2ETestUser();

  return {
    id: user.id,
    fullName: user.name,
    firstName: user.name.split(' ')[0] || user.name,
    imageUrl: user.imageUrl ?? '',
    publicMetadata: user.publicMetadata as Record<string, unknown>,
    primaryEmailAddress: {
      emailAddress: user.email,
    },
  };
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener('focus', callback);
  window.addEventListener('storage', callback);

  return () => {
    window.removeEventListener('focus', callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot() {
  return hasE2EAuthCookie();
}

export function useRuntimeUser() {
  const clerkState = useUser();
  const hasE2ECookie = useSyncExternalStore(subscribe, getSnapshot, () => false);

  return useMemo(() => {
    if (clerkState.isSignedIn && clerkState.user) {
      return {
        isLoaded: clerkState.isLoaded,
        isSignedIn: true,
        user: clerkState.user,
      };
    }

    if (isE2EAuthEnabled() && hasE2ECookie) {
      return {
        isLoaded: true,
        isSignedIn: true,
        user: buildRuntimeUser(),
      };
    }

    return {
      isLoaded: clerkState.isLoaded,
      isSignedIn: false,
      user: null,
    };
  }, [clerkState.isLoaded, clerkState.isSignedIn, clerkState.user, hasE2ECookie]);
}
