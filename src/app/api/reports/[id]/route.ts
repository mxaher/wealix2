import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbFirst, dbRun } from '@/lib/db';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

type ReportRow = {
  id: string;
  r2_pdf_key: string;
};

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const report = await dbFirst<ReportRow>(
    'SELECT id, r2_pdf_key FROM generated_reports WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (!report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (report.r2_pdf_key) {
    try {
      const ctx = await getCloudflareContext();
      const storage = (ctx.env as Record<string, unknown>).WEALIX_STORAGE as R2Bucket | undefined;
      if (storage) {
        await storage.delete(report.r2_pdf_key);
      }
    } catch {
      // Non-critical — proceed with DB deletion even if R2 cleanup fails
    }
  }

  await dbRun('DELETE FROM generated_reports WHERE id = ? AND user_id = ?', [id, userId]);
  return NextResponse.json({ success: true });
}
