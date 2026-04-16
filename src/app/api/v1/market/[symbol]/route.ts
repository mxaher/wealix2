import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Next.js 16: params is now a Promise — must be awaited
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { symbol } = await params;
  if (!symbol) return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });

  const upperSymbol = symbol.toUpperCase();

  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Market data service not configured' }, { status: 503 });
    }

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${upperSymbol}&apikey=${apiKey}`;
    const response = await fetch(url, { next: { revalidate: 60 } });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 502 });
    }

    const data = await response.json() as Record<string, unknown>;
    const quote = data['Global Quote'] as Record<string, string> | undefined;

    if (!quote || Object.keys(quote).length === 0) {
      return NextResponse.json({ error: `No data found for symbol: ${upperSymbol}` }, { status: 404 });
    }

    return NextResponse.json({
      symbol: upperSymbol,
      price: quote['05. price'],
      change: quote['09. change'],
      changePercent: quote['10. change percent'],
      volume: quote['06. volume'],
      latestTradingDay: quote['07. latest trading day'],
      previousClose: quote['08. previous close'],
      open: quote['02. open'],
      high: quote['03. high'],
      low: quote['04. low'],
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
