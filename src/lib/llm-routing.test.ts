import { afterEach, describe, expect, test } from 'bun:test';
import { getAiProviderEndpoint, getAiProviderModel, getAiRouteDecision, getGemmaApiMode } from '@/lib/llm-routing';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('llm routing', () => {
  test('defaults advisor traffic to NVIDIA primary mode', () => {
    delete process.env.AI_ADVISOR_STRATEGY;
    delete process.env.AI_ADVISOR_PRIMARY_PROVIDER;

    const decision = getAiRouteDecision('advisor', 'user_1');

    expect(decision).toEqual({
      strategy: 'primary',
      primaryProvider: 'nvidia',
      variant: 'nvidia',
    });
  });

  test('routes a deterministic slice to Gemma during A/B rollout', () => {
    process.env.AI_ADVISOR_STRATEGY = 'ab';
    process.env.AI_ADVISOR_AB_PERCENT = '100';
    process.env.AI_ADVISOR_AB_TEST_PROVIDER = 'gemma';

    const decision = getAiRouteDecision('advisor', 'user_1');

    expect(decision.strategy).toBe('ab');
    expect(decision.primaryProvider).toBe('gemma');
    expect(decision.variant).toBe('test_gemma');
  });

  test('normalizes fallback provider when it matches the primary', () => {
    process.env.AI_PORTFOLIO_STRATEGY = 'fallback';
    process.env.AI_PORTFOLIO_PRIMARY_PROVIDER = 'nvidia';
    process.env.AI_PORTFOLIO_FALLBACK_PROVIDER = 'nvidia';

    const decision = getAiRouteDecision('portfolio', 'user_2');

    expect(decision.secondaryProvider).toBe('gemma');
  });

  test('uses Gemma-specific model and endpoint overrides when provided', () => {
    process.env.GEMMA_PORTFOLIO_MODEL = 'google/gemma-4-31b-it';
    process.env.GEMMA_API_KEY = 'gemma-key';
    process.env.GEMMA_API_BASE = 'https://example.com/v1/';
    process.env.GEMMA_API_MODE = 'openai-compatible';

    expect(getAiProviderModel('portfolio', 'gemma')).toBe('google/gemma-4-31b-it');
    expect(getAiProviderEndpoint('gemma')).toEqual({
      apiKey: 'gemma-key',
      apiBase: 'https://example.com/v1',
    });
    expect(getGemmaApiMode()).toBe('openai-compatible');
  });
});
