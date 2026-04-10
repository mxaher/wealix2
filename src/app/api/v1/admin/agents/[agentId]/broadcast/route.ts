import { NextRequest, NextResponse } from 'next/server';
import { callCompanyAgents } from '@/lib/company-agents-client';
import { requireAdminUser } from '@/lib/server-auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const admin = await requireAdminUser();
  if (admin.error) {
    return admin.error;
  }

  const { agentId } = await params;
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
