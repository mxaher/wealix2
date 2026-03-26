import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

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

async function runDatalabOcr(file: File) {
  const apiKey = process.env.DATALAB_API_KEY || process.env.CHANDRA_API_KEY;
  const apiBase = process.env.DATALAB_API_BASE || 'https://www.datalab.to';

  if (!apiKey) {
    throw new Error('Datalab OCR is not configured. Add DATALAB_API_KEY.');
  }

  const formData = new FormData();
  formData.append('file.0', file, file.name);
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
  formData.append('file', file, file.name);
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

async function runVisionFallback(file: File) {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const imageUrl = `data:${file.type};base64,${base64}`;

  const zai = await ZAI.create();
  const prompt = `You are an expert receipt OCR extraction engine for retail, restaurant, grocery, pharmacy, transport, fuel, and Arabic VAT receipts.

Look at this receipt image carefully and return JSON only with:
{
  "merchantName": "string",
  "amount": number,
  "date": "YYYY-MM-DD",
  "currency": "SAR",
  "confidence": number,
  "suggestedCategory": "Food|Transport|Utilities|Entertainment|Healthcare|Education|Shopping|Housing|Other",
  "rawText": "important visible text from the receipt"
}`;

  const completion = await zai.chat.completions.createVision({
    model: 'glm-4.5v',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    thinking: { type: 'enabled' },
  });

  const content = completion.choices[0]?.message?.content || '';
  const parsed = parseJsonObject(content);
  const fallback = fallbackFromFilename(file.name);

  return {
    merchantName: String(parsed?.merchantName || fallback.merchantName),
    amount: parseAmount(parsed?.amount || fallback.amount),
    date: String(parsed?.date || fallback.date),
    currency: String(parsed?.currency || fallback.currency).toUpperCase(),
    confidence: Math.max(0, Math.min(100, Number(parsed?.confidence || fallback.confidence))),
    suggestedCategory: normalizeCategory(parsed?.suggestedCategory || parsed?.rawText),
    rawText: String(parsed?.rawText || fallback.rawText),
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'No receipt image was provided.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Only image uploads are supported.' }, { status: 400 });
    }

    const shouldUseMarkerFirst = file.type === 'application/pdf';

    try {
      const rawText = shouldUseMarkerFirst
        ? await runDatalabMarker(file)
        : await runDatalabOcr(file);
      return Response.json(buildStructuredReceipt(rawText, file.name));
    } catch (primaryError) {
      console.error(shouldUseMarkerFirst ? 'Datalab Marker Error:' : 'Datalab OCR Error:', primaryError);

      try {
        const rawText = shouldUseMarkerFirst
          ? await runDatalabOcr(file)
          : await runDatalabMarker(file);
        return Response.json(buildStructuredReceipt(rawText, file.name));
      } catch (secondaryError) {
        console.error(shouldUseMarkerFirst ? 'Datalab OCR Error:' : 'Datalab Marker Error:', secondaryError);

        try {
          const fallbackResult = await runVisionFallback(file);
          return Response.json(fallbackResult);
        } catch (visionError) {
          console.error('Vision OCR Error:', visionError);
          const message = [
            primaryError instanceof Error ? primaryError.message : 'Primary OCR failed.',
            secondaryError instanceof Error ? secondaryError.message : 'Secondary OCR failed.',
            visionError instanceof Error ? visionError.message : 'Vision fallback failed.',
          ].join(' ');

          return Response.json(
            { error: message },
            { status: 500 }
          );
        }
      }
    }
  } catch (error) {
    console.error('Receipt OCR Error:', error);
    return Response.json(
      { error: 'Failed to process the receipt image.' },
      { status: 500 }
    );
  }
}
