import { getPublicAppEnv } from '@/lib/env';

type AgentClientFormat = 'json' | 'text';

export async function runAgentModel<T>(params: {
  prompt: string;
  responseFormat?: AgentClientFormat;
  fallback: T;
}): Promise<T> {
  const appUrl = getPublicAppEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const response = await fetch(`${appUrl}/api/internal/ai/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-agent-secret': process.env.AGENTS_SECRET_KEY || '',
    },
    body: JSON.stringify({
      prompt: params.prompt,
      response_format: params.responseFormat ?? 'json',
    }),
    cache: 'no-store',
  }).catch(() => null);

  if (!response?.ok) {
    return params.fallback;
  }

  const payload = await response.json().catch(() => null) as { content?: string } | null;
  const content = payload?.content?.trim();
  if (!content) {
    return params.fallback;
  }

  if ((params.responseFormat ?? 'json') === 'text') {
    return content as T;
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    return params.fallback;
  }
}
