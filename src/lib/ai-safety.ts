import { getD1Database } from '@/lib/d1';

const MAX_MESSAGE_LENGTH = 4000;

const INJECTION_PATTERNS = [
  /\bsystem\s*:/i,
  /\bignore\s+(all\s+)?(previous|prior)\s+instructions?/i,
  /\bdisregard\s+(all\s+)?(previous|prior)\s+instructions?/i,
  /\byou\s+are\s+now\b/i,
  /\boverride\s+the\s+system\b/i,
  /\breveal\s+the\s+system\s+prompt\b/i,
  /\bdeveloper\s*:/i,
  /\bassistant\s*:/i,
  /أنت\s+الآن/u,
  /تجاهل\s+(كل\s+)?(التعليمات|التوجيهات|الإرشادات)/u,
  /تجاوز\s+(كل\s+)?(التعليمات|التوجيهات|الإرشادات)/u,
  /اكشف\s+(عن\s+)?(التعليمات|البرومبت|الموجه|النظام)/u,
  /كش(?:ف|في)\s+(عن\s+)?(البرومبت|الموجه|النظام)/u,
  /ignore\s+.*?(التعليمات|instructions)/iu,
  /(system|prompt|instructions?)\s*[:：]\s*.*?(تجاهل|ignore)/iu,
];

function toAuditSample(input: string) {
  return input.replace(/\s+/g, ' ').trim().slice(0, 500);
}

export function sanitizeUserMessage(input: string) {
  const trimmed = input.slice(0, MAX_MESSAGE_LENGTH);
  let sanitized = trimmed;
  let detected = false;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      detected = true;
      sanitized = sanitized.replace(pattern, '[filtered]');
    }
  }

  sanitized = sanitized.replace(/<{2,}|>{2,}|```[\s\S]*?```/g, '[filtered]');

  return {
    sanitized: sanitized.trim(),
    detected,
    truncated: input.length > MAX_MESSAGE_LENGTH,
  };
}

export async function logAiAuditEvent(params: {
  userId: string;
  route: string;
  original: string;
  detected: boolean;
  truncated: boolean;
}) {
  const inputSample = toAuditSample(params.original);

  console.warn('[wealix-ai-audit]', {
    userId: params.userId,
    route: params.route,
    timestamp: new Date().toISOString(),
    detectedPromptInjection: params.detected,
    truncated: params.truncated,
    inputSample,
  });

  const db = getD1Database();
  if (!db) {
    return;
  }

  try {
    await db.prepare(`
      INSERT INTO ai_audit_log (
        clerk_user_id,
        route,
        detected_prompt_injection,
        truncated,
        input_sample
      ) VALUES (?, ?, ?, ?, ?)
    `)
      .bind(
        params.userId,
        params.route,
        params.detected ? 1 : 0,
        params.truncated ? 1 : 0,
        inputSample
      )
      .run();
  } catch (error) {
    console.error('[wealix-ai-audit] failed to persist event', error);
  }
}
