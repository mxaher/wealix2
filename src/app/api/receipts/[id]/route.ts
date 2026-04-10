import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dbFirst, dbRun } from '@/lib/db';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

type ReceiptRow = {
  id: string;
  merchant: string | null;
  amount: number | null;
  currency: string;
  date: string | null;
  category: string | null;
  r2_image_key: string | null;
  created_at: number;
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
  const receipt = await dbFirst<ReceiptRow>(
    'SELECT id, merchant, amount, currency, date, category, r2_image_key, created_at FROM receipts WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (!receipt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let imageUrl: string | null = null;
  if (receipt.r2_image_key) {
    try {
      const ctx = await getCloudflareContext();
      const storage = (ctx.env as Record<string, unknown>).WEALIX_STORAGE as R2Bucket | undefined;
      if (storage) {
        // R2 does not expose createSignedUrl in the Workers binding — return a
        // path-based URL instead that your app can proxy or gate via middleware.
        imageUrl = `/api/receipts/${receipt.id}/image`;
      }
    } catch {
      // Non-critical
    }
  }

  return NextResponse.json({ receipt: { ...receipt, imageUrl } });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const receipt = await dbFirst<ReceiptRow>(
    'SELECT r2_image_key FROM receipts WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (receipt?.r2_image_key) {
    try {
      const ctx = await getCloudflareContext();
      const storage = (ctx.env as Record<string, unknown>).WEALIX_STORAGE as R2Bucket | undefined;
      if (storage) {
        await storage.delete(receipt.r2_image_key);
      }
    } catch {
      // Non-critical
    }
  }

  await dbRun('DELETE FROM receipts WHERE id = ? AND user_id = ?', [id, userId]);
  return NextResponse.json({ success: true });
}
