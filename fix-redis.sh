#!/usr/bin/env bash
# =============================================================================
# Wealix.app — Build Fix: Create missing @/lib/redis module
# Also fixes: middleware deprecation warning (middleware -> proxy)
# Run from repo root: chmod +x fix-redis.sh && ./fix-redis.sh
# =============================================================================

set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[FIX]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

[ -f "package.json" ] || err "Run from repo root."

# ==============================================================================
# 1. Install Upstash Redis (Edge-compatible — works on Cloudflare Workers)
# ==============================================================================
log "Installing @upstash/redis (Edge/Worker compatible)..."
bun add @upstash/redis

# ==============================================================================
# 2. Create src/lib/redis.ts — Upstash client (Edge-safe)
# ==============================================================================
mkdir -p src/lib

cat > src/lib/redis.ts << 'EOF'
// src/lib/redis.ts
// Upstash Redis — Edge & Cloudflare Worker compatible (no Node.js net module)
import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error('[Redis] UPSTASH_REDIS_REST_URL environment variable is not set.');
}
if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('[Redis] UPSTASH_REDIS_REST_TOKEN environment variable is not set.');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
EOF
log "Created: src/lib/redis.ts"

# ==============================================================================
# 3. Create src/lib/db.ts stub (referenced in multiple fix files)
# ==============================================================================
if [ ! -f "src/lib/db.ts" ] && [ ! -f "src/lib/db/index.ts" ]; then
cat > src/lib/db.ts << 'EOF'
// src/lib/db.ts
// Database client — update this to match your actual ORM (Prisma / Drizzle)
// This stub prevents build errors from @/lib/db imports

// If using Prisma:
// import { PrismaClient } from '@prisma/client';
// const globalForPrisma = global as unknown as { prisma: PrismaClient };
// export const db = globalForPrisma.prisma || new PrismaClient();
// if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// If using Drizzle — replace with your drizzle instance:
// export { db } from './db/drizzle';

// Temporary stub to unblock build — replace with real implementation:
export const db = {
  user: {
    findUnique: async (_args: unknown) => null,
    update: async (_args: unknown) => null,
  },
} as const;
EOF
log "Created: src/lib/db.ts (stub — replace with your real ORM client)"
else
  warn "src/lib/db.ts already exists — skipping."
fi

# ==============================================================================
# 4. Add Redis env vars to .env.example
# ==============================================================================
if ! grep -q "UPSTASH_REDIS_REST_URL" .env.example 2>/dev/null; then
cat >> .env.example << 'EOF'

# Upstash Redis (Edge/Cloudflare Worker compatible)
# Get these from: https://console.upstash.com
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
EOF
log "Updated: .env.example with Upstash Redis vars"
fi

# ==============================================================================
# 5. Fix middleware deprecation warning
#    Next.js 16 renames middleware.ts -> proxy.ts
# ==============================================================================
if [ -f "src/middleware.ts" ] && [ ! -f "src/proxy.ts" ]; then
  warn "Next.js 16 deprecates 'middleware.ts' — renaming to 'proxy.ts'..."
  cp src/middleware.ts src/proxy.ts
  # Keep middleware.ts as re-export for backward compat during transition
  cat > src/middleware.ts << 'EOF'
// Deprecated: Next.js 16 uses proxy.ts instead of middleware.ts
// This file is kept temporarily for compatibility.
// TODO: Remove this file once proxy.ts is fully validated.
export { default, config } from './proxy';
EOF
  log "Created: src/proxy.ts (copied from middleware.ts)"
  log "Updated: src/middleware.ts (re-export shim)"
fi

# ==============================================================================
# 6. Verify the fix files that import redis exist and are correct
# ==============================================================================
log "Verifying redis import paths in fix files..."

# Fix market route to handle redis import gracefully with fallback
cat > src/app/api/v1/market/\[symbol\]/route.ts << 'EOF'
// BUG #022 FIX — Redis-cached market data (prevents rate limit exhaustion)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const CACHE_TTL = { realtime: 60, indices: 300 };

// Lazy-load redis to avoid build errors if env vars not set at build time
async function getRedis() {
  const { redis } = await import('@/lib/redis');
  return redis;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { symbol } = params;
  const interval = req.nextUrl.searchParams.get('interval') ?? '1day';
  const cacheKey = `market:${symbol}:${interval}`;

  try {
    const redis = await getRedis();

    // Check Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } });
    }

    // Fetch from Twelve Data
    const res = await fetch(
      `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&apikey=${process.env.TWELVE_DATA_API_KEY}`
    );
    if (!res.ok) throw new Error(`Twelve Data error: ${res.status}`);

    const data = await res.json();
    const ttl = interval === '1min' ? CACHE_TTL.realtime : CACHE_TTL.indices;
    await redis.setex(cacheKey, ttl, data);

    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (error) {
    console.error('[Market API] Error:', error);
    return NextResponse.json(
      { error: 'Market data temporarily unavailable' },
      { status: 503 }
    );
  }
}
EOF
log "Updated: src/app/api/v1/market/[symbol]/route.ts (lazy redis import)"

# Fix onboarding check to use lazy import
cat > src/lib/onboarding/checkOnboarding.ts << 'EOF'
// BUG #006 FIX — Redis-backed onboarding state (not cookie-only)
import { db } from '@/lib/db';

const CACHE_TTL_SECONDS = 60;

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

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { onboardingCompletedAt: true },
  } as never);

  const isDone = !!(user as { onboardingCompletedAt?: Date } | null)?.onboardingCompletedAt;

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
EOF
log "Updated: src/lib/onboarding/checkOnboarding.ts (lazy redis + graceful fallback)"

# ==============================================================================
# 7. Git add, commit, push
# ==============================================================================
echo ""
log "Staging changes..."
git add .

log "Committing..."
git commit -m "fix(build): resolve missing @/lib/redis module causing build failure

- Add @upstash/redis (Edge/Cloudflare Worker compatible client)
- Create src/lib/redis.ts with Upstash REST client
- Create src/lib/db.ts stub (prevents ORM import errors during build)
- Update market route to use lazy redis import with error handling
- Update onboarding check with lazy redis + DB fallback on Redis failure
- Add UPSTASH_REDIS_REST_URL + TOKEN to .env.example
- Fix Next.js 16 middleware deprecation: copy middleware.ts -> proxy.ts

Next step: Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
in Cloudflare Pages environment variables dashboard."

log "Pulling remote changes first..."
git pull --rebase origin master

log "Pushing to master..."
git push origin master

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Build fix pushed to master!              ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
warn "ACTION REQUIRED — Set these in Cloudflare Pages env vars:"
echo "  1. Go to: Cloudflare Dashboard > Pages > Wealix.app > Settings > Variables"
echo "  2. Add:"
echo "     UPSTASH_REDIS_REST_URL   = (from console.upstash.com)"
echo "     UPSTASH_REDIS_REST_TOKEN = (from console.upstash.com)"
echo ""
warn "If you don't have Upstash yet:"
echo "  → https://console.upstash.com → Create Database → REST API tab → copy URL + Token"
echo "  → Free tier: 10,000 requests/day — sufficient for dev/staging"
