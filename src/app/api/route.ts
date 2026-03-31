import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from '@/lib/server-auth';

export async function GET() {
  try {
    const authResult = await requireAuthenticatedUser();
    if (authResult.error) {
      return authResult.error;
    }

    return NextResponse.json({ message: "Hello, world!" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected API failure',
      },
      { status: 500 }
    );
  }
}
