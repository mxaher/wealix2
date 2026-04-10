// src/lib/db.ts — D1 helper backed by the existing d1.ts binding accessor
import { getD1Database, type D1LikeDatabase } from '@/lib/d1';

export { type D1LikeDatabase };

export function getD1(): D1LikeDatabase {
  const db = getD1Database();
  if (!db) throw new Error('D1 database binding is not available');
  return db;
}

// Typed query helper
export async function dbQuery<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = getD1();
  const result = await db.prepare(query).bind(...params).all<T>();
  return result.results;
}

export async function dbRun(query: string, params: unknown[] = []) {
  const db = getD1();
  return db.prepare(query).bind(...params).run();
}

export async function dbFirst<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
): Promise<T | null> {
  const db = getD1();
  return db.prepare(query).bind(...params).first<T>();
}
