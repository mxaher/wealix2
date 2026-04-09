import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { countSuggestionsSubmittedToday, createSuggestion, findDuplicateSuggestion } from '@/lib/suggestion-storage';

const ALLOWED_CHARS = /^[\p{L}\p{N}\s\-().\/،,]+$/u;
const COUNTRY_CODE_PATTERN = /^[A-Z]{0,2}$/;
const MAX_LENGTH = 80;

function sanitize(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_LENGTH) {
    return null;
  }

  if (!ALLOWED_CHARS.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const value = sanitize(body.value);

  if (!value) {
    return NextResponse.json({ error: 'Invalid suggestion value' }, { status: 400 });
  }

  const country =
    typeof body.country === 'string' && COUNTRY_CODE_PATTERN.test(body.country) ? body.country : '';

  const countToday = await countSuggestionsSubmittedToday({
    submittedByUserId: userId,
    type: 'bank_name',
  });

  if (countToday >= 5) {
    return NextResponse.json({ error: 'Daily suggestion limit reached' }, { status: 429 });
  }

  const existing = await findDuplicateSuggestion({
    type: 'bank_name',
    valueLower: value.toLowerCase(),
  });

  if (existing) {
    return NextResponse.json({ success: true, duplicate: true });
  }

  await createSuggestion({
    type: 'bank_name',
    value,
    valueLower: value.toLowerCase(),
    locale: 'en',
    meta: { country },
    status: 'pending',
    submittedByUserId: userId,
  });

  return NextResponse.json({ success: true });
}
