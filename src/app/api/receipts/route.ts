import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbQuery } from '@/lib/db';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '20'), 100);
  const offset = Number(url.searchParams.get('offset') ?? '0');

  const receipts = await dbQuery(
    'SELECT id, merchant, amount, currency, date, category, created_at FROM receipts WHERE user_id = ? ORDER BY date DESC LIMIT ? OFFSET ?',
    [userId, limit, offset]
  );

  return NextResponse.json({ receipts });
}
