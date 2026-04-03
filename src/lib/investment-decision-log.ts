import { getCloudflareContext } from '@opennextjs/cloudflare';

type D1LikeDatabase = {
  prepare: (query: string) => {
    bind: (...values: unknown[]) => {
      run: () => Promise<unknown>;
    };
    run: () => Promise<unknown>;
  };
};

type LogInvestmentDecisionParams = {
  clerkUserId: string;
  investmentName: string;
  investmentType: string;
  price: number;
  payloadJson: string;
  decisionJson: string;
};

function getD1Database(): D1LikeDatabase | null {
  try {
    const context = getCloudflareContext();
    return (context?.env as Record<string, unknown> | undefined)?.WEALIX_DB as D1LikeDatabase | null;
  } catch {
    return null;
  }
}

async function ensureDecisionsLogTable(db: D1LikeDatabase) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS decisions_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL,
      investment_name TEXT NOT NULL,
      investment_type TEXT NOT NULL,
      price REAL NOT NULL,
      payload_json TEXT NOT NULL,
      decision_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export async function logInvestmentDecision(params: LogInvestmentDecisionParams) {
  const db = getD1Database();
  if (!db) {
    return;
  }

  await ensureDecisionsLogTable(db);
  await db.prepare(`
    INSERT INTO decisions_log (
      clerk_user_id,
      investment_name,
      investment_type,
      price,
      payload_json,
      decision_json
    ) VALUES (?, ?, ?, ?, ?, ?)
  `)
    .bind(
      params.clerkUserId,
      params.investmentName,
      params.investmentType,
      params.price,
      params.payloadJson,
      params.decisionJson
    )
    .run();
}
