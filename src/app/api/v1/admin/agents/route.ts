import { NextResponse } from 'next/server';
import { callCompanyAgents } from '@/lib/company-agents-client';
import { requireAdminUser } from '@/lib/server-auth';

export async function GET() {
  const admin = await requireAdminUser();
  if (admin.error) {
    return admin.error;
  }

  try {
    const payload = await callCompanyAgents<{ agents: unknown[] }>('/api/v1/admin/agents');
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load agents.' },
      { status: 503 }
    );
  }
}
