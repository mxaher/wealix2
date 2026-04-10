import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getResolvedAIModelSelection,
  getUserAIModelPreference,
  saveUserAIModelPreference,
} from '@/lib/ai-model-storage';
import { getAIModelById, resolveSelectedAIModelId } from '@/lib/ai-models';
import { getUserSubscriptionTier, requireAuthenticatedUser } from '@/lib/server-auth';

const patchSchema = z.object({
  modelId: z.string().min(1),
});

export async function GET() {
  const authResult = await requireAuthenticatedUser();
  if (authResult.error || !authResult.userId) {
    return authResult.error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [selection, tier] = await Promise.all([
    getResolvedAIModelSelection(authResult.userId),
    getUserSubscriptionTier(authResult.userId),
  ]);
  const selectedModelId = resolveSelectedAIModelId({
    models: selection.models,
    preferredModelId: selection.preferredModelId,
    userTier: tier,
  });

  return NextResponse.json({
    selectedModelId,
    defaultModelId: selection.defaultModelId,
  });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuthenticatedUser();
  if (authResult.error || !authResult.userId) {
    return authResult.error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid model preference payload.' }, { status: 400 });
  }

  const [selection, tier] = await Promise.all([
    getResolvedAIModelSelection(authResult.userId),
    getUserSubscriptionTier(authResult.userId),
  ]);
  const chosenModel = getAIModelById(selection.models, parsed.data.modelId);

  if (!chosenModel || !chosenModel.isActive) {
    return NextResponse.json({ error: 'The selected model is not available.' }, { status: 400 });
  }

  if (chosenModel.tier === 'premium' && tier !== 'pro') {
    return NextResponse.json({ error: 'Pro access is required for premium AI models.' }, { status: 403 });
  }

  const saved = await saveUserAIModelPreference(authResult.userId, chosenModel.id);
  return NextResponse.json({
    selectedModelId: saved.preferredModelId,
    lastSyncedAt: saved.updatedAt,
  });
}
