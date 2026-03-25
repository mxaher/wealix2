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
    const prompt = `Look at this receipt image and return JSON only with:
{
  "merchantName": "string",
  "amount": number,
  "date": "YYYY-MM-DD",
  "currency": "SAR",
  "confidence": number,
  "suggestedCategory": "Food|Transport|Utilities|Entertainment|Healthcare|Education|Shopping|Housing|Other",
  "rawText": "short raw OCR summary"
}

Important:
- Support Arabic and English receipts.
- Use the final total amount.
- If a field is uncertain, make a best effort.
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
      thinking: { type: 'disabled' },
    });

    const content = completion.choices[0]?.message?.content || '';
    const parsed = parseJsonObject(content);
    const fallback = fallbackFromFilename(file.name);

    const result = {
      merchantName: String(parsed?.merchantName || fallback.merchantName),
      amount: Number(parsed?.amount || fallback.amount),
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
