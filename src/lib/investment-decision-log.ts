import { getD1Database } from '@/lib/d1';

type LogInvestmentDecisionParams = {
  clerkUserId: string;
  investmentName: string;
  investmentType: string;
  price: number;
  payloadJson: string;
  decisionJson: string;
};

export async function logInvestmentDecision(params: LogInvestmentDecisionParams) {
  const db = getD1Database();
  if (!db) {
    return;
  }

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
