import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeAiResponse } from '@/lib/ai/sanitize';
import { buildMinimizedContext } from '@/lib/ai/buildContext';
import { AIService, type AIServiceMessage } from '@/lib/ai-service';
import { getResolvedAIModelSelection } from '@/lib/ai-model-storage';
import { sanitizeUserMessage } from '@/lib/ai-safety';

const advisorRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  portfolio: z.array(z.object({
    symbol: z.string().min(1),
    value: z.number(),
    allocation: z.number(),
    sector: z.string().optional(),
  })).default([]),
});

const SYSTEM_PROMPT = `You are Wealix AI Advisor.
Provide concise, practical investment analysis grounded only in the provided user context.
Do not claim certainty, do not fabricate data, and clearly distinguish risk from opportunity.
Keep responses under 200 words.`;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = advisorRequestSchema.safeParse(await req.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { message, portfolio } = payload.data;
  const minimizedContext = buildMinimizedContext(portfolio);
  const selection = await getResolvedAIModelSelection(userId);

  const messages: AIServiceMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: sanitizeUserMessage(
        `User question: ${message}\n\nPortfolio context:\n${JSON.stringify(minimizedContext, null, 2)}`
      ).sanitized,
    },
  ];

  try {
    const aiResult = await AIService.chat(messages, {
      models: selection.models,
      selectedModelId: selection.preferredModelId,
      fallbackModelId: selection.defaultModelId,
      maxTokens: 700,
      temperature: 0.2,
    });
    const safeText = sanitizeAiResponse(aiResult.content);

    return NextResponse.json({
      response: safeText,
      provider: aiResult.provider,
      modelId: aiResult.model.modelId,
      disclaimer: 'This is not financial advice. For informational purposes only.',
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const fallback = `I could not reach the AI provider right now. Based on your current context: diversification score is ${minimizedContext.diversificationScore}/100 with top holding weight ${minimizedContext.topHoldingWeight}%. Please retry in a moment.`;

    return NextResponse.json({
      response: fallback,
      error: error instanceof Error ? error.message : 'AI provider unavailable',
      source: 'deterministic-fallback',
      disclaimer: 'This is not financial advice. For informational purposes only.',
      generatedAt: new Date().toISOString(),
    }, { status: 200 });
  }
}
