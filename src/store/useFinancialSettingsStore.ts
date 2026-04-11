'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_FINANCIAL_SETTINGS,
  mergeFinancialSettings,
  type FinancialSettings,
  type FinancialSettingsPatch,
} from '@/lib/financial-settings';

const FINANCIAL_SETTINGS_STORAGE_KEY = 'wealix-financial-settings-v1';
const FINANCIAL_SETTINGS_BROADCAST_KEY = 'wealix-financial-settings-broadcast';

type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error';

type FinancialSettingsStoreState = {
  data: FinancialSettings;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
  hasLoadedFromBackend: boolean;
  lastServerData: FinancialSettings | null;
  loadFromBackend: () => Promise<void>;
  bootstrap: (settings: FinancialSettings) => void;
  replaceData: (settings: FinancialSettings, options?: { broadcast?: boolean; syncStatus?: SyncStatus }) => void;
  updateField: <K extends keyof FinancialSettings>(key: K, value: FinancialSettings[K]) => void;
  updateFields: (patch: FinancialSettingsPatch) => void;
  initializeFromOnboarding: (patch: FinancialSettingsPatch) => Promise<void>;
  syncToBackend: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
};

type BroadcastPayload = {
  data: FinancialSettings;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
};

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let queuedPatch: FinancialSettingsPatch = {};
let listenerInitialized = false;
let channel: BroadcastChannel | null = null;

function broadcastState(payload: BroadcastPayload) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!channel && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('wealix-financial-settings');
    }

    channel?.postMessage(payload);
    window.localStorage.setItem(
      FINANCIAL_SETTINGS_BROADCAST_KEY,
      JSON.stringify({ ...payload, emittedAt: Date.now() })
    );
  } catch {
    // Non-blocking.
  }
}

function ensureBrowserListeners() {
  if (listenerInitialized || typeof window === 'undefined') {
    return;
  }

  listenerInitialized = true;

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel('wealix-financial-settings');
    channel.addEventListener('message', (event) => {
      const payload = event.data as BroadcastPayload | undefined;
      if (!payload?.data) {
        return;
      }

      useFinancialSettingsStore.setState((state) => ({
        ...state,
        data: payload.data,
        lastSyncedAt: payload.lastSyncedAt,
        syncStatus: payload.syncStatus,
        error: null,
      }));
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== FINANCIAL_SETTINGS_BROADCAST_KEY || !event.newValue) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue) as BroadcastPayload;
      if (!payload?.data) {
        return;
      }

      useFinancialSettingsStore.setState((state) => ({
        ...state,
        data: payload.data,
        lastSyncedAt: payload.lastSyncedAt,
        syncStatus: payload.syncStatus,
        error: null,
      }));
    } catch {
      // Ignore malformed payloads.
    }
  });

  window.addEventListener('online', () => {
    void useFinancialSettingsStore.getState().syncToBackend();
  });
}

async function flushSync() {
  const store = useFinancialSettingsStore.getState();
  const patch = queuedPatch;

  if (!Object.keys(patch).length) {
    return;
  }

  queuedPatch = {};
  useFinancialSettingsStore.setState((state) => ({
    ...state,
    syncStatus: 'syncing',
    error: null,
  }));

  const rollbackData = store.lastServerData ?? store.data;

  try {
    const response = await fetch('/api/v1/user/financial-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    const payload = await response.json().catch(() => null) as
      | { settings?: FinancialSettings; lastSyncedAt?: string; error?: string }
      | null;

    if (!response.ok || !payload?.settings) {
      throw new Error(payload?.error || 'Unable to save financial settings.');
    }

    useFinancialSettingsStore.setState((state) => ({
      ...state,
      data: payload.settings!,
      lastServerData: payload.settings!,
      lastSyncedAt: payload.lastSyncedAt ?? new Date().toISOString(),
      syncStatus: 'saved',
      error: null,
    }));

    broadcastState({
      data: payload.settings,
      lastSyncedAt: payload.lastSyncedAt ?? new Date().toISOString(),
      syncStatus: 'saved',
    });
  } catch (error) {
    useFinancialSettingsStore.setState((state) => ({
      ...state,
      data: rollbackData,
      syncStatus: 'error',
      error: error instanceof Error ? error.message : 'Unable to save financial settings.',
    }));

    broadcastState({
      data: rollbackData,
      lastSyncedAt: store.lastSyncedAt,
      syncStatus: 'error',
    });
  }
}

function scheduleSync(patch: FinancialSettingsPatch) {
  ensureBrowserListeners();
  queuedPatch = {
    ...queuedPatch,
    ...patch,
  };

  if (typeof window === 'undefined') {
    return;
  }

  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    syncTimer = null;
    void flushSync();
  }, 500);
}

export const useFinancialSettingsStore = create<FinancialSettingsStoreState>()(
  persist(
    (set, get) => ({
      data: DEFAULT_FINANCIAL_SETTINGS,
      isLoading: false,
      error: null,
      lastSyncedAt: null,
      syncStatus: 'idle',
      hasLoadedFromBackend: false,
      lastServerData: null,
      loadFromBackend: async () => {
        ensureBrowserListeners();
        set((state) => ({ ...state, isLoading: true, error: null }));

        try {
          const response = await fetch('/api/v1/user/financial-settings', {
            method: 'GET',
            cache: 'no-store',
          });
          const payload = await response.json().catch(() => null) as
            | { settings?: FinancialSettings; lastSyncedAt?: string; error?: string }
            | null;

          if (!response.ok || !payload?.settings) {
            throw new Error(payload?.error || 'Unable to load financial settings.');
          }

          set((state) => ({
            ...state,
            data: payload.settings!,
            isLoading: false,
            error: null,
            lastSyncedAt: payload.lastSyncedAt ?? new Date().toISOString(),
            syncStatus: 'saved',
            hasLoadedFromBackend: true,
            lastServerData: payload.settings!,
          }));

          broadcastState({
            data: payload.settings,
            lastSyncedAt: payload.lastSyncedAt ?? new Date().toISOString(),
            syncStatus: 'saved',
          });
        } catch (error) {
          set((state) => ({
            ...state,
            isLoading: false,
            hasLoadedFromBackend: true,
            syncStatus: state.lastSyncedAt ? 'saved' : 'error',
            error: error instanceof Error ? error.message : 'Unable to load financial settings.',
          }));
        }
      },
      bootstrap: (settings) =>
        set((state) => {
          if (state.hasLoadedFromBackend || state.lastSyncedAt) {
            return state;
          }

          return {
            ...state,
            data: settings,
            lastServerData: settings,
          };
        }),
      replaceData: (settings, options) => {
        ensureBrowserListeners();
        set((state) => ({
          ...state,
          data: settings,
          error: null,
          syncStatus: options?.syncStatus ?? state.syncStatus,
        }));

        if (options?.broadcast !== false) {
          broadcastState({
            data: settings,
            lastSyncedAt: get().lastSyncedAt,
            syncStatus: options?.syncStatus ?? get().syncStatus,
          });
        }
      },
      updateField: (key, value) => {
        ensureBrowserListeners();
        const current = get().data;
        const next = mergeFinancialSettings(current, { [key]: value } as FinancialSettingsPatch);

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
        scheduleSync({ [key]: value } as FinancialSettingsPatch);
      },
      updateFields: (patch) => {
        ensureBrowserListeners();
        const current = get().data;
        const next = mergeFinancialSettings(current, patch);

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
        scheduleSync(patch);
      },
      initializeFromOnboarding: async (patch) => {
        const next = mergeFinancialSettings(get().data, patch);

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
        scheduleSync(patch);
      },
      syncToBackend: async () => {
        await flushSync();
      },
      clearError: () => set((state) => ({ ...state, error: null })),
      reset: () =>
        set({
          data: DEFAULT_FINANCIAL_SETTINGS,
          isLoading: false,
          error: null,
          lastSyncedAt: null,
          syncStatus: 'idle',
          hasLoadedFromBackend: false,
          lastServerData: null,
        }),
    }),
    {
      name: FINANCIAL_SETTINGS_STORAGE_KEY,
      partialize: (state) => ({
        data: state.data,
        lastSyncedAt: state.lastSyncedAt,
        lastServerData: state.lastServerData,
      }),
    }
  )
);

if (typeof window !== 'undefined') {
  ensureBrowserListeners();
}
