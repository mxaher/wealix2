// Bug #022 fix: Redis cache layer prevents rate limit exhaustion on repeated requests.
import { NextResponse } from 'next/server';
import { buildRateLimitHeaders, enforceRateLimit } from '@/lib/rate-limit';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import { redis } from '@/lib/redis';

const CACHE_TTL_SECONDS = 60;

const DEFAULT_BASE_URL = 'https://api.twelvedata.com';

type SupportedExchange = 'EGX' | 'NASDAQ' | 'NYSE';

type HoldingInput = {
  ticker: string;
  exchange: SupportedExchange;
};

type TwelveDataQuote = {
  symbol?: string;
  name?: string;
  exchange?: string;
  currency?: string;
  close?: string;
  price?: string;
  change?: string;
  percent_change?: string;
  datetime?: string;
  code?: number;
  message?: string;
};

type TwelveDataFx = {
  symbol?: string;
  rate?: string;
  datetime?: string;
  code?: number;
  message?: string;
};

function normalizeHoldingSymbol(ticker: string, exchange: SupportedExchange) {
  const trimmed = ticker.trim().toUpperCase();

  if (exchange === 'EGX') {
    return trimmed;
  }

  return trimmed;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { cache: 'no-store' });
  const json = (await response.json()) as T;
  return json;
}

async function fetchQuoteForHolding(holding: HoldingInput, apiBase: string, apiKey: string) {
  const symbol = normalizeHoldingSymbol(holding.ticker, holding.exchange);
  const endpoints =
    holding.exchange === 'EGX'
      ? [
          `${apiBase}/eod?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`,
          `${apiBase}/price?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`,
        ]
      : [
          `${apiBase}/price?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`,
          `${apiBase}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`,
        ];

  let lastMessage = 'Unknown Twelve Data error.';

  for (const url of endpoints) {
    const data = await fetchJson<TwelveDataQuote>(url);
    if (!data.message && Number(data.price ?? data.close ?? 0) > 0) {
      return {
        symbol,
        name: data.name || holding.ticker.toUpperCase(),
        exchange: holding.exchange,
        currency: data.currency || (holding.exchange === 'EGX' ? 'EGP' : 'USD'),
        price: Number(data.price ?? data.close ?? 0),
        change: Number(data.change ?? 0),
        changePercent: Number(data.percent_change ?? 0),
        datetime: data.datetime || null,
        status: holding.exchange === 'EGX' ? 'EOD' : 'REALTIME',
        error: null,
      };
    }

    lastMessage = data.message || `No valid price returned from ${url}`;
    console.warn('[market/global] quote endpoint fallback', {
      ticker: holding.ticker,
      exchange: holding.exchange,
      url,
      message: lastMessage,
    });
  }

  throw new Error(lastMessage);
}

async function fetchFxRate(symbol: string, apiBase: string, apiKey: string) {
  const url = `${apiBase}/currency_conversion?symbol=${encodeURIComponent(symbol)}&amount=1&apikey=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson<TwelveDataFx>(url);

  if (data.message || Number(data.rate ?? 0) <= 0) {
    throw new Error(data.message || `Failed to load FX rate for ${symbol}`);
  }

  return {
    symbol,
    rate: Number(data.rate ?? 0),
    datetime: data.datetime || null,
    source: 'Twelve Data',
  };
}

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if (authResult.error) {
    return authResult.error;
  }

  const rateLimit = await enforceRateLimit(`market-global:${authResult.userId}`, 120, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  const apiKey = process.env.TWELVEDATA_API_KEY;
  const apiBase = (process.env.TWELVEDATA_API_BASE || DEFAULT_BASE_URL).replace(/\/$/, '');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Service unavailable.' },
      { status: 503, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await request.json();
    const holdings = Array.isArray(body?.holdings) ? body.holdings as HoldingInput[] : [];

    const uniqueHoldings = holdings.filter((holding) =>
      holding?.ticker && ['EGX', 'NASDAQ', 'NYSE'].includes(String(holding.exchange))
    );

    const cacheKey = `market:global:v1:${uniqueHoldings.map(h => `${h.ticker}:${h.exchange}`).sort().join(',')}`;
    const cached = await redis.get<{ quotes: Record<string, unknown>; fxRates: Record<string, unknown>; warnings: string[] }>(cacheKey).catch(() => null);
    if (cached) {
      return NextResponse.json(cached, { headers: { ...buildRateLimitHeaders(rateLimit), 'X-Cache': 'HIT' } });
    }

    const quoteResults = await Promise.allSettled(
      uniqueHoldings.map(async (holding) => [holding.ticker.toUpperCase(), await fetchQuoteForHolding(holding, apiBase, apiKey)] as const)
    );

    const quoteEntries = quoteResults
      .filter((result): result is PromiseFulfilledResult<readonly [string, Awaited<ReturnType<typeof fetchQuoteForHolding>>]> => result.status === 'fulfilled')
      .map((result) => result.value);

    const quoteFailures = quoteResults
      .map((result, index) => (result.status === 'rejected'
        ? `${uniqueHoldings[index].ticker}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
        : null))
      .filter(Boolean);

    if (quoteFailures.length > 0) {
      console.error('[market/global] quote failures', { quoteFailures });
    }

    const fxPairs = [
      { key: 'USD_SAR', symbol: 'USD/SAR' },
      { key: 'EGP_SAR', symbol: 'EGP/SAR' },
    ];

    const fxResults = await Promise.allSettled(
      fxPairs.map(async (pair) => [pair.key, await fetchFxRate(pair.symbol, apiBase, apiKey)] as const)
    );

    const fxEntries = fxResults
      .filter((result): result is PromiseFulfilledResult<readonly [string, Awaited<ReturnType<typeof fetchFxRate>>]> => result.status === 'fulfilled')
      .map((result) => result.value);

    const fxFailures = fxResults
      .map((result, index) => (result.status === 'rejected'
        ? `${fxPairs[index].symbol}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
        : null))
      .filter(Boolean);

    if (fxFailures.length > 0) {
      console.error('[market/global] fx failures', { fxFailures });
    }

    if (quoteEntries.length === 0) {
      return NextResponse.json(
        {
          error: 'Price provider unavailable.',
          code: 'PROVIDER_UNAVAILABLE',
        },
        { status: 503, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    const responseData = {
      quotes: Object.fromEntries(quoteEntries),
      fxRates: Object.fromEntries(fxEntries),
      warnings: [...quoteFailures, ...fxFailures],
    };
    await redis.set(cacheKey, responseData, { ex: CACHE_TTL_SECONDS }).catch(() => null);
    return NextResponse.json(responseData, { headers: { ...buildRateLimitHeaders(rateLimit), 'X-Cache': 'MISS' } });
  } catch (error) {
    console.error('[market/global] request failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: 'Service unavailable.',
        code: 'SERVICE_UNAVAILABLE',
      },
      { status: 503, headers: buildRateLimitHeaders(rateLimit) }
    );
  }
}
