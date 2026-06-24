import { NextResponse } from 'next/server';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return handleApiError(new UnauthorizedError());
  }
  return NextResponse.json({ user: toPublicUser(user) });
}
