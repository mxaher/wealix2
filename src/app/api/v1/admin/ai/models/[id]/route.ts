import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateAIModelConfig } from '@/lib/ai-model-storage';
import { requireAdminUser } from '@/lib/server-auth';

const updateSchema = z.object({
  modelId: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  provider: z.enum(['openai', 'anthropic', 'google', 'nvidia', 'gemma']).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  tier: z.enum(['standard', 'premium']).optional(),
  description: z.string().nullable().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (admin.error) {
    return admin.error;
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid AI model payload.' }, { status: 400 });
  }

  try {
    const record = await updateAIModelConfig(id, parsed.data);
    return NextResponse.json({
      models: record.models,
      defaultModelId: record.models.find((model) => model.isDefault)?.id ?? null,
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update AI model.' },
      { status: 404 }
    );
  }
}
