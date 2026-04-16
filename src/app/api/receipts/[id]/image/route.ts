import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { dbFirst } from '@/lib/db';

type ReceiptImageRow = {
  id: string;
  r2_image_key: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const receipt = await dbFirst<ReceiptImageRow>(
    'SELECT id, r2_image_key FROM receipts WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (!receipt?.r2_image_key) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ctx = await getCloudflareContext();
  const storage = (ctx.env as Record<string, unknown>).WEALIX_STORAGE as R2Bucket | undefined;
  if (!storage) {
    return NextResponse.json({ error: 'Storage not available' }, { status: 500 });
  }

  const object = await storage.get(receipt.r2_image_key);
  if (!object?.body) {
    return NextResponse.json({ error: 'Image not found in storage' }, { status: 404 });
  }

  return new NextResponse(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
    },
  });
}
