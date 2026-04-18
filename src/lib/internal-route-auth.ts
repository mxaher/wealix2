import { NextRequest, NextResponse } from 'next/server';
import { readRuntimeEnv } from '@/lib/runtime-env';

export function requireInternalRouteSecret(
  request: NextRequest,
  headerName = 'x-agent-secret',
  envVarName = 'AGENTS_SECRET_KEY'
) {
  const providedSecret = request.headers.get(headerName);
  const expectedSecret = readRuntimeEnv(envVarName);

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
