import { NextRequest, NextResponse } from 'next/server';
import { requireInternalRouteSecret } from '@/lib/internal-route-auth';
import { extractNvidiaResponseText } from './response';

type NvidiaChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
      reasoning_content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const DEFAULT_NVIDIA_TIMEOUT_MS = 25_000;

export async function POST(request: NextRequest) {
  const authError = requireInternalRouteSecret(request);
  if (authError) {
    return authError;
  }

  const body = await request.json().catch(() => null) as
    | {
        prompt?: string;
        response_format?: 'json' | 'text';
        model?: string;
      }
    | null;

  const prompt = body?.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
  }

  const nvidiaApiKey = process.env.NVIDIA_API_KEY;
  const nvidiaBase = (process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
  const nvidiaModel = body?.model || process.env.NVIDIA_ADVISOR_MODEL || 'nvidia/llama-3.1-nemotron-ultra-253b-v1';

  if (!nvidiaApiKey) {
    return NextResponse.json({ error: 'NVIDIA_API_KEY is not configured.' }, { status: 503 });
  }

  let response: Response;
  try {
    response = await fetch(`${nvidiaBase}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nvidiaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: nvidiaModel,
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 1800,
        messages: [
          {
            role: 'system',
            content:
              body?.response_format === 'json'
                ? 'You are an internal Wealix company operating agent. Return only valid JSON and no markdown fencing.'
                : 'You are an internal Wealix company operating agent. Be concise, actionable, and factual.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(DEFAULT_NVIDIA_TIMEOUT_MS)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown NVIDIA request failure.';
    const status = /aborted|timeout/i.test(message) ? 504 : 502;
    return NextResponse.json(
      { error: status === 504 ? 'NVIDIA request timed out.' : `NVIDIA request failed: ${message}` },
      { status }
    );
  }

  const payload = await response.json().catch(() => null) as NvidiaChatResponse | null;
  if (!response.ok) {
    return NextResponse.json(
      { error: payload?.error?.message || `NVIDIA request failed with status ${response.status}` },
      { status: response.status }
    );
  }

  const content = extractNvidiaResponseText(payload);
  if (!content) {
    return NextResponse.json({ error: 'Empty NVIDIA response.' }, { status: 502 });
  }

  return NextResponse.json({ content });
}
