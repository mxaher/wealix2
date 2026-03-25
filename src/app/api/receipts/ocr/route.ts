import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

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

  if (category.includes('food') || category.includes('restaurant') || category.includes('grocer')) return 'Food';
  if (category.includes('transport') || category.includes('taxi') || category.includes('uber')) return 'Transport';
  if (category.includes('health')) return 'Healthcare';
  if (category.includes('educ')) return 'Education';
  if (category.includes('shop')) return 'Shopping';
  if (category.includes('util')) return 'Utilities';
  if (category.includes('house') || category.includes('rent')) return 'Housing';
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

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const imageUrl = `data:${file.type};base64,${base64}`;

    const zai = await ZAI.create();
    const prompt = `Look at this receipt image carefully and return JSON only with:
{
  "merchantName": "string",
  "amount": number,
  "date": "YYYY-MM-DD",
  "currency": "SAR",
  "confidence": number,
  "suggestedCategory": "Food|Transport|Utilities|Entertainment|Healthcare|Education|Shopping|Housing|Other",
  "rawText": "important visible text from the receipt"
}

Important:
- Support Arabic and English receipts.
- Use the FINAL total amount due, not subtotal.
- Look for words like Total, GRAND TOTAL, Amount Due, المجموع, الإجمالي, الإجمالي شامل الضريبة.
- Detect merchant name from the top/header of the receipt.
- If the receipt is clear, confidence should usually be above 70.
- If a field is uncertain, make your best effort instead of leaving everything blank.
- Confidence should be from 0 to 100.`;

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

    const result = {
      merchantName: String(parsed?.merchantName || fallback.merchantName),
      amount: parseAmount(parsed?.amount || fallback.amount),
      date: String(parsed?.date || fallback.date),
      currency: String(parsed?.currency || fallback.currency).toUpperCase(),
      confidence: Math.max(0, Math.min(100, Number(parsed?.confidence || fallback.confidence))),
      suggestedCategory: normalizeCategory(parsed?.suggestedCategory),
      rawText: String(parsed?.rawText || fallback.rawText),
    };

    return Response.json(result);
  } catch (error) {
    console.error('Receipt OCR Error:', error);
    return Response.json(
      { error: 'Failed to process the receipt image.' },
      { status: 500 }
    );
  }
}
