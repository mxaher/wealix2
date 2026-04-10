import { NextResponse } from 'next/server';
import { getChatHistory } from '@/lib/chat-history';
import { buildRateLimitHeaders, enforceRateLimit } from '@/lib/rate-limit';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { userId, error } = await requireAuthenticatedUser();
  if (error || !userId) {
    return error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitResult = await enforceRateLimit(`advisor-history:${userId}`, 30, 60_000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: buildRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '20'), 50);
    const sessions = await getChatHistory(userId, limit);
    return NextResponse.json({ sessions }, { headers: buildRateLimitHeaders(rateLimitResult) });
  } catch {
    return NextResponse.json({ error: 'Failed to load chat history' }, { status: 500 });
  }
}
