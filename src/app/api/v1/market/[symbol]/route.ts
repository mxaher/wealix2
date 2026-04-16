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
