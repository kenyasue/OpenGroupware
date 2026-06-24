import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/AuthService';
import { UserRepository } from '@/repositories/UserRepository';
import { getDb } from '@/lib/db/sqlite';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return handleApiError(new UnauthorizedError());
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'リクエスト本文が不正です');
  }

  const authService = new AuthService(new UserRepository(getDb()));
  try {
    const updated = authService.updateProfile(currentUser.id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      avatarUrl:
        typeof body.avatarUrl === 'string' ? body.avatarUrl : undefined,
    });
    return NextResponse.json({ user: toPublicUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
