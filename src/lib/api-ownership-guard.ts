/**
 * Bug #13 fix: IDOR (Insecure Direct Object Reference) guard for API handlers.
 *
 * auth.protect() from Clerk only verifies that a valid session exists.
 * It does NOT verify that the authenticated user owns the requested resource.
 *
 * USAGE: Wrap every API handler that returns or mutates user-specific data.
 *
 * @example
 * // src/app/api/portfolio/route.ts
 * import { withOwnershipGuard } from '@/lib/api-ownership-guard';
 *
 * export async function GET(request: NextRequest) {
 *   return withOwnershipGuard(async (userId) => {
 *     const portfolio = await db.portfolio.findFirst({ where: { userId } });
 *     return NextResponse.json(portfolio);
 *   });
 * }
 */
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

type AuthenticatedHandler<T> = (userId: string) => Promise<NextResponse<T>>;

/**
 * Extracts the authenticated userId from Clerk session and passes it to the handler.
 * The handler MUST use this userId as the authoritative filter for all DB queries.
 * Never trust userId from request params, query strings, or request body.
 *
 * Returns 401 if no session exists.
 * Returns 500 if auth() throws unexpectedly.
 */
export async function withOwnershipGuard<T>(
  handler: AuthenticatedHandler<T>
): Promise<NextResponse<T | { error: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ) as NextResponse<{ error: string }>;
    }

    return await handler(userId);
  } catch (error) {
    // Do not expose internal error details to the client.
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[withOwnershipGuard] Unexpected error:', message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ) as NextResponse<{ error: string }>;
  }
}

/**
 * Validates that a resource belongs to the authenticated user.
 * Throws a 403 response if the resourceUserId does not match the session userId.
 *
 * @example
 * const portfolio = await db.portfolio.findUnique({ where: { id: portfolioId } });
 * assertResourceOwnership(userId, portfolio?.userId, 'Portfolio');
 */
export function assertResourceOwnership(
  sessionUserId: string,
  resourceUserId: string | null | undefined,
  resourceName = 'Resource'
): void {
  if (!resourceUserId || resourceUserId !== sessionUserId) {
    throw new OwnershipError(`${resourceName} not found or access denied`);
  }
}

export class OwnershipError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'OwnershipError';
  }
}

/**
 * Converts an OwnershipError to a proper NextResponse.
 * Use in catch blocks of API handlers.
 */
export function handleOwnershipError(
  error: unknown
): NextResponse<{ error: string }> | null {
  if (error instanceof OwnershipError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}
