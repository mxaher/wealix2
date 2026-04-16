'use client';

import { useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { getE2ETestUser, isE2EAuthEnabled } from '@/lib/e2e-auth';

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

export function useRuntimeUser() {
  const clerkState = useUser();

  return useMemo(() => {
    if (isE2EAuthEnabled()) {
      return {
        isLoaded: true,
        isSignedIn: true,
        user: buildRuntimeUser(),
      };
    }

    if (clerkState.isSignedIn && clerkState.user) {
      return {
        isLoaded: clerkState.isLoaded,
        isSignedIn: true,
        user: clerkState.user,
      };
    }

    return {
      isLoaded: clerkState.isLoaded,
      isSignedIn: false,
      user: null,
    };
  }, [clerkState.isLoaded, clerkState.isSignedIn, clerkState.user]);
}
