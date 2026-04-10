import { getD1Database, type D1LikeDatabase } from '@/lib/d1';
import { getE2EStorageDir, isE2EAuthEnabled } from '@/lib/e2e-auth';
import {
  DEFAULT_AI_MODELS,
  ensureSingleDefault,
  resolveDefaultAIModelId,
  sanitizeAIModelConfig,
  sanitizeAIModelConfigs,
  type AIModelConfig,
  type AIModelConfigInput,
  type AIModelConfigPatch,
} from '@/lib/ai-models';

type AIModelRow = {
  id: string;
  model_id: string;
  display_name: string;
  provider: string;
  is_active: number;
  is_default: number;
  tier: string | null;
  description: string | null;
  created_at: string | null;
};

type UserPreferenceRow = {
  preferred_ai_model: string | null;
  updated_at: string | null;
};

export type AIModelConfigRecord = {
  models: AIModelConfig[];
  updatedAt: string | null;
};

export type UserAIModelPreferenceRecord = {
  preferredModelId: string | null;
  updatedAt: string | null;
};

async function ensureAIModelTables(db: D1LikeDatabase) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_model_configs (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      provider TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_default INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'standard',
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_ai_model_preferences (
      clerk_user_id TEXT PRIMARY KEY,
      preferred_ai_model TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

function getE2EModelsPath() {
  return `${getE2EStorageDir()}/ai-model-configs.json`;
}

function getE2EPreferencePath(clerkUserId: string) {
  return `${getE2EStorageDir()}/ai-model-preference-${clerkUserId}.json`;
}

async function readJsonFile<T>(filePath: string, fallback: T) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const absolutePath = path.join(process.cwd(), filePath);

  try {
    const raw = await fs.readFile(absolutePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, data: T) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const absolutePath = path.join(process.cwd(), filePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, JSON.stringify(data, null, 2), 'utf8');
}

async function seedDefaultModels(db: D1LikeDatabase) {
  await ensureAIModelTables(db);
  const existing = await db.prepare('SELECT id FROM ai_model_configs LIMIT 1').first<{ id: string }>();
  if (existing?.id) {
    return;
  }

  for (const model of DEFAULT_AI_MODELS) {
    await db.prepare(`
      INSERT INTO ai_model_configs (
        id, model_id, display_name, provider, is_active, is_default, tier, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        model.id,
        model.modelId,
        model.displayName,
        model.provider,
        model.isActive ? 1 : 0,
        model.isDefault ? 1 : 0,
        model.tier,
        model.description,
        model.createdAt
      )
      .run();
  }
}

function mapModelRow(row: AIModelRow): AIModelConfig {
  return sanitizeAIModelConfig({
    id: row.id,
    modelId: row.model_id,
    displayName: row.display_name,
    provider: row.provider as AIModelConfig['provider'],
    isActive: Boolean(row.is_active),
    isDefault: Boolean(row.is_default),
    tier: row.tier === 'premium' ? 'premium' : 'standard',
    description: row.description,
    createdAt: row.created_at ?? new Date().toISOString(),
  });
}

export async function listAIModelConfigs(): Promise<AIModelConfigRecord> {
  const db = getD1Database();

  if (!db) {
    if (isE2EAuthEnabled()) {
      const stored = await readJsonFile<AIModelConfigRecord>(getE2EModelsPath(), {
        models: DEFAULT_AI_MODELS,
        updatedAt: new Date().toISOString(),
      });
      return {
        models: ensureSingleDefault(sanitizeAIModelConfigs(stored.models)),
        updatedAt: stored.updatedAt ?? new Date().toISOString(),
      };
    }

    return {
      models: DEFAULT_AI_MODELS,
      updatedAt: new Date().toISOString(),
    };
  }

  await seedDefaultModels(db);
  const result = await db.prepare(`
    SELECT id, model_id, display_name, provider, is_active, is_default, tier, description, created_at
    FROM ai_model_configs
    ORDER BY is_default DESC, created_at DESC
  `).all<AIModelRow>();

  return {
    models: ensureSingleDefault((result.results ?? []).map(mapModelRow)),
    updatedAt: new Date().toISOString(),
  };
}

export async function createAIModelConfig(input: AIModelConfigInput): Promise<AIModelConfigRecord> {
  const nextModel = sanitizeAIModelConfig({
    id: crypto.randomUUID(),
    modelId: input.modelId,
    displayName: input.displayName,
    provider: input.provider,
    isActive: input.isActive !== false,
    isDefault: input.isDefault === true,
    tier: input.tier ?? 'standard',
    description: input.description ?? null,
  });
  const db = getD1Database();

  if (!db) {
    const existing = await listAIModelConfigs();
    const nextModels = ensureSingleDefault([nextModel, ...existing.models.map((model) => ({
      ...model,
      isDefault: nextModel.isDefault ? false : model.isDefault,
    }))]);
    const nextRecord = { models: nextModels, updatedAt: new Date().toISOString() };

    if (isE2EAuthEnabled()) {
      await writeJsonFile(getE2EModelsPath(), nextRecord);
    }

    return nextRecord;
  }

  await seedDefaultModels(db);
  if (nextModel.isDefault) {
    await db.prepare('UPDATE ai_model_configs SET is_default = 0').run();
  }

  await db.prepare(`
    INSERT INTO ai_model_configs (
      id, model_id, display_name, provider, is_active, is_default, tier, description, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      nextModel.id,
      nextModel.modelId,
      nextModel.displayName,
      nextModel.provider,
      nextModel.isActive ? 1 : 0,
      nextModel.isDefault ? 1 : 0,
      nextModel.tier,
      nextModel.description,
      nextModel.createdAt
    )
    .run();

  return listAIModelConfigs();
}

export async function updateAIModelConfig(id: string, patch: AIModelConfigPatch): Promise<AIModelConfigRecord> {
  const db = getD1Database();

  if (!db) {
    const existing = await listAIModelConfigs();
    const target = existing.models.find((model) => model.id === id);
    if (!target) {
      throw new Error('Model not found.');
    }

    const nextModels = ensureSingleDefault(existing.models.map((model) => {
      if (model.id !== id) {
        return patch.isDefault ? { ...model, isDefault: false } : model;
      }

      return sanitizeAIModelConfig({
        ...model,
        ...patch,
        id: model.id,
      });
    }));
    const nextRecord = { models: nextModels, updatedAt: new Date().toISOString() };

    if (isE2EAuthEnabled()) {
      await writeJsonFile(getE2EModelsPath(), nextRecord);
    }

    return nextRecord;
  }

  await seedDefaultModels(db);
  const existing = await db.prepare(`
    SELECT id, model_id, display_name, provider, is_active, is_default, tier, description, created_at
    FROM ai_model_configs
    WHERE id = ?
    LIMIT 1
  `).bind(id).first<AIModelRow>();

  if (!existing) {
    throw new Error('Model not found.');
  }

  const next = sanitizeAIModelConfig({
    ...mapModelRow(existing),
    ...patch,
    id,
  });

  if (next.isDefault) {
    await db.prepare('UPDATE ai_model_configs SET is_default = 0').run();
  }

  await db.prepare(`
    UPDATE ai_model_configs
    SET model_id = ?, display_name = ?, provider = ?, is_active = ?, is_default = ?, tier = ?, description = ?
    WHERE id = ?
  `)
    .bind(
      next.modelId,
      next.displayName,
      next.provider,
      next.isActive ? 1 : 0,
      next.isDefault ? 1 : 0,
      next.tier,
      next.description,
      id
    )
    .run();

  return listAIModelConfigs();
}

export async function getUserAIModelPreference(clerkUserId: string): Promise<UserAIModelPreferenceRecord> {
  const db = getD1Database();

  if (!db) {
    if (isE2EAuthEnabled()) {
      return readJsonFile<UserAIModelPreferenceRecord>(getE2EPreferencePath(clerkUserId), {
        preferredModelId: null,
        updatedAt: null,
      });
    }

    return { preferredModelId: null, updatedAt: null };
  }

  await ensureAIModelTables(db);
  const row = await db.prepare(`
    SELECT preferred_ai_model, updated_at
    FROM user_ai_model_preferences
    WHERE clerk_user_id = ?
    LIMIT 1
  `).bind(clerkUserId).first<UserPreferenceRow>();

  return {
    preferredModelId: row?.preferred_ai_model ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

export async function saveUserAIModelPreference(
  clerkUserId: string,
  preferredModelId: string | null
): Promise<UserAIModelPreferenceRecord> {
  const db = getD1Database();

  if (!db) {
    const record = {
      preferredModelId,
      updatedAt: new Date().toISOString(),
    };

    if (isE2EAuthEnabled()) {
      await writeJsonFile(getE2EPreferencePath(clerkUserId), record);
    }

    return record;
  }

  await ensureAIModelTables(db);
  await db.prepare(`
    INSERT INTO user_ai_model_preferences (clerk_user_id, preferred_ai_model, created_at, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(clerk_user_id) DO UPDATE SET
      preferred_ai_model = excluded.preferred_ai_model,
      updated_at = CURRENT_TIMESTAMP
  `)
    .bind(clerkUserId, preferredModelId)
    .run();

  return getUserAIModelPreference(clerkUserId);
}

export async function getResolvedAIModelSelection(clerkUserId: string) {
  const [configs, preference] = await Promise.all([
    listAIModelConfigs(),
    getUserAIModelPreference(clerkUserId),
  ]);
  const defaultModelId = resolveDefaultAIModelId(configs.models);

  return {
    models: configs.models,
    defaultModelId,
    preferredModelId: preference.preferredModelId,
    updatedAt: configs.updatedAt ?? preference.updatedAt ?? new Date().toISOString(),
  };
}
