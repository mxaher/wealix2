import { NextRequest, NextResponse } from 'next/server';
import { callCompanyAgents } from '@/lib/company-agents-client';
import { requireAdminUser } from '@/lib/server-auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const admin = await requireAdminUser();
  if (admin.error) {
    return admin.error;
  }

  const { taskId } = await params;
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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const admin = await requireAdminUser();
  if (admin.error) {
    return admin.error;
  }

  const { taskId } = await params;
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
