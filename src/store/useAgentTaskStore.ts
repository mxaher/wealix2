'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentRecord = {
  agentId: string;
  name: string;
  role: string;
  status: 'online' | 'offline' | 'busy';
  currentTaskCount: number;
  capabilities: string[];
  currentTask?: AgentTask | null;
  lastRunAt?: string | null;
  lastError?: string | null;
};

export type AgentTask = {
  taskId: number;
  agentId: string;
  instruction: string;
  taskType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'queued' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  payload: Record<string, unknown>;
  scheduledAt: string | null;
  targetUserId: string | null;
  assignedAt: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt?: string | null;
  requestedBy: string | null;
  source: string;
  resultNote: string | null;
  logs: string[];
};

type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error';

type AgentTaskStoreData = {
  agents: AgentRecord[];
  tasks: AgentTask[];
  selectedTask: AgentTask | null;
  total: number;
  page: number;
  activeStatusFilter: 'all' | AgentTask['status'];
};

type AgentTaskStoreState = {
  data: AgentTaskStoreData;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
  loadOverview: (options?: { status?: string; page?: number }) => Promise<void>;
  createTask: (input: {
    agentId: string;
    taskType: string;
    priority: AgentTask['priority'];
    payload: Record<string, unknown>;
    scheduledAt?: string | null;
    targetUserId?: string | null;
  }) => Promise<void>;
  loadTaskDetail: (taskId: number) => Promise<void>;
  cancelTask: (taskId: number) => Promise<void>;
  broadcast: (agentId: string, message: string) => Promise<void>;
  setStatusFilter: (status: AgentTaskStoreData['activeStatusFilter']) => void;
  clearError: () => void;
  reset: () => void;
};

const AGENT_TASK_STORAGE_KEY = 'wealix-agent-command-center-v1';
const AGENT_TASK_BROADCAST_KEY = 'wealix-agent-command-center-broadcast';

let listenersInitialized = false;
let channel: BroadcastChannel | null = null;

function broadcastState(payload: Pick<AgentTaskStoreState, 'lastSyncedAt' | 'syncStatus'> & { data: AgentTaskStoreData }) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!channel && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('wealix-agent-command-center');
    }

    channel?.postMessage(payload);
    window.localStorage.setItem(
      AGENT_TASK_BROADCAST_KEY,
      JSON.stringify({ ...payload, emittedAt: Date.now() })
    );
  } catch {
    // ignore
  }
}

function ensureBrowserListeners() {
  if (listenersInitialized || typeof window === 'undefined') {
    return;
  }

  listenersInitialized = true;

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel('wealix-agent-command-center');
    channel.addEventListener('message', (event) => {
      const payload = event.data as { data?: AgentTaskStoreData; lastSyncedAt?: string | null; syncStatus?: SyncStatus } | undefined;
      if (!payload?.data) {
        return;
      }

      useAgentTaskStore.setState((state) => ({
        ...state,
        data: payload.data!,
        lastSyncedAt: payload.lastSyncedAt ?? state.lastSyncedAt,
        syncStatus: payload.syncStatus ?? state.syncStatus,
        error: null,
      }));
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== AGENT_TASK_BROADCAST_KEY || !event.newValue) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue) as { data?: AgentTaskStoreData; lastSyncedAt?: string | null; syncStatus?: SyncStatus };
      if (!payload?.data) {
        return;
      }

      useAgentTaskStore.setState((state) => ({
        ...state,
        data: payload.data!,
        lastSyncedAt: payload.lastSyncedAt ?? state.lastSyncedAt,
        syncStatus: payload.syncStatus ?? state.syncStatus,
        error: null,
      }));
    } catch {
      // ignore malformed payloads
    }
  });
}

const DEFAULT_DATA: AgentTaskStoreData = {
  agents: [],
  tasks: [],
  selectedTask: null,
  total: 0,
  page: 1,
  activeStatusFilter: 'all',
};

export const useAgentTaskStore = create<AgentTaskStoreState>()(
  persist(
    (set, get) => ({
      data: DEFAULT_DATA,
      isLoading: false,
      error: null,
      lastSyncedAt: null,
      syncStatus: 'idle',
      loadOverview: async (options) => {
        ensureBrowserListeners();
        const status = (options?.status ?? get().data.activeStatusFilter) as AgentTaskStoreData['activeStatusFilter'];
        const page = options?.page ?? get().data.page;

        set((state) => ({ ...state, isLoading: true, error: null }));
        try {
          const [agentsResponse, tasksResponse] = await Promise.all([
            fetch('/api/v1/admin/agents', { cache: 'no-store' }),
            fetch(`/api/v1/admin/agents/tasks?status=${status === 'all' ? '' : status}&page=${page}&limit=20`, { cache: 'no-store' }),
          ]);

          const agentsPayload = await agentsResponse.json().catch(() => null) as { agents?: AgentRecord[]; error?: string } | null;
          const tasksPayload = await tasksResponse.json().catch(() => null) as { tasks?: AgentTask[]; total?: number; page?: number; error?: string } | null;

          if (!agentsResponse.ok || !tasksResponse.ok) {
            throw new Error(agentsPayload?.error || tasksPayload?.error || 'Unable to load agent command center.');
          }

          const nextData: AgentTaskStoreData = {
            ...get().data,
            agents: agentsPayload?.agents ?? [],
            tasks: tasksPayload?.tasks ?? [],
            total: tasksPayload?.total ?? 0,
            page: tasksPayload?.page ?? page,
            activeStatusFilter: status,
          };

          set((state) => ({
            ...state,
            data: nextData,
            isLoading: false,
            error: null,
            syncStatus: 'saved',
            lastSyncedAt: new Date().toISOString(),
          }));
          broadcastState({
            data: nextData,
            lastSyncedAt: new Date().toISOString(),
            syncStatus: 'saved',
          });
        } catch (error) {
          set((state) => ({
            ...state,
            isLoading: false,
            syncStatus: 'error',
            error: error instanceof Error ? error.message : 'Unable to load agent command center.',
          }));
          throw error;
        }
      },
      createTask: async (input) => {
        ensureBrowserListeners();
        set((state) => ({ ...state, syncStatus: 'syncing', error: null }));
        try {
          const response = await fetch('/api/v1/admin/agents/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          const payload = await response.json().catch(() => null) as { error?: string } | null;
          if (!response.ok) {
            throw new Error(payload?.error || 'Unable to create task.');
          }

          await get().loadOverview();
        } catch (error) {
          set((state) => ({
            ...state,
            syncStatus: 'error',
            error: error instanceof Error ? error.message : 'Unable to create task.',
          }));
          throw error;
        }
      },
      loadTaskDetail: async (taskId) => {
        const response = await fetch(`/api/v1/admin/agents/tasks/${taskId}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null) as AgentTask | { error?: string } | null;
        if (!response.ok || !payload || 'error' in payload) {
          throw new Error((payload as { error?: string } | null)?.error || 'Unable to load task detail.');
        }

        set((state) => ({
          ...state,
          data: {
            ...state.data,
            selectedTask: payload as AgentTask,
          },
        }));
      },
      cancelTask: async (taskId) => {
        set((state) => ({ ...state, syncStatus: 'syncing', error: null }));
        try {
          const response = await fetch(`/api/v1/admin/agents/tasks/${taskId}`, { method: 'DELETE' });
          const payload = await response.json().catch(() => null) as { error?: string } | null;
          if (!response.ok) {
            throw new Error(payload?.error || 'Unable to cancel task.');
          }
          await get().loadOverview();
          if (get().data.selectedTask?.taskId === taskId) {
            await get().loadTaskDetail(taskId);
          }
        } catch (error) {
          set((state) => ({
            ...state,
            syncStatus: 'error',
            error: error instanceof Error ? error.message : 'Unable to cancel task.',
          }));
          throw error;
        }
      },
      broadcast: async (agentId, message) => {
        set((state) => ({ ...state, syncStatus: 'syncing', error: null }));
        try {
          const response = await fetch(`/api/v1/admin/agents/${agentId}/broadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
          });
          const payload = await response.json().catch(() => null) as { error?: string } | null;
          if (!response.ok) {
            throw new Error(payload?.error || 'Unable to send broadcast.');
          }
          await get().loadOverview();
        } catch (error) {
          set((state) => ({
            ...state,
            syncStatus: 'error',
            error: error instanceof Error ? error.message : 'Unable to send broadcast.',
          }));
          throw error;
        }
      },
      setStatusFilter: (status) => {
        set((state) => ({
          ...state,
          data: {
            ...state.data,
            activeStatusFilter: status,
            page: 1,
          },
        }));
      },
      clearError: () => set((state) => ({ ...state, error: null })),
      reset: () =>
        set({
          data: DEFAULT_DATA,
          isLoading: false,
          error: null,
          lastSyncedAt: null,
          syncStatus: 'idle',
        }),
    }),
    {
      name: AGENT_TASK_STORAGE_KEY,
      partialize: (state) => ({
        data: state.data,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
