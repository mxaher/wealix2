// src/lib/chat-history.ts
import { dbFirst, dbQuery, dbRun } from '@/lib/db';

function generateId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function createChatSession(userId: string, title?: string): Promise<string> {
  const id = generateId();
  const now = Date.now();
  await dbRun(
    'INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, userId, title ?? null, now, now]
  );
  return id;
}

export async function appendChatMessage(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  model?: string,
  tokens?: number
): Promise<void> {
  const id = generateId();
  const now = Date.now();
  await dbRun(
    'INSERT INTO chat_messages (id, session_id, user_id, role, content, model_used, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, sessionId, userId, role, content, model ?? null, tokens ?? null, now]
  );
  await dbRun(
    'UPDATE chat_sessions SET updated_at = ? WHERE id = ?',
    [now, sessionId]
  );
}

export type ChatSessionSummary = {
  id: string;
  title: string | null;
  created_at: number;
  updated_at: number;
  message_count: number;
};

export async function getChatHistory(userId: string, limit = 20): Promise<ChatSessionSummary[]> {
  return dbQuery<ChatSessionSummary>(
    `SELECT s.id, s.title, s.created_at, s.updated_at,
            COUNT(m.id) as message_count
     FROM chat_sessions s
     LEFT JOIN chat_messages m ON m.session_id = s.id
     WHERE s.user_id = ?
     GROUP BY s.id
     ORDER BY s.updated_at DESC
     LIMIT ?`,
    [userId, limit]
  );
}

export type ChatMessage = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used: string | null;
  tokens_used: number | null;
  created_at: number;
};

export type ChatSessionWithMessages = ChatSessionSummary & {
  messages: ChatMessage[];
};

export async function getChatSession(sessionId: string, userId: string): Promise<ChatSessionWithMessages | null> {
  const session = await dbFirst<ChatSessionSummary>(
    'SELECT id, title, created_at, updated_at FROM chat_sessions WHERE id = ? AND user_id = ?',
    [sessionId, userId]
  );
  if (!session) return null;

  const messages = await dbQuery<ChatMessage>(
    'SELECT id, session_id, role, content, model_used, tokens_used, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
    [sessionId]
  );

  return { ...session, message_count: messages.length, messages };
}

export async function deleteChatSession(sessionId: string, userId: string): Promise<void> {
  await dbRun('DELETE FROM chat_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
}
