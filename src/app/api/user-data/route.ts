import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildRateLimitHeaders, enforceRateLimit } from '@/lib/rate-limit';
import { getE2ETestUser, isE2EAuthEnabled } from '@/lib/e2e-auth';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import {
  isRemotePersistenceConfigured,
  loadRemoteWorkspace,
  saveRemoteWorkspace,
  type RemoteUserWorkspace,
} from '@/lib/remote-user-data';
import { START_PAGE_VALUES } from '@/lib/start-page';

const remoteUserWorkspaceSchema = z.object({
  appMode: z.enum(['demo', 'live']),
  startPage: z.enum(START_PAGE_VALUES),
  notificationPreferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
    whatsapp: z.boolean(),
    priceAlerts: z.boolean(),
    budgetAlerts: z.boolean(),
    planningUpdates: z.boolean(),
    statusChanges: z.boolean(),
    reminders: z.boolean(),
    weeklyDigest: z.boolean(),
    preferredChannel: z.enum(['push', 'email', 'sms', 'whatsapp']),
    phoneNumber: z.string(),
    useSamePhoneNumberForWhatsApp: z.boolean(),
    whatsappNumber: z.string(),
  }),
  notificationFeed: z.array(z.unknown()),
  incomeEntries: z.array(z.unknown()),
  expenseEntries: z.array(z.unknown()),
  receiptScans: z.array(z.unknown()),
  portfolioHoldings: z.array(z.unknown()),
  portfolioAnalysisHistory: z.array(z.unknown()),
  investmentDecisionHistory: z.array(z.unknown()),
  assets: z.array(z.unknown()),
  liabilities: z.array(z.unknown()),
  budgetLimits: z.array(z.unknown()),
  recurringObligations: z.array(z.unknown()).optional(),
  oneTimeExpenses: z.array(z.unknown()).optional(),
  savingsAccounts: z.array(z.unknown()).optional(),
});

function unavailableResponse() {
  return NextResponse.json(
    {
      error: 'Persistent user data storage is not configured. Bind Cloudflare D1 as WEALIX_DB.',
      code: 'PERSISTENCE_NOT_CONFIGURED',
    },
    { status: 503 }
  );
}

function isRateLimitExemptUser(userId: string) {
  return isE2EAuthEnabled() && userId === getE2ETestUser().id;
}

export async function GET() {
  const authResult = await requireAuthenticatedUser();
  if (authResult.error) {
    return authResult.error;
  }

  if (!authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (!isRemotePersistenceConfigured()) {
    return unavailableResponse();
  }

  try {
    const rateLimit = isRateLimitExemptUser(authResult.userId)
      ? null
      : await enforceRateLimit(`user-data:get:${authResult.userId}`, 120, 60 * 60 * 1000);
    if (rateLimit && !rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    const { workspace, updatedAt } = await loadRemoteWorkspace(authResult.userId);
    return NextResponse.json(
      { workspace, updatedAt },
      { headers: rateLimit ? buildRateLimitHeaders(rateLimit) : undefined }
    );
  } catch (error) {
    console.error('[user-data] load failed', error);
    return NextResponse.json(
      {
        error: 'Failed to load user data.',
        code: 'LOAD_FAILED',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAuthenticatedUser();
  if (authResult.error) {
    return authResult.error;
  }

  if (!authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (!isRemotePersistenceConfigured()) {
    return unavailableResponse();
  }

  try {
    const rateLimit = isRateLimitExemptUser(authResult.userId)
      ? null
      : await enforceRateLimit(`user-data:put:${authResult.userId}`, 60, 60 * 60 * 1000);
    if (rateLimit && !rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const knownUpdatedAt =
      typeof body?.knownUpdatedAt === 'string' || body?.knownUpdatedAt === null
        ? (body.knownUpdatedAt as string | null)
        : undefined;

    const parsed = remoteUserWorkspaceSchema.safeParse(body?.workspace);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Workspace payload is invalid.',
          code: 'INVALID_WORKSPACE',
        },
        { status: 400, headers: rateLimit ? buildRateLimitHeaders(rateLimit) : undefined }
      );
    }

    if (parsed.data.appMode !== 'live') {
      console.warn('[user-data] blocked demo workspace write', {
        clerkUserId: authResult.userId,
        appMode: parsed.data.appMode,
      });
      return NextResponse.json(
        {
          error: 'Demo mode data cannot be persisted to the live workspace.',
          code: 'DEMO_WRITE_BLOCKED',
        },
        { status: 409, headers: rateLimit ? buildRateLimitHeaders(rateLimit) : undefined }
      );
    }

    const result = await saveRemoteWorkspace(authResult.userId, parsed.data as RemoteUserWorkspace, knownUpdatedAt);

    if (knownUpdatedAt && result.updatedAt && knownUpdatedAt !== result.updatedAt) {
      return NextResponse.json(
        {
          error: 'Remote workspace has changed in another session.',
          code: 'WORKSPACE_CONFLICT',
          workspace: result.workspace,
          updatedAt: result.updatedAt,
        },
        { status: 409, headers: rateLimit ? buildRateLimitHeaders(rateLimit) : undefined }
      );
    }

    return NextResponse.json(
      { workspace: result.workspace, updatedAt: result.updatedAt, saved: true },
      { headers: rateLimit ? buildRateLimitHeaders(rateLimit) : undefined }
    );
  } catch (error) {
    console.error('[user-data] save failed', error);
    return NextResponse.json(
      {
        error: 'Failed to save user data.',
        code: 'SAVE_FAILED',
      },
      { status: 500 }
    );
  }
}
