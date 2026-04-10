import { NextRequest, NextResponse } from 'next/server';
import { callCompanyAgents } from '@/lib/company-agents-client';
import { requireAdminUser } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  const admin = await requireAdminUser();
  if (admin.error) {
    return admin.error;
  }

  const query = request.nextUrl.searchParams.toString();

  try {
    const payload = await callCompanyAgents(`/api/v1/admin/agents/tasks${query ? `?${query}` : ''}`);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load tasks.' },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminUser();
  if (admin.error) {
    return admin.error;
  }

  try {
    const payload = await callCompanyAgents('/api/v1/admin/agents/tasks', {
      method: 'POST',
      body: await request.text(),
      headers: { 'Content-Type': 'application/json' },
    });
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create task.' },
      { status: 503 }
    );
  }
}
