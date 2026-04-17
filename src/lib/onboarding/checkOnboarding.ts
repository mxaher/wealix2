// BUG #006 FIX — Worker-safe onboarding cache with D1 as source of truth
import { dbFirst } from '@/lib/db';
import { deleteCachedValue, getCachedValue, setCachedValue } from '@/lib/runtime-cache';

const CACHE_TTL_SECONDS = 60;

type UserRow = { clerkId: string; onboardingCompletedAt: string | null };

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const cacheKey = `onboarding:${userId}`;
  const cached = await getCachedValue<boolean>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const user = await dbFirst<UserRow>(
    'SELECT clerkId, onboardingCompletedAt FROM users WHERE clerkId = ?',
    [userId]
  );

  const isDone = !!user?.onboardingCompletedAt;
  await setCachedValue(cacheKey, isDone, CACHE_TTL_SECONDS);

  return isDone;
}

export async function invalidateOnboardingCache(userId: string): Promise<void> {
  await deleteCachedValue(`onboarding:${userId}`);
}
