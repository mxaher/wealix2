export type AiSurface = 'advisor' | 'portfolio';
export type AiProvider = 'nvidia' | 'gemma';
export type AiStrategy = 'primary' | 'fallback' | 'merge' | 'ab';
export type GemmaApiMode = 'google-native' | 'openai-compatible';

export type AiRouteDecision = {
  strategy: AiStrategy;
  primaryProvider: AiProvider;
  secondaryProvider?: AiProvider;
  variant: string;
};

function readEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function parseProvider(value: string | undefined, fallback: AiProvider): AiProvider {
  return value === 'gemma' || value === 'nvidia' ? value : fallback;
}

function parseStrategy(value: string | undefined): AiStrategy {
  return value === 'fallback' || value === 'merge' || value === 'ab' ? value : 'primary';
}

function parsePercent(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function alternateProvider(provider: AiProvider): AiProvider {
  return provider === 'nvidia' ? 'gemma' : 'nvidia';
}

function bucketUser(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) % 100;
}

function surfacePrefix(surface: AiSurface) {
  return `AI_${surface.toUpperCase()}`;
}

export function getAiRouteDecision(surface: AiSurface, subjectId: string): AiRouteDecision {
  const prefix = surfacePrefix(surface);
  const primaryProvider = parseProvider(readEnv(`${prefix}_PRIMARY_PROVIDER`), 'nvidia');
  const configuredFallback = parseProvider(
    readEnv(`${prefix}_FALLBACK_PROVIDER`),
    alternateProvider(primaryProvider)
  );
  const fallbackProvider = configuredFallback === primaryProvider
    ? alternateProvider(primaryProvider)
    : configuredFallback;
  const strategy = parseStrategy(readEnv(`${prefix}_STRATEGY`));

  if (strategy === 'fallback') {
    return {
      strategy,
      primaryProvider,
      secondaryProvider: fallbackProvider,
      variant: `${primaryProvider}_then_${fallbackProvider}`,
    };
  }

  if (strategy === 'merge') {
    return {
      strategy,
      primaryProvider,
      secondaryProvider: fallbackProvider,
      variant: `merge_${primaryProvider}_${fallbackProvider}`,
    };
  }

  if (strategy === 'ab') {
    const testProvider = parseProvider(
      readEnv(`${prefix}_AB_TEST_PROVIDER`),
      fallbackProvider
    );
    const abProvider = testProvider === primaryProvider ? fallbackProvider : testProvider;
    const abPercent = parsePercent(readEnv(`${prefix}_AB_PERCENT`));
    const selectedProvider = bucketUser(`${surface}:${subjectId}`) < abPercent ? abProvider : primaryProvider;

    return {
      strategy,
      primaryProvider: selectedProvider,
      secondaryProvider: selectedProvider === primaryProvider ? undefined : fallbackProvider,
      variant: selectedProvider === primaryProvider
        ? `control_${primaryProvider}`
        : `test_${selectedProvider}`,
    };
  }

  return {
    strategy: 'primary',
    primaryProvider,
    variant: primaryProvider,
  };
}

export function getAiProviderModel(surface: AiSurface, provider: AiProvider) {
  if (provider === 'gemma') {
    return readEnv(`GEMMA_${surface.toUpperCase()}_MODEL`) || 'gemma-3-27b-it';
  }

  if (surface === 'advisor') {
    return readEnv('NVIDIA_ADVISOR_MODEL') || readEnv('NVIDIA_MODEL') || 'meta/llama-3.3-70b-instruct';
  }

  return readEnv('NVIDIA_PORTFOLIO_MODEL') || readEnv('NVIDIA_MODEL') || 'meta/llama-3.3-70b-instruct';
}

export function getAiProviderEndpoint(provider: AiProvider) {
  if (provider === 'gemma') {
    return {
      apiKey: readEnv('GEMMA_API_KEY') || readEnv('NVIDIA_API_KEY'),
      apiBase: (readEnv('GEMMA_API_BASE') || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, ''),
    };
  }

  return {
    apiKey: readEnv('NVIDIA_API_KEY'),
    apiBase: (readEnv('NVIDIA_API_BASE') || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, ''),
  };
}

export function getGemmaApiMode(): GemmaApiMode {
  const configured = readEnv('GEMMA_API_MODE');
  if (configured === 'openai-compatible' || configured === 'google-native') {
    return configured;
  }

  const apiBase = readEnv('GEMMA_API_BASE');
  if (/generativelanguage\.googleapis\.com/i.test(apiBase)) {
    return 'google-native';
  }

  return 'google-native';
}

export function buildAiRouteHeaders(decision: AiRouteDecision, provider: AiProvider, extra?: Record<string, string>) {
  return {
    'X-Wealix-AI-Strategy': decision.strategy,
    'X-Wealix-AI-Variant': decision.variant,
    'X-Wealix-AI-Provider': provider,
    ...extra,
  };
}
