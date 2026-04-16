// BUG #006 FIX — Redis-backed onboarding state (not cookie-only)
import { dbFirst } from '@/lib/db';

const CACHE_TTL_SECONDS = 60;

type UserRow = { clerkId: string; onboardingCompletedAt: string | null };

async function getRedis() {
  const { redis } = await import('@/lib/redis');
  return redis;
}

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const cacheKey = `onboarding:${userId}`;

  try {
    const redis = await getRedis();
    const cached = await redis.get(cacheKey);
    if (cached !== null) return cached === 'true';
  } catch {
    // Redis unavailable — fall through to DB check
    console.warn('[Onboarding] Redis unavailable, falling back to DB');
  }

  const user = await dbFirst<UserRow>(
    'SELECT clerkId, onboardingCompletedAt FROM users WHERE clerkId = ?',
    [userId]
  );

  const isDone = !!user?.onboardingCompletedAt;

  try {
    const redis = await getRedis();
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, isDone ? 'true' : 'false');
  } catch {
    // Non-fatal — DB result is the source of truth
  }

  return isDone;
}

export async function invalidateOnboardingCache(userId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.del(`onboarding:${userId}`);
  } catch {
    console.warn('[Onboarding] Could not invalidate cache for:', userId);
  }
}
