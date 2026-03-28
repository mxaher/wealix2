import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import {
  isRemotePersistenceConfigured,
  loadRemoteWorkspace,
  saveRemoteWorkspace,
  type RemoteUserWorkspace,
} from '@/lib/remote-user-data';

const remoteUserWorkspaceSchema = z.object({
  appMode: z.enum(['demo', 'live']),
  notificationPreferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    priceAlerts: z.boolean(),
    budgetAlerts: z.boolean(),
    weeklyDigest: z.boolean(),
  }),
  notificationFeed: z.array(z.unknown()),
  incomeEntries: z.array(z.unknown()),
  expenseEntries: z.array(z.unknown()),
  receiptScans: z.array(z.unknown()),
  portfolioHoldings: z.array(z.unknown()),
  portfolioAnalysisHistory: z.array(z.unknown()),
  assets: z.array(z.unknown()),
  liabilities: z.array(z.unknown()),
  budgetLimits: z.array(z.unknown()),
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
    const { workspace, updatedAt } = await loadRemoteWorkspace(authResult.userId);
    return NextResponse.json({ workspace, updatedAt });
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
        { status: 400 }
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
        { status: 409 }
      );
    }

    return NextResponse.json({ workspace: result.workspace, updatedAt: result.updatedAt, saved: true });
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
