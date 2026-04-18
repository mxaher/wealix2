import { getD1Database } from '@/lib/d1';

type RateLimitRow = {
  count: number;
  reset_at: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();

function enforceInMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = inMemoryBuckets.get(key);
  const expired = !existing || existing.resetAt <= now;
  const nextBucket = expired
    ? { count: 1, resetAt: now + windowMs }
    : { count: existing.count + 1, resetAt: existing.resetAt };

  inMemoryBuckets.set(key, nextBucket);

  for (const [bucketKey, bucket] of inMemoryBuckets) {
    if (bucket.resetAt <= now) {
      inMemoryBuckets.delete(bucketKey);
    }
  }

  if (nextBucket.count > limit) {
    return { allowed: false, remaining: 0, resetAt: nextBucket.resetAt };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - nextBucket.count),
    resetAt: nextBucket.resetAt,
  };
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) : Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = now + windowMs;

  const db = getD1Database();

  if (!db) {
    return enforceInMemoryRateLimit(key, limit, windowMs);
  }

  // Atomically insert a new bucket or increment/reset an existing one using SQLite UPSERT.
  // CASE logic ensures an expired window is reset to count=1 rather than incremented.
  await db
    .prepare(`
      INSERT INTO rate_limit_buckets (key, count, reset_at)
      VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        count    = CASE WHEN reset_at <= ? THEN 1             ELSE count + 1 END,
        reset_at = CASE WHEN reset_at <= ? THEN ?             ELSE reset_at  END
    `)
    .bind(key, resetAt, now, now, resetAt)
    .run();

  const row = await db
    .prepare('SELECT count, reset_at FROM rate_limit_buckets WHERE key = ?')
    .bind(key)
    .first<RateLimitRow>();

  const count = row?.count ?? 1;
  const effectiveResetAt = row?.reset_at ?? resetAt;

  if (count > limit) {
    return { allowed: false, remaining: 0, resetAt: effectiveResetAt };
  }

  return { allowed: true, remaining: Math.max(0, limit - count), resetAt: effectiveResetAt };
}

export function buildRateLimitHeaders(result: { remaining: number; resetAt: number }) {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  };
}

export function resetInMemoryRateLimitState() {
  inMemoryBuckets.clear();
}
