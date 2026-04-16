// BUG #014 FIX — CSRF token generation and validation
import { SignJWT, jwtVerify } from 'jose';

const CSRF_SECRET = new TextEncoder().encode(process.env.CSRF_SECRET!);

export async function generateCsrfToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(CSRF_SECRET);
}

export async function validateCsrfToken(token: string, userId: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, CSRF_SECRET);
    return payload.userId === userId;
  } catch {
    return false;
  }
}
