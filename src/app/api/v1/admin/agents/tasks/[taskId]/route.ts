import { NextRequest, NextResponse } from 'next/server';
import { callCompanyAgents } from '@/lib/company-agents-client';
import { requireAdminPanelApiAccess } from '@/lib/admin-panel-auth';

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const authError = requireAdminPanelApiAccess(request);
  if (authError) {
    return authError;
  }

  const { taskId } = (await params) as { taskId?: string };
  if (!taskId) {
    return NextResponse.json({ error: 'Task id is required.' }, { status: 400 });
  }
  try {
    const payload = await callCompanyAgents(`/api/v1/admin/agents/tasks/${taskId}`);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load task detail.' },
      { status: 503 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const authError = requireAdminPanelApiAccess(request);
  if (authError) {
    return authError;
  }

  const { taskId } = (await params) as { taskId?: string };
  if (!taskId) {
    return NextResponse.json({ error: 'Task id is required.' }, { status: 400 });
  }
  try {
    const payload = await callCompanyAgents(`/api/v1/admin/agents/tasks/${taskId}`, {
      method: 'DELETE',
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to cancel task.' },
      { status: 503 }
    );
  }
}
