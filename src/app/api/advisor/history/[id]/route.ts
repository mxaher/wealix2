import { NextResponse } from 'next/server';
import { getChatSession, deleteChatSession } from '@/lib/chat-history';
import { buildRateLimitHeaders, enforceRateLimit } from '@/lib/rate-limit';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export const runtime = 'edge';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuthenticatedUser();
  if (error || !userId) {
    return error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitResult = await enforceRateLimit(`advisor-history-get:${userId}`, 30, 60_000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: buildRateLimitHeaders(rateLimitResult) }
    );
  }

  const { id } = await params;
  try {
    const session = await getChatSession(id, userId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ session }, { headers: buildRateLimitHeaders(rateLimitResult) });
  } catch {
    return NextResponse.json({ error: 'Failed to load chat session' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuthenticatedUser();
  if (error || !userId) {
    return error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteChatSession(id, userId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete chat session' }, { status: 500 });
  }
}
