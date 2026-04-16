import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

export const ADMIN_PANEL_HOST =
  process.env.WEALIX_ADMIN_PANEL_HOST?.trim().toLowerCase() || 'wealix-admin-panel.moh-zaher.workers.dev';
export const ADMIN_PANEL_SESSION_COOKIE = 'wealix_admin_panel_session';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function getAdminPanelPassword() {
  const password = process.env.WEALIX_ADMIN_PANEL_PASSWORD?.trim();
  if (!password) {
    throw new Error('WEALIX_ADMIN_PANEL_PASSWORD is required.');
  }

  return password;
}

function getAdminPanelSigningSecret() {
  const secret = process.env.AGENTS_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error('AGENTS_SECRET_KEY is required for admin panel sessions.');
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac('sha256', `${getAdminPanelSigningSecret()}:${getAdminPanelPassword()}`)
    .update(payload)
    .digest('base64url');
}

function encodePayload(payload: { iat: number; exp: number }) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(value: string) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { exp?: number };
}

export function isAdminPanelHost(hostname: string | null | undefined) {
  return hostname?.toLowerCase() === ADMIN_PANEL_HOST;
}

export function validateAdminPanelPassword(password: string) {
  const provided = Buffer.from(password.trim(), 'utf8');
  const expected = Buffer.from(getAdminPanelPassword(), 'utf8');

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function createAdminPanelSessionToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = encodePayload({ iat: now, exp: now + SESSION_TTL_SECONDS });
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function isValidAdminPanelSessionToken(token: string | null | undefined) {
  if (!token) {
    return false;
  }

  const [payload, providedSignature] = token.split('.');
  if (!payload || !providedSignature) {
    return false;
  }

  const expectedSignature = signPayload(payload);
  const left = Buffer.from(providedSignature, 'utf8');
  const right = Buffer.from(expectedSignature, 'utf8');
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return false;
  }

  try {
    const parsed = decodePayload(payload);
    return typeof parsed.exp === 'number' && parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function buildAdminPanelCookie(token: string) {
  return {
    name: ADMIN_PANEL_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: true,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function getAdminPanelRateLimitKey(request: Pick<NextRequest, 'headers'>) {
  const forwardedFor = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')
    ?? 'unknown';
  const primaryIp = forwardedFor.split(',')[0]?.trim() || 'unknown';
  return `admin-panel-login:${primaryIp}`;
}

export function clearAdminPanelCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_PANEL_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 0,
  });
}

export async function requireAdminPanelPageAccess() {
  const headerStore = await headers();
  if (!isAdminPanelHost(headerStore.get('host'))) {
    notFound();
  }

  const cookieStore = await cookies();
  if (!isValidAdminPanelSessionToken(cookieStore.get(ADMIN_PANEL_SESSION_COOKIE)?.value)) {
    redirect('/admin/login');
  }
}

export async function requireAdminPanelLoginPageAccess() {
  const headerStore = await headers();
  if (!isAdminPanelHost(headerStore.get('host'))) {
    notFound();
  }

  const cookieStore = await cookies();
  if (isValidAdminPanelSessionToken(cookieStore.get(ADMIN_PANEL_SESSION_COOKIE)?.value)) {
    redirect('/admin/agents');
  }
}

export function requireAdminPanelApiAccess(request: NextRequest) {
  if (!isAdminPanelHost(request.headers.get('host'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!isValidAdminPanelSessionToken(request.cookies.get(ADMIN_PANEL_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
