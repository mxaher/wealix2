export type AIModelProvider = 'openai' | 'anthropic' | 'google' | 'nvidia' | 'gemma';
export type AIModelTier = 'standard' | 'premium';

export type AIModelConfig = {
  id: string;
  modelId: string;
  displayName: string;
  provider: AIModelProvider;
  isActive: boolean;
  isDefault: boolean;
  tier: AIModelTier;
  description: string | null;
  createdAt: string;
};

export type AIModelPreferenceData = {
  models: AIModelConfig[];
  selectedModelId: string | null;
  defaultModelId: string | null;
};

export type AIModelConfigInput = {
  modelId: string;
  displayName: string;
  provider: AIModelProvider;
  isActive?: boolean;
  isDefault?: boolean;
  tier?: AIModelTier;
  description?: string | null;
};

export type AIModelConfigPatch = Partial<AIModelConfigInput>;

export const DEFAULT_AI_MODELS: AIModelConfig[] = [
  {
    id: 'seed-nvidia-llama',
    modelId: 'meta/llama-3.3-70b-instruct',
    displayName: 'Llama 3.3 70B',
    provider: 'nvidia',
    isActive: true,
    isDefault: true,
    tier: 'standard',
    description: 'Balanced default model for fast financial guidance.',
    createdAt: '2026-04-10T00:00:00.000Z',
  },
  {
    id: 'seed-gpt-4o',
    modelId: 'gpt-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    isActive: true,
    isDefault: false,
    tier: 'standard',
    description: 'Fast, strong general reasoning for advisor chat.',
    createdAt: '2026-04-10T00:00:00.000Z',
  },
  {
    id: 'seed-claude-sonnet',
    modelId: 'claude-3-5-sonnet-latest',
    displayName: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    isActive: true,
    isDefault: false,
    tier: 'premium',
    description: 'Deeper analysis and stronger long-form synthesis.',
    createdAt: '2026-04-10T00:00:00.000Z',
  },
  {
    id: 'seed-gemini-pro',
    modelId: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    provider: 'google',
    isActive: true,
    isDefault: false,
    tier: 'standard',
    description: 'Useful when the conversation benefits from longer context.',
    createdAt: '2026-04-10T00:00:00.000Z',
  },
];

export function sanitizeAIModelConfig(input: Partial<AIModelConfig>): AIModelConfig {
  const provider = input.provider;
  const tier = input.tier;

  return {
    id: typeof input.id === 'string' && input.id.trim() ? input.id.trim() : crypto.randomUUID(),
    modelId: typeof input.modelId === 'string' ? input.modelId.trim() : '',
    displayName: typeof input.displayName === 'string' ? input.displayName.trim() : '',
    provider:
      provider === 'openai' || provider === 'anthropic' || provider === 'google' || provider === 'nvidia' || provider === 'gemma'
        ? provider
        : 'openai',
    isActive: input.isActive !== false,
    isDefault: input.isDefault === true,
    tier: tier === 'premium' ? 'premium' : 'standard',
    description: typeof input.description === 'string' && input.description.trim()
      ? input.description.trim()
      : null,
    createdAt: typeof input.createdAt === 'string' && input.createdAt ? input.createdAt : new Date().toISOString(),
  };
}

export function sanitizeAIModelConfigs(models: unknown): AIModelConfig[] {
  if (!Array.isArray(models)) {
    return DEFAULT_AI_MODELS;
  }

  const next = models
    .map((model) => sanitizeAIModelConfig((model ?? {}) as Partial<AIModelConfig>))
    .filter((model) => model.modelId && model.displayName);

  return next.length ? ensureSingleDefault(next) : DEFAULT_AI_MODELS;
}

export function ensureSingleDefault(models: AIModelConfig[]): AIModelConfig[] {
  const activeModels = models.filter((model) => model.isActive);
  const preferredDefault =
    activeModels.find((model) => model.isDefault) ??
    activeModels[0] ??
    models[0];

  return models.map((model) => ({
    ...model,
    isDefault: Boolean(preferredDefault && model.id === preferredDefault.id),
  }));
}

export function resolveDefaultAIModelId(models: AIModelConfig[]) {
  return models.find((model) => model.isDefault && model.isActive)?.id
    ?? models.find((model) => model.isActive)?.id
    ?? models[0]?.id
    ?? null;
}

export function resolveSelectedAIModelId(params: {
  models: AIModelConfig[];
  preferredModelId?: string | null;
  userTier?: 'none' | 'core' | 'pro';
}) {
  const { models, preferredModelId, userTier = 'pro' } = params;
  const activeModels = models.filter((model) => model.isActive);
  const preferred = activeModels.find((model) => model.modelId === preferredModelId || model.id === preferredModelId);

  if (preferred && (preferred.tier !== 'premium' || userTier === 'pro')) {
    return preferred.id;
  }

  return resolveDefaultAIModelId(activeModels.length ? activeModels : models);
}

export function getAIModelById(models: AIModelConfig[], id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return models.find((model) => model.id === id || model.modelId === id) ?? null;
}

export function upsertAIModel(models: AIModelConfig[], input: Partial<AIModelConfig>) {
  const nextModel = sanitizeAIModelConfig(input);
  const existingIndex = models.findIndex((model) => model.id === nextModel.id);
  const nextModels = existingIndex >= 0
    ? models.map((model, index) => (index === existingIndex ? { ...model, ...nextModel } : model))
    : [nextModel, ...models];

  return ensureSingleDefault(nextModels);
}
