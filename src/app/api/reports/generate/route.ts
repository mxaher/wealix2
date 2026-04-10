import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { generateReport, getReportTitle, type ReportType } from '@/lib/report-generator';
import { loadRemoteWorkspace } from '@/lib/remote-user-data';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { dbRun } from '@/lib/db';

export const runtime = 'nodejs';

const generateSchema = z.object({
  reportType: z.enum(['monthly-summary', 'net-worth-report', 'investment-report']),
  options: z
    .object({
      month: z.string().optional(),
      aiInsights: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { reportType, options } = parsed.data;

  const workspaceRecord = await loadRemoteWorkspace(userId);
  if (!workspaceRecord.workspace) {
    return NextResponse.json({ error: 'No workspace data found' }, { status: 404 });
  }

  const pdfBytes = await generateReport(reportType as ReportType, workspaceRecord.workspace, options);

  const ctx = await getCloudflareContext();
  const storage = (ctx.env as Record<string, unknown>).WEALIX_STORAGE as R2Bucket | undefined;
  if (!storage) {
    return NextResponse.json({ error: 'Storage not available' }, { status: 500 });
  }

  const reportId = crypto.randomUUID();
  const r2Key = `reports/${userId}/${reportType}-${reportId}.pdf`;
  await storage.put(r2Key, pdfBytes, {
    httpMetadata: { contentType: 'application/pdf' },
  });

  const title = getReportTitle(reportType as ReportType, options);
  await dbRun(
    'INSERT INTO generated_reports (id, user_id, report_type, title, r2_pdf_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [reportId, userId, reportType, title, r2Key, Date.now()]
  );

  // R2 Workers binding does not expose createSignedUrl — return a path-based
  // download URL that streams bytes from R2 server-side.
  const downloadUrl = `/api/reports/${reportId}/download`;

  return NextResponse.json({ reportId, downloadUrl, title });
}
