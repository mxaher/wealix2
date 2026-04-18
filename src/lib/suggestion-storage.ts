import { getD1Database } from '@/lib/d1';

type SuggestionType = 'bank_name' | 'market' | 'savings_account_name';

type SuggestionRow = {
  id: string;
  type: SuggestionType;
  value: string;
  value_lower: string;
  locale: string;
  meta_json: string | null;
  status: string;
  submitted_by_user_id: string;
  created_at: string;
  updated_at: string;
};

type CountRow = {
  count: number;
};

type SuggestionRecord = {
  id: string;
  type: SuggestionType;
  value: string;
  valueLower: string;
  locale: string;
  meta: Record<string, unknown> | null;
  status: string;
  submittedByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type CreateSuggestionInput = {
  type: SuggestionType;
  value: string;
  valueLower: string;
  locale: string;
  meta?: Record<string, unknown> | null;
  status?: string;
  submittedByUserId: string;
};

function parseMeta(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function toSuggestionRecord(row: SuggestionRow): SuggestionRecord {
  return {
    id: row.id,
    type: row.type,
    value: row.value,
    valueLower: row.value_lower,
    locale: row.locale,
    meta: parseMeta(row.meta_json),
    status: row.status,
    submittedByUserId: row.submitted_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const inMemorySuggestions: SuggestionRecord[] = [];

export async function countSuggestionsSubmittedToday(params: {
  submittedByUserId: string;
  type: SuggestionType;
}) {
  const db = getD1Database();
  const todayIso = new Date();
  todayIso.setUTCHours(0, 0, 0, 0);
  const today = todayIso.toISOString();

  if (!db) {
    return inMemorySuggestions.filter(
      (entry) =>
        entry.submittedByUserId === params.submittedByUserId &&
        entry.type === params.type &&
        entry.createdAt >= today
    ).length;
  }

  const row = await db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM suggestion_entries
      WHERE submitted_by_user_id = ?
        AND type = ?
        AND created_at >= ?
    `)
    .bind(params.submittedByUserId, params.type, today)
    .first<CountRow>();

  return row?.count ?? 0;
}

export async function findDuplicateSuggestion(params: {
  type: SuggestionType;
  valueLower: string;
}) {
  const db = getD1Database();

  if (!db) {
    const found = inMemorySuggestions.find(
      (entry) => entry.type === params.type && entry.valueLower === params.valueLower
    );
    return found ?? null;
  }

  const row = await db
    .prepare(`
      SELECT
        id,
        type,
        value,
        value_lower,
        locale,
        meta_json,
        status,
        submitted_by_user_id,
        created_at,
        updated_at
      FROM suggestion_entries
      WHERE type = ?
        AND value_lower = ?
      LIMIT 1
    `)
    .bind(params.type, params.valueLower)
    .first<SuggestionRow>();

  return row ? toSuggestionRecord(row) : null;
}

export async function createSuggestion(input: CreateSuggestionInput) {
  const db = getD1Database();

  if (!db) {
    const record: SuggestionRecord = {
      id: crypto.randomUUID(),
      type: input.type,
      value: input.value,
      valueLower: input.valueLower,
      locale: input.locale,
      meta: input.meta ?? null,
      status: input.status ?? 'pending',
      submittedByUserId: input.submittedByUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemorySuggestions.push(record);
    return record;
  }

  const id = crypto.randomUUID();
  await db
    .prepare(`
      INSERT INTO suggestion_entries (
        id,
        type,
        value,
        value_lower,
        locale,
        meta_json,
        status,
        submitted_by_user_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
    .bind(
      id,
      input.type,
      input.value,
      input.valueLower,
      input.locale,
      input.meta ? JSON.stringify(input.meta) : null,
      input.status ?? 'pending',
      input.submittedByUserId
    )
    .run();

  const row = await db
    .prepare(`
      SELECT
        id,
        type,
        value,
        value_lower,
        locale,
        meta_json,
        status,
        submitted_by_user_id,
        created_at,
        updated_at
      FROM suggestion_entries
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first<SuggestionRow>();

  return row ? toSuggestionRecord(row) : null;
}
