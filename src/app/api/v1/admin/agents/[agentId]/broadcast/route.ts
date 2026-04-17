import { NextRequest, NextResponse } from 'next/server';
import { callCompanyAgents } from '@/lib/company-agents-client';
import { requireAdminPanelApiAccess } from '@/lib/admin-panel-auth';

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const authError = requireAdminPanelApiAccess(request);
  if (authError) {
    return authError;
  }

  const { agentId } = (await params) as { agentId?: string };
  if (!agentId) {
    return NextResponse.json({ error: 'Agent id is required.' }, { status: 400 });
  }
  try {
    const payload = await callCompanyAgents(`/api/v1/admin/agents/${agentId}/broadcast`, {
      method: 'POST',
      body: await request.text(),
      headers: { 'Content-Type': 'application/json' },
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to send broadcast.' },
      { status: 503 }
    );
  }
}
