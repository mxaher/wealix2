import { NextRequest, NextResponse } from 'next/server';
import { buildStatementImportPreview } from '@/lib/bank-statement-import';
import { buildRateLimitHeaders, enforceRateLimit } from '@/lib/rate-limit';
import { requirePaidTier } from '@/lib/server-auth';
import type { StatementAccountType } from '@/lib/bank-statement-types';

function isStatementAccountType(value: string): value is StatementAccountType {
  return value === 'current' || value === 'credit_card';
}

export async function POST(request: NextRequest) {
  const authResult = await requirePaidTier('pro');
  if (authResult.error) {
    return authResult.error;
  }

  if (!authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(`statement-import:${authResult.userId}`, 20, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Statement import limit reached. Please try again later.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  let formData: FormData | null = null;

  try {
    formData = await request.formData();
    const file = formData.get('file');
    const accountTypeValue = String(formData.get('accountType') ?? '').trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No statement file was provided.' },
        { status: 400, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    if (!isStatementAccountType(accountTypeValue)) {
      return NextResponse.json(
        { error: 'A valid account type is required.' },
        { status: 400, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    const preview = await buildStatementImportPreview(file, accountTypeValue);
    return NextResponse.json(preview, { headers: buildRateLimitHeaders(rateLimit) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import the statement.';
    return NextResponse.json(
      { error: message },
      { status: 400, headers: buildRateLimitHeaders(rateLimit) }
    );
  } finally {
    if (formData) {
      formData.delete('file');
    }
  }
}
