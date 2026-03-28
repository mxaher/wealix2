import { getCloudflareContext } from '@opennextjs/cloudflare';

type D1LikeDatabase = {
  prepare: (query: string) => {
    bind: (...values: unknown[]) => {
      first: <T = unknown>() => Promise<T | null>;
      run: () => Promise<unknown>;
    };
    run: () => Promise<unknown>;
  };
};

type RateLimitRow = {
  count: number;
  reset_at: number;
};

function getD1Database(): D1LikeDatabase | null {
  try {
    const context = getCloudflareContext();
    return (context?.env as Record<string, unknown> | undefined)?.WEALIX_DB as D1LikeDatabase | null;
  } catch {
    return null;
  }
}

async function ensureRateLimitTable(db: D1LikeDatabase) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      reset_at INTEGER NOT NULL
    )
  `).run();
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const resetAt = now + windowMs;

  const db = getD1Database();

  if (!db) {
    // Local dev fallback — not safe for production, but D1 is always present on Workers
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  await ensureRateLimitTable(db);

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
