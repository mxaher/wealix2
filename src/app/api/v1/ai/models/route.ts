import { NextResponse } from 'next/server';
import { getResolvedAIModelSelection } from '@/lib/ai-model-storage';
import { requireAuthenticatedUser, getUserSubscriptionTier } from '@/lib/server-auth';

export async function GET() {
  const authResult = await requireAuthenticatedUser();
  if (authResult.error || !authResult.userId) {
    return authResult.error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [selection, tier] = await Promise.all([
    getResolvedAIModelSelection(authResult.userId),
    getUserSubscriptionTier(authResult.userId),
  ]);

  return NextResponse.json({
    models: selection.models.filter((model) => model.isActive && (model.tier !== 'premium' || tier === 'pro')),
    defaultModelId: selection.defaultModelId,
    selectedModelId: selection.preferredModelId,
  });
}
