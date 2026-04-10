import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAIModelConfig, listAIModelConfigs } from '@/lib/ai-model-storage';
import { requireAdminUser } from '@/lib/server-auth';

const createModelSchema = z.object({
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.enum(['openai', 'anthropic', 'google', 'nvidia', 'gemma']),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  tier: z.enum(['standard', 'premium']).optional(),
  description: z.string().nullable().optional(),
});

export async function GET() {
  const admin = await requireAdminUser();
  if (admin.error) {
    return admin.error;
  }

  const record = await listAIModelConfigs();
  return NextResponse.json({
    models: record.models,
    defaultModelId: record.models.find((model) => model.isDefault)?.id ?? null,
    updatedAt: record.updatedAt,
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminUser();
  if (admin.error) {
    return admin.error;
  }

  const parsed = createModelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid AI model payload.' }, { status: 400 });
  }

  const record = await createAIModelConfig(parsed.data);
  return NextResponse.json({
    models: record.models,
    defaultModelId: record.models.find((model) => model.isDefault)?.id ?? null,
    updatedAt: record.updatedAt,
  });
}
