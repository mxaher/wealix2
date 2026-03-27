import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import {
  isRemotePersistenceConfigured,
  loadRemoteWorkspace,
  saveRemoteWorkspace,
  type RemoteUserWorkspace,
} from '@/lib/remote-user-data';

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
    const workspace = await loadRemoteWorkspace(authResult.userId);
    return NextResponse.json({ workspace });
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
    const workspace = body?.workspace as RemoteUserWorkspace | undefined;

    if (!workspace) {
      return NextResponse.json(
        {
          error: 'Workspace payload is required.',
          code: 'INVALID_WORKSPACE',
        },
        { status: 400 }
      );
    }

    const savedWorkspace = await saveRemoteWorkspace(authResult.userId, workspace);
    return NextResponse.json({ workspace: savedWorkspace, saved: true });
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
