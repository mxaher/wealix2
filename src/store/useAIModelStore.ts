'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_AI_MODELS,
  resolveDefaultAIModelId,
  resolveSelectedAIModelId,
  sanitizeAIModelConfigs,
  type AIModelConfig,
  type AIModelConfigInput,
} from '@/lib/ai-models';

const AI_MODEL_STORAGE_KEY = 'wealix-ai-models-v1';
const AI_MODEL_BROADCAST_KEY = 'wealix-ai-models-broadcast';

type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error';

type AIModelStoreData = {
  models: AIModelConfig[];
  selectedModelId: string | null;
  defaultModelId: string | null;
};

type AIModelStoreState = {
  data: AIModelStoreData;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
  hasLoadedFromBackend: boolean;
  loadFromBackend: () => Promise<void>;
  selectModel: (modelId: string) => Promise<void>;
  refreshModels: () => Promise<void>;
  createModel: (input: AIModelConfigInput) => Promise<void>;
  updateModel: (id: string, patch: Partial<AIModelConfigInput>) => Promise<void>;
  clearError: () => void;
};

type BroadcastPayload = {
  data: AIModelStoreData;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
};

let listenersInitialized = false;
let channel: BroadcastChannel | null = null;

function broadcastState(payload: BroadcastPayload) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!channel && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('wealix-ai-models');
    }

    channel?.postMessage(payload);
    window.localStorage.setItem(
      AI_MODEL_BROADCAST_KEY,
      JSON.stringify({ ...payload, emittedAt: Date.now() })
    );
  } catch {
    // ignore broadcast failures
  }
}

function normalizeData(input: Partial<AIModelStoreData>): AIModelStoreData {
  const models = sanitizeAIModelConfigs(input.models ?? DEFAULT_AI_MODELS);
  const defaultModelId = resolveDefaultAIModelId(models);
  const selectedModelId = resolveSelectedAIModelId({
    models,
    preferredModelId: input.selectedModelId ?? defaultModelId,
    userTier: 'pro',
  });

  return {
    models,
    defaultModelId,
    selectedModelId,
  };
}

function ensureBrowserListeners() {
  if (listenersInitialized || typeof window === 'undefined') {
    return;
  }

  listenersInitialized = true;

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel('wealix-ai-models');
    channel.addEventListener('message', (event) => {
      const payload = event.data as BroadcastPayload | undefined;
      if (!payload?.data) {
        return;
      }

      useAIModelStore.setState((state) => ({
        ...state,
        data: normalizeData(payload.data),
        lastSyncedAt: payload.lastSyncedAt,
        syncStatus: payload.syncStatus,
        error: null,
      }));
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== AI_MODEL_BROADCAST_KEY || !event.newValue) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue) as BroadcastPayload;
      if (!payload?.data) {
        return;
      }

      useAIModelStore.setState((state) => ({
        ...state,
        data: normalizeData(payload.data),
        lastSyncedAt: payload.lastSyncedAt,
        syncStatus: payload.syncStatus,
        error: null,
      }));
    } catch {
      // ignore malformed cross-tab payloads
    }
  });
}

async function fetchModels() {
  const [modelsResponse, preferenceResponse] = await Promise.all([
    fetch('/api/v1/ai/models', { cache: 'no-store' }),
    fetch('/api/v1/user/preferences/ai-model', { cache: 'no-store' }),
  ]);

  const modelsPayload = await modelsResponse.json().catch(() => null) as
    | { models?: AIModelConfig[]; defaultModelId?: string | null; error?: string }
    | null;
  const preferencePayload = await preferenceResponse.json().catch(() => null) as
    | { selectedModelId?: string | null; error?: string }
    | null;

  if (!modelsResponse.ok || !modelsPayload?.models) {
    throw new Error(modelsPayload?.error || 'Unable to load AI models.');
  }

  const normalized = normalizeData({
    models: modelsPayload.models,
    defaultModelId: modelsPayload.defaultModelId ?? null,
    selectedModelId: preferencePayload?.selectedModelId ?? modelsPayload.defaultModelId ?? null,
  });

  return {
    data: normalized,
    lastSyncedAt: new Date().toISOString(),
  };
}

export const useAIModelStore = create<AIModelStoreState>()(
  persist(
    (set, get) => ({
      data: normalizeData({
        models: DEFAULT_AI_MODELS,
        selectedModelId: resolveDefaultAIModelId(DEFAULT_AI_MODELS),
      }),
      isLoading: false,
      error: null,
      lastSyncedAt: null,
      syncStatus: 'idle',
      hasLoadedFromBackend: false,
      loadFromBackend: async () => {
        ensureBrowserListeners();
        set((state) => ({ ...state, isLoading: true, error: null }));

        try {
          const payload = await fetchModels();
          set((state) => ({
            ...state,
            data: payload.data,
            isLoading: false,
            error: null,
            lastSyncedAt: payload.lastSyncedAt,
            syncStatus: 'saved',
            hasLoadedFromBackend: true,
          }));

          broadcastState({
            data: payload.data,
            lastSyncedAt: payload.lastSyncedAt,
            syncStatus: 'saved',
          });
        } catch (error) {
          set((state) => ({
            ...state,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unable to load AI models.',
            syncStatus: 'error',
            hasLoadedFromBackend: true,
          }));
        }
      },
      selectModel: async (modelId) => {
        ensureBrowserListeners();
        const current = get().data;
        const previous = current.selectedModelId;
        const next = normalizeData({
          ...current,
          selectedModelId: modelId,
        });

        set((state) => ({
          ...state,
          data: next,
          syncStatus: 'syncing',
          error: null,
        }));
        broadcastState({
          data: next,
          lastSyncedAt: get().lastSyncedAt,
          syncStatus: 'syncing',
        });

        try {
          const response = await fetch('/api/v1/user/preferences/ai-model', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelId }),
          });
          const payload = await response.json().catch(() => null) as
            | { selectedModelId?: string | null; error?: string }
            | null;

          if (!response.ok) {
            throw new Error(payload?.error || 'Unable to save AI model preference.');
          }

          const synced = normalizeData({
            ...next,
            selectedModelId: payload?.selectedModelId ?? modelId,
          });

          set((state) => ({
            ...state,
            data: synced,
            syncStatus: 'saved',
            error: null,
            lastSyncedAt: new Date().toISOString(),
          }));
          broadcastState({
            data: synced,
            lastSyncedAt: new Date().toISOString(),
            syncStatus: 'saved',
          });
        } catch (error) {
          const rolledBack = normalizeData({
            ...current,
            selectedModelId: previous,
          });

          set((state) => ({
            ...state,
            data: rolledBack,
            syncStatus: 'error',
            error: error instanceof Error ? error.message : 'Unable to save AI model preference.',
          }));
          broadcastState({
            data: rolledBack,
            lastSyncedAt: get().lastSyncedAt,
            syncStatus: 'error',
          });
          throw error;
        }
      },
      refreshModels: async () => {
        await get().loadFromBackend();
      },
      createModel: async (input) => {
        set((state) => ({ ...state, isLoading: true, error: null }));
        try {
          const response = await fetch('/api/v1/admin/ai/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          const payload = await response.json().catch(() => null) as
            | { models?: AIModelConfig[]; defaultModelId?: string | null; error?: string }
            | null;

          if (!response.ok || !payload?.models) {
            throw new Error(payload?.error || 'Unable to create AI model.');
          }

          const next = normalizeData({
            models: payload.models,
            selectedModelId: get().data.selectedModelId,
            defaultModelId: payload.defaultModelId ?? null,
          });

          set((state) => ({
            ...state,
            data: next,
            isLoading: false,
            syncStatus: 'saved',
            error: null,
            lastSyncedAt: new Date().toISOString(),
          }));
          broadcastState({
            data: next,
            lastSyncedAt: new Date().toISOString(),
            syncStatus: 'saved',
          });
        } catch (error) {
          set((state) => ({
            ...state,
            isLoading: false,
            syncStatus: 'error',
            error: error instanceof Error ? error.message : 'Unable to create AI model.',
          }));
          throw error;
        }
      },
      updateModel: async (id, patch) => {
        set((state) => ({ ...state, isLoading: true, error: null }));
        try {
          const response = await fetch(`/api/v1/admin/ai/models/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          });
          const payload = await response.json().catch(() => null) as
            | { models?: AIModelConfig[]; defaultModelId?: string | null; error?: string }
            | null;

          if (!response.ok || !payload?.models) {
            throw new Error(payload?.error || 'Unable to update AI model.');
          }

          const currentSelected = get().data.selectedModelId;
          const next = normalizeData({
            models: payload.models,
            selectedModelId: currentSelected,
            defaultModelId: payload.defaultModelId ?? null,
          });

          set((state) => ({
            ...state,
            data: next,
            isLoading: false,
            syncStatus: 'saved',
            error: null,
            lastSyncedAt: new Date().toISOString(),
          }));
          broadcastState({
            data: next,
            lastSyncedAt: new Date().toISOString(),
            syncStatus: 'saved',
          });
        } catch (error) {
          set((state) => ({
            ...state,
            isLoading: false,
            syncStatus: 'error',
            error: error instanceof Error ? error.message : 'Unable to update AI model.',
          }));
          throw error;
        }
      },
      clearError: () => set((state) => ({ ...state, error: null })),
    }),
    {
      name: AI_MODEL_STORAGE_KEY,
      partialize: (state) => ({
        data: state.data,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
