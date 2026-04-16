// BUG #013 FIX — Unified AI advisor endpoint under /api/v1/ai/advisor
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeAiResponse } from '@/lib/ai/sanitize';
import { buildMinimizedContext } from '@/lib/ai/buildContext';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const minimizedContext = buildMinimizedContext(body.portfolio);

  // TODO: replace with your LLM client
  const aiResponse = { choices: [{ message: { content: 'Analysis placeholder' } }] };
  const rawText = aiResponse.choices[0].message.content ?? '';
  const safeText = sanitizeAiResponse(rawText);

  return NextResponse.json({
    response: safeText,
    disclaimer: 'This is not financial advice. For informational purposes only.',
    generatedAt: new Date().toISOString(),
  });
}
