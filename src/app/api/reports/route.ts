import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbQuery } from '@/lib/db';


type ReportRow = {
  id: string;
  report_type: string;
  title: string;
  r2_pdf_key: string;
  created_at: number;
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const reports = await dbQuery<ReportRow>(
    'SELECT id, report_type, title, r2_pdf_key, created_at FROM generated_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId]
  );

  return NextResponse.json({ reports });
}
