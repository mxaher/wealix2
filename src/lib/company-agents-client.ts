import { NextRequest } from 'next/server';

function getCompanyAgentsBaseUrl() {
  const value = process.env.WEALIX_COMPANY_AGENTS_URL?.trim();
  return value ? value.replace(/\/$/, '') : null;
}

export function assertCompanyAgentsConfig() {
  const baseUrl = getCompanyAgentsBaseUrl();
  const secret = process.env.AGENTS_SECRET_KEY?.trim();

  if (!baseUrl || !secret) {
    throw new Error('Company agents service is not configured.');
  }

  return { baseUrl, secret };
}

export async function callCompanyAgents<T>(
  path: string,
  init?: RequestInit & { request?: NextRequest }
): Promise<T> {
  const { baseUrl, secret } = assertCompanyAgentsConfig();
  const headers = new Headers(init?.headers);
  headers.set('x-agent-secret', secret);

  const body = init?.body;
  if (body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    body,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error || 'Company agents request failed.');
  }

  return payload as T;
}
