import { NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { buildRateLimitHeaders, enforceRateLimit } from '@/lib/rate-limit';
import { requireTier } from '@/lib/server-auth';
import { dbRun } from '@/lib/db';

const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPPORTED_CURRENCIES = new Set(['SAR', 'USD', 'EUR', 'EGP']);
const MAX_RECEIPT_AMOUNT = 1_000_000;
const RECEIPT_SCAN_LIMITS = {
  core: 10,
  pro: 40,
} as const;
const PROMPT_INJECTION_PATTERNS = [
  /\bsystem\s*:/i,
  /\bdeveloper\s*:/i,
  /\bassistant\s*:/i,
  /\bignore\s+(all\s+)?(previous|prior)\s+instructions?/i,
  /\bdisregard\s+(all\s+)?(previous|prior)\s+instructions?/i,
  /\byou\s+are\s+now\b/i,
  /\boverride\b/i,
  /\bflag\s+user\b/i,
  /\bpremium\s+tier\b/i,
  /\bchange\s+(the\s+)?amount\b/i,
];

type ReceiptExtraction = {
  merchantName: string;
  amount: number;
  date: string;
  currency: string;
  confidence: number;
  suggestedCategory: string;
  rawText: string;
};

function startOfNextMonth() {
  const next = new Date();
  next.setUTCDate(1);
  next.setUTCHours(0, 0, 0, 0);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.getTime();
}

function getReceiptQuotaWindowMs() {
  return Math.max(60_000, startOfNextMonth() - Date.now());
}

function getReceiptQuotaKey(userId: string) {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `ocr:${userId}:${monthKey}`;
}

function hasJpegSignature(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function hasPngSignature(bytes: Uint8Array) {
  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

function hasWebpSignature(bytes: Uint8Array) {
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function assertReceiptImage(file: File, bytes: Uint8Array) {
  if (file.size > MAX_RECEIPT_FILE_SIZE) {
    throw new Error('Receipt image exceeds the 10MB upload limit.');
  }

  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Only JPEG, PNG, and WEBP receipt images are supported.');
  }

  const validSignature =
    hasJpegSignature(bytes) ||
    hasPngSignature(bytes) ||
    hasWebpSignature(bytes);

  if (!validSignature) {
    throw new Error('The uploaded file does not match a valid JPEG, PNG, or WEBP image signature.');
  }
}

async function sanitizeReceiptImage(file: File) {
  const inputBytes = new Uint8Array(await file.arrayBuffer());
  assertReceiptImage(file, inputBytes);
  const normalizedType = file.type === 'image/png'
    ? 'image/png'
    : file.type === 'image/webp'
      ? 'image/webp'
      : 'image/jpeg';
  const normalizedExtension = normalizedType === 'image/png'
    ? '.png'
    : normalizedType === 'image/webp'
      ? '.webp'
      : '.jpg';

  return {
    buffer: inputBytes,
    type: normalizedType,
    name: file.name.replace(/\.[^.]+$/, normalizedExtension),
  };
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizeEasternArabicDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function parseAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parseNumericToken = (token: string) => {
    const normalized = token.replace(/[^0-9.,-]/g, '');
    if (!normalized) {
      return 0;
    }

    const isNegative = normalized.includes('-');
    const unsigned = normalized.replace(/-/g, '');
    const lastComma = unsigned.lastIndexOf(',');
    const lastDot = unsigned.lastIndexOf('.');
    const decimalIndex = Math.max(lastComma, lastDot);

    let normalizedNumber = unsigned;
    if (decimalIndex >= 0) {
      const integerPart = unsigned.slice(0, decimalIndex).replace(/[.,]/g, '');
      const decimalPart = unsigned.slice(decimalIndex + 1).replace(/[.,]/g, '');
      normalizedNumber = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
    } else {
      normalizedNumber = unsigned.replace(/[.,]/g, '');
    }

    const parsed = Number(`${isNegative ? '-' : ''}${normalizedNumber}`);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const source = normalizeEasternArabicDigits(String(value || ''))
    .replace(/[٫٬]/g, (match) => (match === '٫' ? '.' : ','));
  const tokens = source.match(/-?\d[\d.,]*/g) ?? [];
  const rawCandidate = tokens.length > 1
    ? [...tokens].sort((left, right) => parseNumericToken(right) - parseNumericToken(left))[0]
    : (tokens[0] ?? source);
  return parseNumericToken(rawCandidate);
}

function normalizeCategory(value: unknown): string {
  const category = String(value || 'Other').toLowerCase();

  if (category.includes('food') || category.includes('restaurant') || category.includes('grocer') || category.includes('market')) return 'Food';
  if (category.includes('transport') || category.includes('taxi') || category.includes('uber') || category.includes('fuel')) return 'Transport';
  if (category.includes('health') || category.includes('pharmacy')) return 'Healthcare';
  if (category.includes('educ')) return 'Education';
  if (category.includes('shop') || category.includes('mall')) return 'Shopping';
  if (category.includes('util')) return 'Utilities';
  if (category.includes('house') || category.includes('rent') || category.includes('real estate')) return 'Housing';
  if (category.includes('entertain')) return 'Entertainment';

  return 'Other';
}

function fallbackFromFilename(fileName: string) {
  const cleaned = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return {
    merchantName: cleaned || 'Receipt Merchant',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    currency: 'SAR',
    confidence: 18,
    suggestedCategory: 'Other',
    rawText: '',
  };
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function detectPromptInjection(text: string) {
  const normalized = normalizeWhitespace(text);
  const matches = PROMPT_INJECTION_PATTERNS.filter((pattern) => pattern.test(normalized)).map((pattern) => pattern.source);
  return {
    suspicious: matches.length > 0,
    matches,
  };
}

function parseDateFromText(rawText: string): string {
  const normalized = normalizeEasternArabicDigits(rawText);
  const patterns = [
    /(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/,
    /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;

    if (pattern === patterns[0]) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return new Date().toISOString().slice(0, 10);
}

function normalizeReceiptDate(value: unknown, rawText?: string) {
  const normalizedValue = normalizeEasternArabicDigits(String(value || '')).trim();
  const directPatterns = [
    /(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/,
    /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/,
  ];

  for (const pattern of directPatterns) {
    const match = normalizedValue.match(pattern);
    if (!match) continue;

    if (pattern === directPatterns[0]) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsedDate = new Date(normalizedValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  if (rawText?.trim()) {
    return parseDateFromText(rawText);
  }

  return new Date().toISOString().slice(0, 10);
}

function parseCurrencyFromText(rawText: string) {
  const upper = rawText.toUpperCase();
  if (upper.includes('USD') || upper.includes('$')) return 'USD';
  if (upper.includes('EUR') || upper.includes('€')) return 'EUR';
  if (upper.includes('EGP') || upper.includes('ج.م')) return 'EGP';
  if (upper.includes('SAR') || upper.includes('ر.س') || upper.includes('ر س')) return 'SAR';
  return 'SAR';
}

function parseMerchantFromText(rawText: string, fallbackName: string) {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  const ignored = ['tax invoice', 'فاتورة ضريبية', 'vat invoice', 'simplified tax invoice', 'phone', 'tel'];
  const merchantLine = lines.find((line) => {
    const lower = line.toLowerCase();
    if (lower.length < 3 || lower.length > 60) return false;
    if (ignored.some((item) => lower.includes(item))) return false;
    if (/\d{3,}/.test(lower)) return false;
    return true;
  });

  return merchantLine || fallbackName;
}

function parseBestTotalFromText(rawText: string): number {
  const normalized = rawText.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const totalKeywords = [
    'total',
    'grand total',
    'amount due',
    'net total',
    'total due',
    'الإجمالي',
    'المجموع',
    'المبلغ المستحق',
    'الاجمالي',
  ];

  const numericPattern = /(-?\d[\d,.]*)/g;

  for (const line of [...lines].reverse()) {
    const lower = line.toLowerCase();
    if (!totalKeywords.some((keyword) => lower.includes(keyword))) {
      continue;
    }
    const matches = [...line.matchAll(numericPattern)].map((match) => parseAmount(match[1]));
    const best = matches.filter((value) => value > 0 && value <= MAX_RECEIPT_AMOUNT).sort((a, b) => b - a)[0];
    if (best) return best;
  }

  const allMatches = [...normalized.matchAll(numericPattern)].map((match) => parseAmount(match[1]));
  return allMatches.filter((value) => value > 0 && value <= MAX_RECEIPT_AMOUNT).sort((a, b) => b - a)[0] || 0;
}

function buildStructuredReceipt(rawText: string, fileName: string) {
  const fallback = fallbackFromFilename(fileName);
  const merchantName = parseMerchantFromText(rawText, fallback.merchantName);
  const amount = parseBestTotalFromText(rawText);
  const currency = parseCurrencyFromText(rawText);
  const date = parseDateFromText(rawText);
  const suggestedCategory = normalizeCategory(rawText);

  return {
    merchantName,
    amount,
    date,
    currency,
    confidence: rawText.trim() ? 92 : fallback.confidence,
    suggestedCategory,
    rawText,
  };
}

function validateReceiptExtraction(extraction: ReceiptExtraction, fileName: string) {
  const fallback = fallbackFromFilename(fileName);
  const merchantName = normalizeWhitespace(extraction.merchantName || fallback.merchantName).slice(0, 120);
  const rawText = String(extraction.rawText || '').slice(0, 8000);
  const currency = SUPPORTED_CURRENCIES.has(String(extraction.currency || '').toUpperCase())
    ? String(extraction.currency).toUpperCase()
    : fallback.currency;
  const amount = parseAmount(extraction.amount);
  const confidence = Math.max(0, Math.min(100, Number(extraction.confidence || fallback.confidence)));
  const suggestedCategory = normalizeCategory(extraction.suggestedCategory || rawText);

  if (!merchantName) {
    throw new Error('Receipt merchant name could not be validated.');
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_RECEIPT_AMOUNT) {
    throw new Error('Receipt amount is invalid or outside the allowed range.');
  }

  const normalizedDate = normalizeReceiptDate(extraction.date || fallback.date, rawText);
  const dateValue = new Date(`${normalizedDate}T00:00:00.000Z`);
  if (Number.isNaN(dateValue.getTime())) {
    throw new Error('Receipt date is invalid.');
  }

  const now = Date.now();
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  const threeDaysAhead = now + (3 * 24 * 60 * 60 * 1000);

  if (dateValue.getTime() < tenYearsAgo.getTime() || dateValue.getTime() > threeDaysAhead) {
    throw new Error('Receipt date falls outside the plausible validation range.');
  }

  const injectionScan = detectPromptInjection(`${merchantName}\n${rawText}`);
  if (injectionScan.suspicious) {
    console.warn('[receipt-ocr] suspicious prompt-like content detected', {
      fileName,
      matches: injectionScan.matches,
    });
    throw new Error('Receipt contains suspicious prompt-like content and must be reviewed manually.');
  }

  return {
    merchantName,
    amount,
    date: normalizedDate,
    currency,
    confidence,
    suggestedCategory,
    rawText,
  };
}

type NvidiaVisionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

async function runNvidiaReceiptOcr(file: File) {
  const nvidiaApiKey = process.env.NVIDIA_API_KEY;
  const nvidiaBase = (process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
  const nvidiaModel = process.env.NVIDIA_OCR_MODEL || 'meta/llama-3.2-90b-vision-instruct';

  if (!nvidiaApiKey) {
    throw new Error('NVIDIA OCR is not configured. Add NVIDIA_API_KEY.');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let base64 = Buffer.from(bytes).toString('base64');
  const imageUrl = `data:${file.type};base64,${base64}`;

  const prompt = `You are a receipt OCR and expense extraction engine for bilingual Arabic and English receipts.\n\nRead the entire receipt image carefully, including merchant name, grand total, VAT lines, currency markers, and visible date fields.\n\nReturn JSON only in this exact shape:\n{\n  "merchantName": "string",\n  "amount": number,\n  "date": "YYYY-MM-DD",\n  "currency": "SAR|USD|EUR|EGP",\n  "confidence": number,\n  "suggestedCategory": "Food|Transport|Utilities|Entertainment|Healthcare|Education|Shopping|Housing|Other",\n  "rawText": "full important text visible on the receipt"\n}\n\nRules:\n- prefer the grand total or total due, not line item subtotals\n- preserve Arabic text inside rawText when visible\n- if the exact date is unclear, infer the most likely receipt date from the image\n- confidence must be an integer from 0 to 100\n- return valid JSON only, with no markdown`;

  const response = await fetch(`${nvidiaBase}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${nvidiaApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: nvidiaModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 1400,
    }),
    cache: 'no-store',
  });

  const json = await response.json().catch(() => null) as NvidiaVisionResponse | null;
  if (!response.ok) {
    throw new Error(json?.error?.message || `NVIDIA OCR request failed with status ${response.status}`);
  }

  const content = json?.choices?.[0]?.message?.content || '';
  const parsed = parseJsonObject(content);
  const fallback = fallbackFromFilename(file.name);
  const nvidiaRawText = String(parsed?.rawText || content || fallback.rawText);
  const structuredFromRawText = buildStructuredReceipt(nvidiaRawText, file.name);
  const parsedAmount = parseAmount(parsed?.amount);
  const recoveredAmount = parsedAmount > 0 ? parsedAmount : structuredFromRawText.amount;
  const parsedMerchant = normalizeWhitespace(String(parsed?.merchantName || ''));
  const parsedDate = String(parsed?.date || '').trim();
  const parsedCurrency = String(parsed?.currency || '').toUpperCase().trim();

  try {
    return validateReceiptExtraction({
      merchantName: parsedMerchant || structuredFromRawText.merchantName || fallback.merchantName,
      amount: recoveredAmount,
      date: parsedDate || structuredFromRawText.date || fallback.date,
      currency: parsedCurrency || structuredFromRawText.currency || fallback.currency,
      confidence: Math.max(0, Math.min(100, Number(parsed?.confidence || fallback.confidence))),
      suggestedCategory: normalizeCategory(parsed?.suggestedCategory || nvidiaRawText),
      rawText: nvidiaRawText,
    }, file.name);
  } finally {
    bytes.fill(0);
    base64 = '';
  }
}

export async function POST(request: NextRequest) {
  let formData: FormData | null = null;
  let normalizedBytes: Uint8Array | null = null;

  try {
    const authResult = await requireTier('core');
    if (authResult.error) {
      return authResult.error;
    }

    if (!authResult.userId) {
      return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const userId = authResult.userId;
    const plan = authResult.tier === 'pro' ? 'pro' : 'core';
    const rateLimit = await enforceRateLimit(
      getReceiptQuotaKey(userId),
      RECEIPT_SCAN_LIMITS[plan],
      getReceiptQuotaWindowMs()
    );
    if (!rateLimit.allowed) {
      return Response.json(
        {
          error: `Monthly receipt scan limit reached for the ${plan} plan.`,
          code: 'MONTHLY_RECEIPT_LIMIT_REACHED',
          plan,
          limit: RECEIPT_SCAN_LIMITS[plan],
        },
        { status: 429, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'No receipt image was provided.' }, { status: 400, headers: buildRateLimitHeaders(rateLimit) });
    }

    const sanitizedImage = await sanitizeReceiptImage(file);
    // Copy the exact bytes into a standalone Uint8Array so we avoid both
    // Buffer pool over-read issues and the stricter BlobPart typing mismatch.
    const normalizedBuffer = Uint8Array.from(sanitizedImage.buffer).buffer as ArrayBuffer;
    normalizedBytes = new Uint8Array(normalizedBuffer);
    const normalizedFile = new File([normalizedBuffer], sanitizedImage.name, {
      type: sanitizedImage.type,
    });

    const nvidiaResult = await runNvidiaReceiptOcr(normalizedFile);

    // Persist image + receipt record in the background — does not block the response.
    try {
      const cfCtx = await getCloudflareContext();
      const receiptId = crypto.randomUUID();
      const fileExtension = sanitizedImage.type === 'image/png'
        ? 'png'
        : sanitizedImage.type === 'image/webp'
          ? 'webp'
          : 'jpg';
      const r2Key = `receipts/${userId}/${receiptId}.${fileExtension}`;

      const uploadToR2 = (async () => {
        const storage = (cfCtx.env as Record<string, unknown>).WEALIX_STORAGE as R2Bucket | undefined;
        if (storage) {
          await storage.put(r2Key, normalizedBytes!.buffer as ArrayBuffer, {
            httpMetadata: { contentType: sanitizedImage.type },
            customMetadata: { userId, uploadedAt: Date.now().toString() },
          });
        }
      })();

      const insertToD1 = dbRun(
        `INSERT INTO receipts (id, user_id, merchant, amount, currency, date, category, r2_image_key, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptId,
          userId,
          nvidiaResult.merchantName,
          nvidiaResult.amount,
          nvidiaResult.currency,
          nvidiaResult.date,
          nvidiaResult.suggestedCategory,
          r2Key,
          Date.now(),
        ]
      );

      cfCtx.ctx.waitUntil(Promise.all([uploadToR2, insertToD1]));
    } catch (persistError) {
      // Non-critical — log but don't fail the OCR response.
      console.warn('[receipt-ocr] persistence error (non-fatal):', persistError);
    }

    return Response.json(nvidiaResult, { headers: buildRateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('Receipt OCR Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process the receipt image.';
    const status = message.includes('suspicious prompt-like content') ? 422 : 500;
    return Response.json(
      { error: message },
      { status }
    );
  } finally {
    if (normalizedBytes) {
      normalizedBytes.fill(0);
    }
    if (formData) {
      formData.delete('file');
    }
  }
}
