import {
  getAIModelById,
  type AIModelConfig,
  type AIModelProvider,
} from '@/lib/ai-models';

export type AIServiceMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type AIServiceResponse = {
  content: string;
  provider: AIModelProvider;
  model: AIModelConfig;
};

type ChatOptions = {
  models: AIModelConfig[];
  selectedModelId?: string | null;
  fallbackModelId?: string | null;
  temperature?: number;
  maxTokens?: number;
};

const DEFAULT_TIMEOUT_MS = 25_000;

function readEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function getProviderApiKey(provider: AIModelProvider) {
  if (provider === 'openai') return readEnv('OPENAI_API_KEY');
  if (provider === 'anthropic') return readEnv('ANTHROPIC_API_KEY');
  if (provider === 'google' || provider === 'gemma') return readEnv('GEMMA_API_KEY');
  return readEnv('NVIDIA_API_KEY');
}

function getProviderBaseUrl(provider: AIModelProvider) {
  if (provider === 'openai') return (readEnv('OPENAI_API_BASE') || 'https://api.openai.com/v1').replace(/\/$/, '');
  if (provider === 'anthropic') return (readEnv('ANTHROPIC_API_BASE') || 'https://api.anthropic.com/v1').replace(/\/$/, '');
  if (provider === 'google' || provider === 'gemma') {
    return (readEnv('GEMMA_API_BASE') || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
  }

  return (readEnv('NVIDIA_API_BASE') || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
}

function parseOpenAIContent(payload: any) {
  return payload?.choices?.[0]?.message?.content?.trim?.() || '';
}

function parseAnthropicContent(payload: any) {
  return Array.isArray(payload?.content)
    ? payload.content.map((item: { text?: string }) => item.text ?? '').join('').trim()
    : '';
}

function parseGoogleContent(payload: any) {
  return payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim() || '';
}

async function fetchJson(url: string, init: RequestInit) {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown AI request failure.';
    throw new Error(/aborted|timeout/i.test(message) ? 'AI request timed out.' : `AI request failed: ${message}`);
  }

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) {
    const errorMessage =
      payload?.error?.message ||
      payload?.message ||
      `AI request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload;
}

async function callOpenAI(model: AIModelConfig, messages: AIServiceMessage[], temperature: number, maxTokens: number) {
  const apiKey = getProviderApiKey('openai');
  if (!apiKey) {
    throw new Error('OPENAI API key is not configured.');
  }

  const payload = await fetchJson(`${getProviderBaseUrl('openai')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  const content = parseOpenAIContent(payload);
  if (!content) {
    throw new Error('The selected OpenAI model returned an empty response.');
  }

  return content;
}

async function callAnthropic(model: AIModelConfig, messages: AIServiceMessage[], temperature: number, maxTokens: number) {
  const apiKey = getProviderApiKey('anthropic');
  if (!apiKey) {
    throw new Error('ANTHROPIC API key is not configured.');
  }

  const [systemMessage, ...conversation] = messages;
  const payload = await fetchJson(`${getProviderBaseUrl('anthropic')}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.modelId,
      system: systemMessage?.role === 'system' ? systemMessage.content : undefined,
      messages: (systemMessage?.role === 'system' ? conversation : messages).map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      })),
      temperature,
      max_tokens: maxTokens,
    }),
  });
  const content = parseAnthropicContent(payload);
  if (!content) {
    throw new Error('The selected Anthropic model returned an empty response.');
  }

  return content;
}

async function callGoogle(model: AIModelConfig, messages: AIServiceMessage[], temperature: number, maxTokens: number) {
  const apiKey = getProviderApiKey(model.provider);
  if (!apiKey) {
    throw new Error('GOOGLE API key is not configured.');
  }

  const [systemMessage, ...conversation] = messages;
  const modelPath = model.modelId.startsWith('models/') ? model.modelId : `models/${model.modelId}`;
  const payload = await fetchJson(`${getProviderBaseUrl(model.provider)}/${modelPath}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: systemMessage?.role === 'system'
        ? { parts: [{ text: systemMessage.content }] }
        : undefined,
      contents: (systemMessage?.role === 'system' ? conversation : messages).map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        temperature,
        topP: 0.9,
        maxOutputTokens: maxTokens,
      },
    }),
  });
  const content = parseGoogleContent(payload);
  if (!content) {
    throw new Error('The selected Google model returned an empty response.');
  }

  return content;
}

async function callNvidia(model: AIModelConfig, messages: AIServiceMessage[], temperature: number, maxTokens: number) {
  const apiKey = getProviderApiKey('nvidia');
  if (!apiKey) {
    throw new Error('NVIDIA API key is not configured.');
  }

  const payload = await fetchJson(`${getProviderBaseUrl('nvidia')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.modelId,
      messages,
      temperature,
      top_p: 0.9,
      max_tokens: maxTokens,
    }),
  });
  const content = parseOpenAIContent(payload);
  if (!content) {
    throw new Error('The selected NVIDIA model returned an empty response.');
  }

  return content;
}

async function callProvider(model: AIModelConfig, messages: AIServiceMessage[], temperature: number, maxTokens: number) {
  if (model.provider === 'openai') {
    return callOpenAI(model, messages, temperature, maxTokens);
  }

  if (model.provider === 'anthropic') {
    return callAnthropic(model, messages, temperature, maxTokens);
  }

  if (model.provider === 'google' || model.provider === 'gemma') {
    return callGoogle(model, messages, temperature, maxTokens);
  }

  return callNvidia(model, messages, temperature, maxTokens);
}

export const AIService = {
  async chat(messages: AIServiceMessage[], options: ChatOptions): Promise<AIServiceResponse> {
    const { models, selectedModelId, fallbackModelId, temperature = 0.25, maxTokens = 1600 } = options;
    const selectedModel =
      getAIModelById(models, selectedModelId) ??
      getAIModelById(models, fallbackModelId) ??
      models.find((model) => model.isDefault && model.isActive) ??
      models.find((model) => model.isActive) ??
      null;

    if (!selectedModel) {
      throw new Error('No active AI model is configured.');
    }

    const fallbackModel =
      getAIModelById(models, fallbackModelId) ??
      models.find((model) => model.isDefault && model.isActive) ??
      models.find((model) => model.id !== selectedModel.id && model.isActive) ??
      null;

    try {
      return {
        content: await callProvider(selectedModel, messages, temperature, maxTokens),
        provider: selectedModel.provider,
        model: selectedModel,
      };
    } catch (error) {
      if (!fallbackModel || fallbackModel.id === selectedModel.id) {
        throw error;
      }

      return {
        content: await callProvider(fallbackModel, messages, temperature, maxTokens),
        provider: fallbackModel.provider,
        model: fallbackModel,
      };
    }
  },
};
