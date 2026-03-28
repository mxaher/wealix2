import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { buildRateLimitHeaders, enforceRateLimit } from '@/lib/rate-limit';
import { requireAuthenticatedUser } from '@/lib/server-auth';

type DatalabOcrResponse = {
  success?: boolean;
  request_id?: string;
  request_check_url?: string;
  error?: string | null;
};

type DatalabOcrResult = {
  status?: string;
  success?: boolean | null;
  error?: string | null;
  pages?: unknown[];
};

type DatalabMarkerResponse = {
  success?: boolean;
  request_id?: string;
  request_check_url?: string;
  error?: string | null;
};

type DatalabMarkerResult = {
  status?: string;
  success?: boolean | null;
  error?: string | null;
  markdown?: string | null;
  html?: string | null;
};

const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPPORTED_CURRENCIES = new Set(['SAR', 'USD', 'EUR', 'EGP']);
const MAX_RECEIPT_AMOUNT = 1_000_000;
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

  const image = sharp(inputBytes, { failOn: 'error' }).rotate();

  if (file.type === 'image/png') {
    const buffer = await image.png({ compressionLevel: 9 }).toBuffer();
    return { buffer, type: 'image/png', name: file.name.replace(/\.[^.]+$/, '.png') };
  }

  if (file.type === 'image/webp') {
    const buffer = await image.webp({ quality: 92 }).toBuffer();
    return { buffer, type: 'image/webp', name: file.name.replace(/\.[^.]+$/, '.webp') };
  }

  const buffer = await image.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  return { buffer, type: 'image/jpeg', name: file.name.replace(/\.[^.]+$/, '.jpg') };
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

function parseAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[^0-9.,-]/g, '')
    .replace(/,(?=\d{3}\b)/g, '')
    .replace(',', '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
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

function collectText(value: unknown): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectText);
  }

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const directTextKeys = ['text', 'raw_text', 'content', 'line_text', 'value'];
    const results: string[] = [];

    for (const key of directTextKeys) {
      if (typeof objectValue[key] === 'string') {
        const trimmed = String(objectValue[key]).trim();
        if (trimmed) {
          results.push(trimmed);
        }
      }
    }

    for (const nested of Object.values(objectValue)) {
      results.push(...collectText(nested));
    }

    return results;
  }

  return [];
}

function dedupeLines(lines: string[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const normalized = line.replace(/\s+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function parseDateFromText(rawText: string): string {
  const normalized = rawText.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const patterns = [
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
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
    const best = matches.filter((value) => value > 0).sort((a, b) => b - a)[0];
    if (best) return best;
  }

  const allMatches = [...normalized.matchAll(numericPattern)].map((match) => parseAmount(match[1]));
  return allMatches.filter((value) => value > 0).sort((a, b) => b - a)[0] || 0;
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

  const dateValue = new Date(String(extraction.date || fallback.date));
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
    date: dateValue.toISOString().slice(0, 10),
    currency,
    confidence,
    suggestedCategory,
    rawText,
  };
}

async function runDatalabOcr(file: File) {
  const apiKey = process.env.DATALAB_API_KEY || process.env.CHANDRA_API_KEY;
  const apiBase = process.env.DATALAB_API_BASE || 'https://www.datalab.to';

  if (!apiKey) {
    throw new Error('Datalab OCR is not configured. Add DATALAB_API_KEY.');
  }

  const formData = new FormData();
  formData.append('file.0', new Blob([file]), file.name);
  formData.append('langs', 'ar,en');
  formData.append('skip_cache', 'false');

  const submitResponse = await fetch(`${apiBase}/api/v1/ocr`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
    },
    body: formData,
  });

  const submitData = (await submitResponse.json()) as DatalabOcrResponse;
  if (!submitResponse.ok || !submitData.request_check_url) {
    throw new Error(submitData.error || 'Failed to submit receipt to Datalab OCR.');
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pollResponse = await fetch(submitData.request_check_url, {
      headers: {
        'X-API-Key': apiKey,
      },
      cache: 'no-store',
    });

    const pollData = (await pollResponse.json()) as DatalabOcrResult;
    if (!pollResponse.ok) {
      throw new Error(pollData.error || 'Failed to poll Datalab OCR.');
    }

    if (pollData.status === 'complete') {
      if (pollData.success === false) {
        throw new Error(pollData.error || 'Datalab OCR did not complete successfully.');
      }

      const rawLines = dedupeLines(collectText(pollData.pages ?? []));
      return rawLines.join('\n');
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  throw new Error('Datalab OCR timed out while processing the receipt.');
}

async function runDatalabMarker(file: File) {
  const apiKey = process.env.DATALAB_API_KEY || process.env.CHANDRA_API_KEY;
  const apiBase = process.env.DATALAB_API_BASE || 'https://www.datalab.to';

  if (!apiKey) {
    throw new Error('Datalab Marker is not configured. Add DATALAB_API_KEY.');
  }

  const formData = new FormData();
  formData.append('file', new Blob([file]), file.name);
  formData.append('output_format', 'markdown');
  formData.append('force_ocr', 'true');
  formData.append('use_llm', 'true');
  formData.append('langs', 'ar,en');

  const submitResponse = await fetch(`${apiBase}/api/v1/marker`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
    },
    body: formData,
  });

  const submitData = (await submitResponse.json()) as DatalabMarkerResponse;
  if (!submitResponse.ok || !submitData.request_check_url) {
    throw new Error(submitData.error || 'Failed to submit receipt to Datalab Marker.');
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pollResponse = await fetch(submitData.request_check_url, {
      headers: {
        'X-API-Key': apiKey,
      },
      cache: 'no-store',
    });

    const pollData = (await pollResponse.json()) as DatalabMarkerResult;
    if (!pollResponse.ok) {
      throw new Error(pollData.error || 'Failed to poll Datalab Marker.');
    }

    if (pollData.status === 'complete') {
      if (pollData.success === false) {
        throw new Error(pollData.error || 'Datalab Marker did not complete successfully.');
      }

      const rawText = [pollData.markdown, pollData.html]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join('\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\n{2,}/g, '\n')
        .trim();

      if (!rawText) {
        throw new Error('Datalab Marker returned an empty result.');
      }

      return rawText;
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  throw new Error('Datalab Marker timed out while processing the receipt.');
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

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const imageUrl = `data:${file.type};base64,${base64}`;

  const prompt = `You are a receipt OCR and expense extraction engine for bilingual Arabic and English receipts.

Read the entire receipt image carefully, including merchant name, grand total, VAT lines, currency markers, and visible date fields.

Return JSON only in this exact shape:
{
  "merchantName": "string",
  "amount": number,
  "date": "YYYY-MM-DD",
  "currency": "SAR|USD|EUR|EGP",
  "confidence": number,
  "suggestedCategory": "Food|Transport|Utilities|Entertainment|Healthcare|Education|Shopping|Housing|Other",
  "rawText": "full important text visible on the receipt"
}

Rules:
- prefer the grand total or total due, not line item subtotals
- preserve Arabic text inside rawText when visible
- if the exact date is unclear, infer the most likely receipt date from the image
- confidence must be an integer from 0 to 100
- return valid JSON only, with no markdown`;

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

  return validateReceiptExtraction({
    merchantName: String(parsed?.merchantName || fallback.merchantName),
    amount: parseAmount(parsed?.amount || fallback.amount),
    date: String(parsed?.date || fallback.date),
    currency: String(parsed?.currency || fallback.currency).toUpperCase(),
    confidence: Math.max(0, Math.min(100, Number(parsed?.confidence || fallback.confidence))),
    suggestedCategory: normalizeCategory(parsed?.suggestedCategory || parsed?.rawText),
    rawText: String(parsed?.rawText || fallback.rawText),
  }, file.name);
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser();
    if (authResult.error) {
      return authResult.error;
    }

    const rateLimit = await enforceRateLimit(`ocr:${authResult.userId}`, 30, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'No receipt image was provided.' }, { status: 400, headers: buildRateLimitHeaders(rateLimit) });
    }

    const sanitizedImage = await sanitizeReceiptImage(file);
    const normalizedFile = new File([new Uint8Array(sanitizedImage.buffer)], sanitizedImage.name, {
      type: sanitizedImage.type,
    });

    try {
      const nvidiaResult = await runNvidiaReceiptOcr(normalizedFile);
      return Response.json(nvidiaResult, { headers: buildRateLimitHeaders(rateLimit) });
    } catch (nvidiaError) {
      console.error('NVIDIA OCR Error:', nvidiaError);

      try {
        const rawText = await runDatalabOcr(normalizedFile);
        return Response.json(validateReceiptExtraction(buildStructuredReceipt(rawText, file.name), file.name), { headers: buildRateLimitHeaders(rateLimit) });
      } catch (primaryError) {
        console.error('Datalab OCR Error:', primaryError);

        try {
          const rawText = await runDatalabMarker(normalizedFile);
          return Response.json(validateReceiptExtraction(buildStructuredReceipt(rawText, file.name), file.name), { headers: buildRateLimitHeaders(rateLimit) });
        } catch (secondaryError) {
          console.error('Datalab Marker Error:', secondaryError);
          const message = [
            nvidiaError instanceof Error ? nvidiaError.message : 'NVIDIA OCR failed.',
            primaryError instanceof Error ? primaryError.message : 'Primary OCR failed.',
            secondaryError instanceof Error ? secondaryError.message : 'Secondary OCR failed.',
          ].join(' ');

          return Response.json(
            { error: message },
            { status: 500, headers: buildRateLimitHeaders(rateLimit) }
          );
        }
      }
    }
  } catch (error) {
    console.error('Receipt OCR Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process the receipt image.';
    const status = message.includes('suspicious prompt-like content') ? 422 : 500;
    return Response.json(
      { error: message },
      { status }
    );
  }
}
