import { NextRequest, NextResponse } from 'next/server';
import {
  buildAdminPanelCookie,
  createAdminPanelSessionToken,
  getAdminPanelRateLimitKey,
  isAdminPanelHost,
  validateAdminPanelPassword,
} from '@/lib/admin-panel-auth';
import { buildRateLimitHeaders, enforceRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  if (!isAdminPanelHost(request.headers.get('host'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const rateLimit = await enforceRateLimit(getAdminPanelRateLimitKey(request), 8, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  const formData = await request.formData();
  const password = String(formData.get('password') ?? '');

  if (!validateAdminPanelPassword(password)) {
    return NextResponse.redirect(new URL('/admin/login?error=invalid_password', request.url), {
      status: 303,
      headers: buildRateLimitHeaders(rateLimit),
    });
  }

  const response = NextResponse.redirect(new URL('/admin/agents', request.url), { status: 303 });
  response.cookies.set(buildAdminPanelCookie(createAdminPanelSessionToken()));
  Object.entries(buildRateLimitHeaders(rateLimit)).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
