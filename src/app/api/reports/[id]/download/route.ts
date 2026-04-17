import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbFirst } from '@/lib/db';
import { getOptionalStorageBucket } from '@/lib/cloudflare-env';


type ReportRow = {
  id: string;
  title: string;
  r2_pdf_key: string;
};

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = (await params) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: 'Report id is required' }, { status: 400 });
  }
  const report = await dbFirst<ReportRow>(
    'SELECT id, title, r2_pdf_key FROM generated_reports WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (!report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const storage = await getOptionalStorageBucket();
  if (!storage) {
    return NextResponse.json({ error: 'Storage not available' }, { status: 500 });
  }

  const object = await storage.get(report.r2_pdf_key);
  if (!object) {
    return NextResponse.json({ error: 'PDF not found in storage' }, { status: 404 });
  }

  const filename = `${report.title.replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '-')}.pdf`;

  return new NextResponse(object.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
